'use client';
import { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei';
import { story } from '@/lib/store';
import Wallpaper from './Wallpaper';
import Core from './Core';
import Docs from './Docs';
import Spiral from './Spiral';
import Folders from './Folders';
import Reminders from './Reminders';
import Phone from './Phone';
import Rig from './Rig';

export default function Scene({ active }) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = innerWidth >= 900;
  // Quality steps down if the device can't hold the frame rate: sharpness first, then the refractive glass
  const [dpr, setDpr] = useState(wide ? 1.75 : 1.4);
  const [hq, setHq] = useState(wide && !reduce && (navigator.hardwareConcurrency || 4) >= 4);
  story.pulse ??= 0;

  useEffect(() => {
    const move = e => { story.pointer.x = e.clientX / innerWidth - .5; story.pointer.y = e.clientY / innerHeight - .5; };
    addEventListener('pointermove', move, { passive: true });
    return () => removeEventListener('pointermove', move);
  }, []);

  return (
    <Canvas dpr={dpr} frameloop={active ? 'always' : 'never'} camera={{ fov: 35, position: [0, 0, 12.5] }}
      gl={{ antialias: dpr < 1.5, powerPreference: 'high-performance', stencil: false }} aria-hidden="true">
      <PerformanceMonitor flipflops={3}
        onDecline={() => (dpr > 1 ? setDpr(1) : setHq(false))}
        onFallback={() => { setDpr(1); setHq(false); }} />
      <color attach="background" args={['#05060a']} />
      <ambientLight intensity={.55} />
      <directionalLight position={[4, 6, 8]} intensity={1.7} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 5, -2]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#6f9bff" position={[-6, 0, 2]} scale={[2, 8, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="ring" intensity={2} color="#b49bff" position={[6, 1, 1]} scale={3} rotation-y={-Math.PI / 2} />
      </Environment>
      <Wallpaper still={reduce} />
      <Core hq={hq} still={reduce} />
      <Spiral still={reduce} />
      <Docs still={reduce} />
      <Folders />
      <Reminders still={reduce} />
      <Phone />
      <Rig />
    </Canvas>
  );
}
