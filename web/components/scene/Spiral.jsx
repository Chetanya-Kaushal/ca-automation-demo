'use client';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { story } from '@/lib/store';
import { seg, ease } from './shared';

// ─── hero: a helix of curved editorial cards turning around the core ─────
// Each card is an arc of a cylinder, so it bends with the spiral like a ribbon of prints.
// Like the recording: ~7 big cards per turn and a tall pitch, so the ribbon makes about two turns
// from the bottom of the screen to the top. Cards tilt with the slope of the helix.
const R = 2.6, PITCH = 2.35, PER_TURN = 7, STEP = Math.PI * 2 / PER_TURN, RISE = PITCH / PER_TURN, COUNT = 35, SPEED = .32;
const SLOPE = Math.atan(RISE / (STEP * R));
// per-tile card size [width along the arc, height]; widths stay under the arc spacing so neighbours never overlap
const SIZES = [[1.95, 1.4], [1.7, 1.2], [2.05, 1.45], [1.6, 1.25], [1.45, 1.3], [1.35, 1.6], [1.75, 1.25], [1.8, 1.3], [1.9, 1.25], [1.7, 1.15], [1.6, 1.2], [1.85, 1.3]];

const RED = '#e8321f', BLUE = '#4b5cf2', CREAM = '#ecebe4', INK = '#0e0e10', GREY = '#9a9ca3';
export const TILES = [
  { bg: RED, draw: (g, w, h) => { big(g, 'खाता', w * .08, h * .78, h * .5, INK); dot(g, w * .78, h * .26, h * .13, INK, CREAM); } },
  { bg: CREAM, draw: (g, w, h) => { big(g, 'GST', w * .08, h * .62, h * .36, INK); small(g, 'RETURN · Q3', w * .08, h * .86, INK); dot(g, w * .86, h * .18, h * .05, RED); } },
  { bg: INK, draw: (g, w, h) => { orb(g, w * .5, h * .55, h * .36); } },
  { bg: BLUE, draw: (g, w, h) => { big(g, '₹', w * .08, h * .6, h * .44, CREAM); big(g, '04', w * .58, h * .86, h * .24, CREAM); } },
  { bg: CREAM, draw: (g, w, h) => { big(g, '03', w * .5, h * .7, h * .5, INK); dot(g, w * .9, h * .2, h * .045, BLUE); dot(g, w * .9, h * .34, h * .045, BLUE); } },
  { bg: INK, draw: (g, w, h) => { big(g, 'Nº', w * .14, h * .48, h * .3, CREAM); big(g, '02', w * .14, h * .84, h * .3, CREAM); } },
  { bg: GREY, draw: (g, w, h) => { metal(g, w, h); } },
  { bg: RED, draw: (g, w, h) => { big(g, 'ITR', w * .08, h * .6, h * .4, CREAM); small(g, 'AY 2026–27', w * .08, h * .86, CREAM); } },
  { bg: CREAM, draw: (g, w, h) => { big(g, 'Filed.', w * .08, h * .66, h * .32, INK); tick(g, w * .82, h * .3, h * .14); } },
  { bg: BLUE, draw: (g, w, h) => { big(g, 'PAN', w * .08, h * .62, h * .36, CREAM); small(g, 'ABCPK 1234 F', w * .08, h * .86, CREAM); } },
  { bg: INK, draw: (g, w, h) => { big(g, '26AS', w * .08, h * .64, h * .32, CREAM); dot(g, w * .86, h * .22, h * .06, RED); } },
  { bg: '#f0613a', draw: (g, w, h) => { big(g, 'TDS', w * .08, h * .62, h * .36, INK); small(g, 'FORM 16 · 02', w * .08, h * .86, INK); } },
];
function big(g, s, x, y, size, c) { g.fillStyle = c; g.font = `500 ${size}px "Inter", "Helvetica Neue", Arial, sans-serif`; g.fillText(s, x, y); }
function small(g, s, x, y, c) { g.fillStyle = c; g.globalAlpha = .75; g.font = `500 ${g.canvas.height * .086 | 0}px ui-monospace, Menlo, monospace`; g.fillText(s, x, y); g.globalAlpha = 1; }
function dot(g, x, y, r, c, inner) {
  g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  if (inner) { g.fillStyle = inner; g.beginPath(); g.arc(x, y, r, Math.PI, 0); g.fill(); }
}
function tick(g, x, y, r) { g.strokeStyle = RED; g.lineWidth = r * .22; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - r, y); g.lineTo(x - r * .3, y + r * .7); g.lineTo(x + r, y - r * .7); g.stroke(); }
function orb(g, x, y, r) {
  const k = g.createRadialGradient(x - r * .3, y - r * .4, r * .05, x, y, r);
  k.addColorStop(0, '#9fc2ff'); k.addColorStop(.35, '#2c55ff'); k.addColorStop(.8, '#0a1a8c'); k.addColorStop(1, '#020414');
  g.fillStyle = k; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  g.fillStyle = 'rgba(40,80,255,.5)'; g.fillRect(x - r * 1.2, y + r * .95, r * 2.4, r * .25);
}
function metal(g, w, h) {
  const k = g.createLinearGradient(0, 0, w, h);
  k.addColorStop(0, '#2b2c30'); k.addColorStop(.45, '#d9dade'); k.addColorStop(.55, '#7d7f86'); k.addColorStop(1, '#1b1c1f');
  g.fillStyle = k; g.beginPath(); g.ellipse(w * .5, h * .62, w * .36, h * .2, 0, 0, 7); g.fill();
  g.fillStyle = '#e9eaee'; g.beginPath(); g.arc(w * .5, h * .38, h * .1, 0, 7); g.fill();
}
// One sharp texture per design, shared by the hero spiral, the story cards and the phone (keeps GPU memory flat)
const cache = new Map();
export const tileTex = k => cache.get(k) || cache.set(k, tileTexture(TILES[k], SIZES[k][0] / SIZES[k][1])).get(k);
export function tileTexture(t, aspect) {
  const h = 640, w = Math.round(h * aspect), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = t.bg; g.fillRect(0, 0, w, h); g.textBaseline = 'alphabetic'; t.draw(g, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 16; // clamped to the GPU's maximum; keeps cards crisp when seen edge-on
  return tex;
}

export default function Spiral({ still }) {
  const g = useRef(), fronts = useRef([]), backs = useRef([]);
  const { tiles, mats } = useMemo(() => {
    const tiles = TILES.map((t, k) => {
      const [w, h] = SIZES[k];
      // arc of the cylinder centred on +z, so rotation.y alone places a card on the helix
      const geo = new THREE.CylinderGeometry(R, R, h, 48, 1, true, -w / R / 2, w / R);
      const map = tileTex(k);
      // seen from inside (far side of the ribbon) the print still reads the right way round, slightly shaded:
      // a mirrored-UV copy of the shape reuses the same texture instead of uploading a second one
      const inner = geo.clone(), uv = inner.attributes.uv;
      for (let q = 0; q < uv.count; q++) uv.setX(q, 1 - uv.getX(q));
      return {
        geo, inner, n: Math.ceil((COUNT - k) / TILES.length),
        front: new THREE.MeshStandardMaterial({ map, roughness: .5, metalness: .05, transparent: true }),
        back: new THREE.MeshStandardMaterial({ map, color: '#a9abb3', roughness: .6, side: THREE.BackSide, transparent: true }),
      };
    });
    return { tiles, mats: tiles.flatMap(t => [t.front, t.back]) };
  }, []);
  const tmp = useMemo(() => { const o = new THREE.Object3D(); o.rotation.order = 'YZX'; return o; }, []);

  useFrame((state) => {
    const t = still ? 0 : state.clock.elapsedTime, p = story.p;
    const out = ease(seg(p, 0, .035)); // scroll starts: the ribbon widens and dissolves, the papers take over
    g.current.visible = out < 1;
    if (!g.current.visible) return;
    g.current.scale.set(1 + out * .6, 1 + out * .25, 1 + out * .6);
    mats.forEach(m => (m.opacity = 1 - out));
    // portrait phones: the headline fills the lower half, so the ribbon starts above it
    const lo = state.size.width / state.size.height < .8 ? COUNT * .4 : 0;
    // every card slides along the helix: it turns and rises, wrapping from the bottom back to the top off screen
    for (let i = 0; i < COUNT; i++) {
      const s = (i + t * SPEED) % COUNT;
      const edge = Math.max(0, Math.min(1, (s - lo) / 1.5, (COUNT - s) / 1.5));
      tmp.position.set(0, (s - COUNT / 2) * RISE, 0);
      tmp.rotation.set(0, s * STEP + p * 6, SLOPE);
      tmp.scale.setScalar(Math.max(ease(edge), .0001));
      tmp.updateMatrix();
      const k = i % TILES.length, j = (i / TILES.length) | 0;
      fronts.current[k].setMatrixAt(j, tmp.matrix); backs.current[k].setMatrixAt(j, tmp.matrix);
    }
    for (let k = 0; k < TILES.length; k++) { fronts.current[k].instanceMatrix.needsUpdate = true; backs.current[k].instanceMatrix.needsUpdate = true; }
  });

  return (
    <group ref={g} position={[-.5, -1.7, 1.1]}>
      {tiles.map((c, k) => (
        <group key={k}>
          <instancedMesh ref={el => (fronts.current[k] = el)} args={[c.geo, c.front, c.n]} frustumCulled={false} />
          <instancedMesh ref={el => (backs.current[k] = el)} args={[c.inner, c.back, c.n]} frustumCulled={false} />
        </group>
      ))}
    </group>
  );
}
