'use client';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { story } from '@/lib/store';
import { seg, ease, damp } from './shared';

// ─── the core: four glass leaves around a star-shaped gap, lit from inside ──
// Soft white, lavender and amber lights circle within the glass; the whole mark breathes bright → dark,
// keeping a faint rim when dark, with a bloom behind it.
const S = 1.08, GAP = .26, RO = .6, RI = .6, RS = .04; // leaf size, gap, outer / inner / square-corner radii

function leaf(qx, qy) { // quadrant (±1, ±1): outer corner and inner (centre) corner are rounded, the other two square
  const x0 = qx > 0 ? GAP / 2 : -GAP / 2 - S, y0 = qy > 0 ? GAP / 2 : -GAP / 2 - S;
  const r = { bl: RS, br: RS, tr: RS, tl: RS };
  const outer = (qy > 0 ? 't' : 'b') + (qx > 0 ? 'r' : 'l'), inner = (qy > 0 ? 'b' : 't') + (qx > 0 ? 'l' : 'r');
  r[outer] = RO; r[inner] = RI;
  const s = new THREE.Shape(), x1 = x0 + S, y1 = y0 + S;
  s.moveTo(x0 + r.bl, y0); s.lineTo(x1 - r.br, y0); s.absarc(x1 - r.br, y0 + r.br, r.br, -Math.PI / 2, 0);
  s.lineTo(x1, y1 - r.tr); s.absarc(x1 - r.tr, y1 - r.tr, r.tr, 0, Math.PI / 2);
  s.lineTo(x0 + r.tl, y1); s.absarc(x0 + r.tl, y1 - r.tl, r.tl, Math.PI / 2, Math.PI);
  s.lineTo(x0, y0 + r.bl); s.absarc(x0 + r.bl, y0 + r.bl, r.bl, Math.PI, Math.PI * 1.5);
  // flat glass: a thin slab whose small bevel catches the rim light
  const g = new THREE.ExtrudeGeometry(s, { depth: .04, bevelEnabled: true, bevelThickness: .03, bevelSize: .025, bevelSegments: 5, curveSegments: 48 });
  g.translate(0, 0, -.02);
  return { g, shape: s };
}

const VERT = `varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const FRAG = `uniform float t; uniform float glow; varying vec3 vP; varying vec3 vN; varying vec3 vV;
// a light shaft: a linear band across the glass with crisp-ish edges, like a beam through a window
float shaft(vec2 p, float ang, float off, float w){ float v = dot(p, vec2(cos(ang), sin(ang))) - off; return smoothstep(-w, w * .3, v) * smoothstep(w * 2.6, w * .4, v); }
void main(){
  vec2 p = vP.xy / 1.21;
  float a = t * .42;
  vec3 L = vec3(.96, .95, 1.) * shaft(p, a, -.2, .55) * 1.6
         + vec3(.62, .6, 1.) * shaft(p, a + .9, .25, .4) * 1.2
         + vec3(.36, .44, 1.) * shaft(p, a + 2.6, .1, .5) * 1.1;
  L = L * glow + vec3(1., .55, .22) * shaft(p, a + 4.2, .35, .35) * 1.4 * (.3 + .7 * glow); // the amber shaft outlasts the dark phase
  L += vec3(.85, .86, 1.) * .18 * glow; // milky fill so lit panes read as frosted glass
  vec3 c = 1. - exp(-L * 1.6); // bright areas roll off to white instead of clipping
  c += vec3(.004, .004, .008);
  float fres = pow(1. - abs(dot(vN, vV)), 2.);
  c += vec3(.62, .64, .78) * (.16 + glow * .6) * fres; // thin rim on the bevel, faintly there even when dark
  gl_FragColor = vec4(c, 1.);
}`;

const PLATE = 3.7; // world size of the glow texture plane
function glowTexture(shapes) { // bloom that hugs the leaves: their outlines drawn with a wide soft shadow
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d'), k = n / PLATE;
  g.translate(n / 2, n / 2); g.scale(k, -k);
  g.shadowColor = 'rgba(225,228,255,1)'; g.shadowBlur = 46; g.fillStyle = 'rgba(225,228,255,.9)';
  for (const sh of shapes) { const pts = sh.getPoints(24); g.beginPath(); pts.forEach((q, i) => (i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y))); g.closePath(); g.fill(); }
  g.shadowBlur = 110; g.fillStyle = 'rgba(200,205,255,.25)'; g.fillRect(-1.3, -1.3, 2.6, 2.6);
  return new THREE.CanvasTexture(c);
}
function tile() { // the dark rounded tile the mark sits on
  const s = new THREE.Shape(), h = 1.5, r = .5;
  s.moveTo(-h + r, -h); s.lineTo(h - r, -h); s.absarc(h - r, -h + r, r, -Math.PI / 2, 0); s.lineTo(h, h - r); s.absarc(h - r, h - r, r, 0, Math.PI / 2);
  s.lineTo(-h + r, h); s.absarc(-h + r, h - r, r, Math.PI / 2, Math.PI); s.lineTo(-h, -h + r); s.absarc(-h + r, -h + r, r, Math.PI, Math.PI * 1.5);
  return new THREE.ShapeGeometry(s, 24);
}

export default function Core({ still }) {
  const ref = useRef(), warm = useRef(0), bloom = useRef();
  const leaves = useMemo(() => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([x, y]) => leaf(x, y)), []);
  const plate = useMemo(tile, []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { t: { value: 0 }, glow: { value: 1 } }, toneMapped: false }), []);
  const glowMap = useMemo(() => glowTexture(leaves.map(l => l.shape)), [leaves]);
  useFrame((state, dt) => {
    const t = still ? 0 : state.clock.elapsedTime, p = story.p, m = ref.current;
    // a gentle float: the mark stays face-on like the recording, only drifting with time, scroll and pointer
    m.rotation.y = Math.sin(t * .35) * .12 + Math.sin(p * 6) * .1 + story.pointer.x * .12;
    m.rotation.x = Math.sin(t * .27) * .05 - story.pointer.y * .08;
    const reading = ease(seg(p, .2, .3)) * (1 - ease(seg(p, .37, .44)));
    m.position.z = damp(m.position.z, -reading * 1.4, 6, dt);
    // breathes bright → dark (about a 7.4s cycle, like the recording)
    const b = .5 + .5 * Math.sin(t * .85), glow = .06 + 1.05 * Math.pow(b, 1.3);
    mat.uniforms.t.value = t; mat.uniforms.glow.value = glow + .25 * story.pulse;
    // hidden behind the hero's card spiral, appears as the story starts
    const appear = ease(seg(p, .01, .04));
    m.visible = appear > .01 || warm.current++ < 3; // shown for the first frames so its shader compiles during the intro, not mid-scroll
    m.scale.setScalar((1 + .025 * Math.sin(t * 1.3) + .08 * story.pulse) * Math.max(appear, .0001));
    bloom.current.material.opacity = Math.min(1, glow * .85);
    story.pulse = damp(story.pulse, 0, 4, dt);
  });
  return (
    <group ref={ref}>
      <mesh geometry={plate} position-z={-.09}><meshBasicMaterial color="#070709" toneMapped={false} /></mesh>
      <mesh ref={bloom} position-z={-.05} scale={PLATE}>
        <planeGeometry />
        <meshBasicMaterial map={glowMap} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {leaves.map((l, i) => <mesh key={i} geometry={l.g} material={mat} />)}
    </group>
  );
}
