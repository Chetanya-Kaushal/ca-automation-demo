'use client';
import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { story } from '@/lib/store';
import { seg, ease, lerp, damp, FOLD, PHONE, paperTexture } from './shared';

// ─── phone: receives reminders, then the filed return ─────────────────────
export default function Phone() {
  const g = useRef(), bubbles = useRef([]), ret = useRef(), check = useRef();
  const body = useMemo(() => new RoundedBoxGeometry(2.3, 4.6, .26, 8, .32), []);
  const bub = useMemo(() => new RoundedBoxGeometry(1.5, .38, .02, 4, .18), []);
  const tex = useMemo(paperTexture, []);
  const retGeo = useMemo(() => new RoundedBoxGeometry(.62, .8, .03, 2, .05), []);
  useFrame((state, dt) => {
    const p = story.p;
    g.current.scale.setScalar(damp(g.current.scale.x, Math.max(ease(seg(p, .58, .68)), .0001), 8, dt));
    g.current.rotation.y = .3 + Math.sin(state.clock.elapsedTime * .5) * .04;
    bubbles.current.forEach((m, j) => {
      const on = ease(seg(p, .66 + j * .045, .7 + j * .045));
      m.scale.setScalar(damp(m.scale.x, Math.max(on, .0001), 10, dt));
    });
    // 5 · deliver: the filed return arcs from the GST folder into the phone
    const e = ease(seg(p, .82, .95));
    const [fx, fy] = FOLD[1];
    ret.current.position.set(lerp(fx, PHONE[0] + .05, e), lerp(fy, -.55, e) + Math.sin(e * Math.PI) * 2.2, lerp(.3, .45, e));
    ret.current.rotation.z = lerp(.2, 0, e); ret.current.rotation.y = lerp(-.4, .3, e);
    ret.current.scale.setScalar(Math.max(seg(p, .8, .83), .0001) * lerp(.7, .55, e));
    check.current.scale.setScalar(damp(check.current.scale.x, Math.max(ease(seg(p, .95, .99)), .0001), 10, dt));
  });
  return (
    <>
      <group ref={g} position={PHONE} scale={0.0001}>
        <mesh geometry={body}>
          <meshPhysicalMaterial transmission={1} thickness={.35} roughness={.1} ior={1.35} color="#dfe6ff" />
        </mesh>
        <mesh position={[0, 0, -.06]}><planeGeometry args={[2.0, 4.25]} /><meshBasicMaterial color="#0b141a" /></mesh>
        {[0, 1, 2].map(j => (
          <mesh key={j} ref={el => (bubbles.current[j] = el)} geometry={bub} position={[j % 2 ? -.12 : .12, 1.45 - j * .62, .0]} scale={0.0001}>
            <meshBasicMaterial color={j % 2 ? '#1f2c34' : '#005c4b'} toneMapped={false} />
          </mesh>
        ))}
        <mesh ref={check} position={[.55, -1.6, .02]} scale={0.0001}>
          <circleGeometry args={[.22, 32]} /><meshBasicMaterial color="#4ade80" toneMapped={false} />
        </mesh>
      </group>
      <mesh ref={ret} geometry={retGeo} scale={0.0001}>
        <meshPhysicalMaterial map={tex} color="#c9ffe0" roughness={.4} clearcoat={.6} />
      </mesh>
    </>
  );
}
