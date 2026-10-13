'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { story } from '@/lib/store';
import { seg, ease, damp, FOLD, TINTS } from './shared';

// ─── glass folders (ITR · GST · Bank) ─────────────────────────────────────
export default function Folders() {
  const refs = useRef([]);
  const geo = useMemo(() => new RoundedBoxGeometry(1.9, 1.4, .32, 6, .14), []);
  useFrame((state, dt) => {
    const show = ease(seg(story.p, .38, .48));
    refs.current.forEach((m, i) => {
      if (!m) return;
      const s = damp(m.scale.x, Math.max(show, .0001), 8, dt);
      m.scale.setScalar(s);
      m.rotation.y = -.28 + Math.sin(state.clock.elapsedTime * .4 + i) * .05;
    });
  });
  return FOLD.map(([x, y], i) => (
    <mesh key={i} ref={el => (refs.current[i] = el)} geometry={geo} position={[x, y, -.12]} scale={0.0001}>
      <meshPhysicalMaterial transmission={.92} thickness={1.4} roughness={.18} ior={1.35} attenuationColor={TINTS[i]} attenuationDistance={.35} color={TINTS[i]} emissive={TINTS[i]} emissiveIntensity={.12} clearcoat={1} />
    </mesh>
  ));
}
