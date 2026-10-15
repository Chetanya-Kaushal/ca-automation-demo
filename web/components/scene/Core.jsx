'use client';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { story } from '@/lib/store';
import { seg, ease, damp } from './shared';

// ─── the core: four glass leaves around a star-shaped gap, lit from inside ──
// Soft white, lavender and amber lights circle within the glass; the whole mark breathes bright → dark,
// keeping a faint rim when dark, with a bloom behind it.
const S = 1.13, GAP = .14, RO = .62, RI = .62, RS = .05; // leaf size, gap, outer / inner / square-corner radii

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
  const g = new THREE.ExtrudeGeometry(s, { depth: .22, bevelEnabled: true, bevelThickness: .035, bevelSize: .03, bevelSegments: 4, curveSegments: 40 });
  g.translate(0, 0, -.11);
  return g;
}

const VERT = `varying vec3 vP; varying vec3 vN; varying vec3 vV;
void main(){ vP = position; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const FRAG = `uniform float t; uniform float glow; varying vec3 vP; varying vec3 vN; varying vec3 vV;
vec3 lamp(vec2 p, vec2 c, vec3 col, float w){ vec2 d = p - c; return col * exp(-dot(d, d) * w); }
void main(){
  vec2 p = vP.xy / 1.2;
  float a = t * .55;
  // three lights orbiting inside the glass, plus a slow sweep of white across it
  vec3 L = lamp(p, vec2(cos(a), sin(a)) * .95, vec3(1., .97, .98), 2.2)
         + lamp(p, vec2(cos(a + 2.2), sin(a + 2.2)) * .9, vec3(.42, .48, 1.), 2.6)
         + lamp(p, vec2(cos(a + 4.1), sin(a + 4.1)) * .95, vec3(1., .6, .28), 3.)
         + vec3(.92, .9, 1.) * smoothstep(.55, 0., abs(dot(p, vec2(cos(a * .7), sin(a * .7))) - .2)) * .45;
  vec3 c = L * glow + vec3(.012, .012, .02);
  // glass edge: thin bright rim, always faintly there
  float fres = pow(1. - abs(dot(vN, vV)), 2.5);
  c += (vec3(.55, .58, .7) * (.12 + glow * .9)) * fres;
  gl_FragColor = vec4(c, 1.);
}`;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  r.addColorStop(0, 'rgba(255,255,255,.55)'); r.addColorStop(.35, 'rgba(200,205,255,.18)'); r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export default function Core({ still }) {
  const ref = useRef(), warm = useRef(0), bloom = useRef();
  const geos = useMemo(() => [[1, 1], [-1, 1], [-1, -1], [1, -1]].map(([x, y]) => leaf(x, y)), []);
  const mat = useMemo(() => new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { t: { value: 0 }, glow: { value: 1 } }, toneMapped: false }), []);
  const glowMap = useMemo(glowTexture, []);
  useFrame((state, dt) => {
    const t = still ? 0 : state.clock.elapsedTime, p = story.p, m = ref.current;
    m.rotation.y = Math.sin(t * .35) * .32 + p * .7 + story.pointer.x * .25;
    m.rotation.x = Math.sin(t * .27) * .12 - story.pointer.y * .18;
    const reading = ease(seg(p, .2, .3)) * (1 - ease(seg(p, .37, .44)));
    m.position.z = damp(m.position.z, -reading * 1.4, 6, dt);
    // breathes bright → dark (about a 7.4s cycle, like the recording)
    const b = .5 + .5 * Math.sin(t * .85), glow = .12 + .95 * Math.pow(b, 1.4);
    mat.uniforms.t.value = t; mat.uniforms.glow.value = glow + .25 * story.pulse;
    // hidden behind the hero's card spiral, appears as the story starts
    const appear = ease(seg(p, .01, .04));
    m.visible = appear > .01 || warm.current++ < 3; // shown for the first frames so its shader compiles during the intro, not mid-scroll
    m.scale.setScalar((1 + .025 * Math.sin(t * 1.3) + .08 * story.pulse) * Math.max(appear, .0001));
    bloom.current.material.opacity = glow * .75;
    story.pulse = damp(story.pulse, 0, 4, dt);
  });
  return (
    <group ref={ref}>
      <mesh ref={bloom} position-z={-.3} scale={6.2}>
        <planeGeometry />
        <meshBasicMaterial map={glowMap} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      {geos.map((g, i) => <mesh key={i} geometry={g} material={mat} />)}
    </group>
  );
}
