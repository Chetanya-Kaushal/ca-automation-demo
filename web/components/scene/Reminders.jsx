'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { story } from '@/lib/store';
import { seg, ease, lerp, damp, PHONE } from './shared';

// ─── reminder ring + glass pills flying to the phone ──────────────────────
export default function Reminders({ still }) {
  const ring = useRef(), pills = useRef([]);
  const ticks = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  useFrame((state, dt) => {
    const p = story.p, t = still ? 0 : state.clock.elapsedTime;
    const on = ease(seg(p, .6, .67)) * (1 - ease(seg(p, .86, .93)));
    ring.current.scale.setScalar(damp(ring.current.scale.x, Math.max(on, .0001), 8, dt));
    ring.current.rotation.z = -t * .25 - p * 2;
    pills.current.forEach((m, j) => {
      if (!m) return;
      const u = (t * .32 + j / 3) % 1;
      m.position.set(lerp(-.6, PHONE[0] + .2, ease(u)), lerp(0, 1.1 - j * .7, ease(u)) + Math.sin(u * Math.PI) * 1.1, lerp(.6, .5, u));
      m.scale.setScalar(on * Math.sin(u * Math.PI) * 1 + .0001);
    });
  });
  return (
    <>
      <group ref={ring} scale={0.0001}>
        <mesh><torusGeometry args={[2.25, .018, 12, 160]} /><meshBasicMaterial color="#ffcf7a" toneMapped={false} /></mesh>
        {ticks.map(i => (
          <mesh key={i} position={[Math.cos(i / 12 * Math.PI * 2) * 2.25, Math.sin(i / 12 * Math.PI * 2) * 2.25, 0]} rotation={[0, 0, i / 12 * Math.PI * 2]}>
            <boxGeometry args={[i % 3 ? .1 : .22, .035, .035]} /><meshBasicMaterial color={i % 3 ? '#8a7350' : '#ffcf7a'} toneMapped={false} />
          </mesh>
        ))}
      </group>
      {[0, 1, 2].map(j => (
        <mesh key={j} ref={el => (pills.current[j] = el)} rotation={[0, 0, Math.PI / 2]} scale={0.0001}>
          <capsuleGeometry args={[.16, .62, 8, 24]} />
          <meshPhysicalMaterial transmission={1} thickness={.4} roughness={.08} ior={1.3} attenuationColor="#7ef0c8" attenuationDistance={.6} />
        </mesh>
      ))}
    </>
  );
}
