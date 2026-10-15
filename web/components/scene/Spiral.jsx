'use client';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { story } from '@/lib/store';
import { seg, ease } from './shared';

// ─── hero: a helix of curved editorial cards turning around the core ─────
// Each card is an arc of a cylinder, so it bends with the spiral like a ribbon of prints.
// ~14.5 cards per turn, cards almost touching; tall enough to run past the top and bottom of the screen
const R = 2.75, CW = 1.12, CH = .82, STEP = (CW + .07) / R, RISE = .085, COUNT = 132, SPEED = .55;

const RED = '#e8321f', BLUE = '#4b5cf2', CREAM = '#ecebe4', INK = '#0e0e10', GREY = '#9a9ca3';
const TILES = [
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
function small(g, s, x, y, c) { g.fillStyle = c; g.globalAlpha = .75; g.font = '500 33px ui-monospace, Menlo, monospace'; g.fillText(s, x, y); g.globalAlpha = 1; }
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
function tileTexture(t, aspect) {
  const h = 384, w = Math.round(h * aspect), c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.fillStyle = t.bg; g.fillRect(0, 0, w, h); g.textBaseline = 'alphabetic'; t.draw(g, w, h);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  return tex;
}

export default function Spiral({ still }) {
  const g = useRef(), fronts = useRef([]), back = useRef();
  const { geo, mats, backMat } = useMemo(() => {
    // arc of the cylinder centred on +z, so rotation.y alone places a card on the helix
    const geo = new THREE.CylinderGeometry(R, R, CH, 20, 1, true, -CW / R / 2, CW / R);
    const mats = TILES.map(t => new THREE.MeshStandardMaterial({ map: tileTexture(t, CW / CH), roughness: .55, metalness: .05, transparent: true }));
    // backs face inward: plain dark, the reverse of a print
    const backMat = new THREE.MeshStandardMaterial({ color: '#16171c', roughness: .7, side: THREE.BackSide, transparent: true });
    return { geo, mats, backMat };
  }, []);
  const tmp = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, dt) => {
    const t = still ? 0 : state.clock.elapsedTime, p = story.p;
    const out = ease(seg(p, 0, .035)); // scroll starts: the ribbon widens and dissolves, the papers take over
    g.current.visible = out < 1;
    if (!g.current.visible) return;
    g.current.scale.set(1 + out * .6, 1 + out * .25, 1 + out * .6);
    mats.forEach(m => (m.opacity = 1 - out)); backMat.opacity = 1 - out;
    // every card slides along the helix: it turns and rises, wrapping from the bottom back to the top off screen
    // portrait phones: the headline fills the lower half, so the ribbon starts above it
    const lo = state.size.width / state.size.height < .8 ? COUNT * .4 : 0;
    for (let i = 0; i < COUNT; i++) {
      const s = (i + t * SPEED) % COUNT;
      const edge = Math.max(0, Math.min(1, (s - lo) / 8, (COUNT - s) / 8)); // grow in at the bottom, shrink out at the top
      tmp.position.set(0, (s - COUNT / 2) * RISE, 0);
      tmp.rotation.set(0, s * STEP + p * 6, 0);
      tmp.scale.setScalar(Math.max(ease(edge), .0001));
      tmp.updateMatrix();
      fronts.current[i % TILES.length].setMatrixAt((i / TILES.length) | 0, tmp.matrix);
      back.current.setMatrixAt(i, tmp.matrix);
    }
    fronts.current.forEach(m => (m.instanceMatrix.needsUpdate = true));
    back.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <group ref={g} position={[0, -1.7, 0]} rotation={[0, 0, -.06]}>
      {mats.map((m, k) => (
        <instancedMesh key={k} ref={el => (fronts.current[k] = el)} args={[geo, m, Math.ceil((COUNT - k) / TILES.length)]} frustumCulled={false} />
      ))}
      <instancedMesh ref={back} args={[geo, backMat, COUNT]} frustumCulled={false} />
    </group>
  );
}
