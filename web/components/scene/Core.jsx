'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { MeshTransmissionMaterial } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { story } from '@/lib/store';
import { seg, ease, damp } from './shared';

// ─── the liquid glass core ────────────────────────────────────────────────
export default function Core({ hq, still }) {
  const ref = useRef();
  const geo = useMemo(() => new RoundedBoxGeometry(2.5, 2.5, 0.95, 10, 0.6), []);
  useFrame((state, dt) => {
    const t = still ? 0 : state.clock.elapsedTime, p = story.p, m = ref.current;
    m.rotation.y = Math.sin(t * .35) * .32 + p * .7 + story.pointer.x * .25;
    m.rotation.x = Math.sin(t * .27) * .12 - story.pointer.y * .18;
    const reading = ease(seg(p, .2, .3)) * (1 - ease(seg(p, .37, .44)));
    m.position.z = damp(m.position.z, -reading * 1.4, 6, dt);
    // hidden behind the hero's card spiral; an invisible material also skips the costly refraction pass
    const appear = ease(seg(p, .01, .04));
    m.material.visible = appear > .01;
    m.scale.setScalar((1 + .035 * Math.sin(t * 1.3) + .08 * story.pulse) * Math.max(appear, .0001));
    story.pulse = damp(story.pulse, 0, 4, dt);
  });
  return (
    <mesh ref={ref} geometry={geo}>
      {hq ? (
        <MeshTransmissionMaterial samples={6} resolution={512} thickness={1.2} roughness={0.03} ior={1.3}
          chromaticAberration={0.09} anisotropy={0.25} distortion={0.35} distortionScale={0.45} temporalDistortion={still ? 0 : 0.12}
          backside backsideThickness={0.4} color="#f2f5ff" />
      ) : (
        <meshPhysicalMaterial transmission={1} thickness={1.1} roughness={0.06} ior={1.3} color="#f2f5ff" />
      )}
    </mesh>
  );
}
