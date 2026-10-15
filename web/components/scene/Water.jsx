'use client';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { story } from '@/lib/store';
import { R } from './Spiral';

// ─── hero water: a black mirror the spiral rises out of ───────────────────
// Reflection broken into horizontal streaks by a drifting ripple map, a foam ring where the ribbon
// enters the water. Only mounted while the hero is on screen: the reflector re-renders the scene every frame.
function rippleTexture() {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'), img = g.createImageData(s, s);
  // stretched value noise: long horizontal bands like wind-ruffled water
  const rnd = Array.from({ length: 64 * 16 }, () => Math.random());
  const at = (x, y) => rnd[(((y % 16) + 16) % 16) * 64 + (((x % 64) + 64) % 64)];
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const fx = x / 4, fy = y / 16, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const sm = t => t * t * (3 - 2 * t), a = at(ix, iy), b = at(ix + 1, iy), cc = at(ix, iy + 1), d = at(ix + 1, iy + 1);
    const n = (a + (b - a) * sm(u)) * (1 - sm(v)) + (cc + (d - cc) * sm(u)) * sm(v);
    const k = (y * s + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = n * 255; img.data[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 46); // fine streaks: wide along the surface, thin toward the horizon
  return t;
}
function foamTexture() {
  const s = 512, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.translate(s / 2, s / 2);
  for (let i = 0; i < 1400; i++) { // churned specks concentrated on the ring
    const a = Math.random() * Math.PI * 2, r = s * (.39 + (Math.random() - .5) * Math.random() * .16);
    g.fillStyle = `rgba(230,240,255,${.05 + Math.random() * .25})`;
    g.beginPath(); g.ellipse(Math.cos(a) * r, Math.sin(a) * r, 1 + Math.random() * 5, .6 + Math.random() * 1.6, a + Math.PI / 2, 0, 7); g.fill();
  }
  return new THREE.CanvasTexture(c);
}

function fadeTexture() { // opaque near the spiral, dissolving into the background glow further back
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const g = c.getContext('2d'), k = g.createLinearGradient(0, 256, 0, 0); // canvas top = far edge of the water
  k.addColorStop(0, '#fff'); k.addColorStop(.53, '#fff'); k.addColorStop(.65, '#000'); k.addColorStop(1, '#000');
  g.fillStyle = k; g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
}

export const waterY = aspect => (aspect < .8 ? -3.3 : -3.95);

export default function Water({ hq, still }) {
  const [on, setOn] = useState(true);
  const { size } = useThree();
  const ripple = useMemo(rippleTexture, []), foam = useMemo(foamTexture, []), fade = useMemo(fadeTexture, []);
  const g = useRef(), ring = useRef();
  useFrame((state, dt) => {
    const hero = story.p < .05;
    if (hero !== on) setOn(hero);
    if (!g.current) return;
    if (!still) { ripple.offset.y -= dt * .09; ripple.offset.x += dt * .015; ring.current.rotation.z += dt * .12; }
    g.current.position.y = waterY(size.width / size.height) - story.p * 30; // sinks away as the story starts
    ring.current.material.opacity = .4 + .12 * Math.sin(state.clock.elapsedTime * 1.7);
  });
  if (!on) return null;
  return (
    <group ref={g}>
      <mesh rotation-x={-Math.PI / 2}>
        <planeGeometry args={[80, 60]} />
        {/* drei multiplies the reflection by the base colour, so the base is pale and the darkness comes from what it reflects.
            Strong machines: sharp blurred reflection; everything else (phones too): a cheap 256px reflection, no blur pass */}
        <MeshReflectorMaterial resolution={hq ? 1024 : 256} mirror={1} mixBlur={hq ? .25 : 0} mixStrength={1.1} mixContrast={1.35}
          blur={hq ? [60, 12] : [0, 0]} distortion={.2} distortionMap={ripple} depthScale={0} color="#3b4252" metalness={.2} roughness={1}
          transparent alphaMap={fade} />
      </mesh>
      {/* foam where the ribbon meets the water (spiral axis sits at x -.5, z 1.1) */}
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[-.5, .01, 1.1]}>
        <planeGeometry args={[R * 2.7, R * 2.7]} />
        <meshBasicMaterial map={foam} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
}
