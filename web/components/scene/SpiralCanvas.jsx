'use client';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import Spiral from './Spiral';

// Framing tuned to the reference: a steep helix (~7.8 cards a turn, each rising about half a card) whose
// diameter fills ~88% of a phone's width; on wider screens about 2 turns span the height. Tall enough to run past both edges.
const R = 2.6, PER_TURN = 7.8, RISE = .64, FOV = 35;

export default function SpiralCanvas({ spin }) {
  const layout = useMemo(() => {
    const aspect = innerWidth / innerHeight, t = Math.tan(FOV * Math.PI / 360), tH = t * aspect;
    const byWidth = R * 1.12 / (.88 * tH) + R * .35; // phones: the ribbon nearly fills the width
    const byHeight = (2 * PER_TURN * RISE) / (2 * t); // laptops: ~2 turns from the bottom edge to the top
    const d = aspect < .8 ? byWidth : Math.max(byHeight, byWidth); // camera distance to the axis
    const visH = 2 * (d + R) * t;
    const count = Math.ceil((visH + 6) / RISE);
    return { d, l: { r: R, perTurn: PER_TURN, rise: RISE, count, speed: .42, card: 1, position: [0, 0, 0], trim: false, spin } };
  }, [spin]);
  return (
    <Canvas dpr={[1, Math.min(devicePixelRatio || 1, 2)]} camera={{ fov: FOV, position: [0, 0, layout.d] }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}>
      <ambientLight intensity={1.1} />
      <directionalLight position={[3, 5, 8]} intensity={1.6} />
      <Spiral layout={layout.l} />
    </Canvas>
  );
}
