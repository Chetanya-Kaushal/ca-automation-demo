'use client';
import { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import Spiral from './Spiral';

// Framing tuned to the reference: 7 wide cards a turn (each nearly filling its slot), each rising about 40% of a card;
// on phones the ribbon reaches the screen edges, on wider screens about 1.6 turns span the height. Tall enough to run past both edges.
const R = 2.6, PER_TURN = 7, RISE = .68, FOV = 35, CARD = [1.14, 1.22];

export default function SpiralCanvas({ spin }) {
  const layout = useMemo(() => {
    const aspect = innerWidth / innerHeight, t = Math.tan(FOV * Math.PI / 360), tH = t * aspect;
    const byWidth = R * 1.08 / (.98 * tH) + R * .3; // phones: the ribbon runs to the screen edges, like the reference
    const byHeight = (1.6 * PER_TURN * RISE) / (2 * t); // laptops: ~1.6 turns from the bottom edge to the top
    const d = aspect < .8 ? byWidth : Math.max(byHeight, byWidth); // camera distance to the axis
    const visH = 2 * (d + R) * t;
    const count = Math.ceil((visH + 6) / RISE);
    return { d, l: { r: R, perTurn: PER_TURN, rise: RISE, count, speed: .42, card: CARD, position: [0, 0, 0], trim: false, spin } };
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
