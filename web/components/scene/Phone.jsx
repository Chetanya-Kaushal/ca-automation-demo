'use client';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { story } from '@/lib/store';
import { seg, ease, lerp, damp, FOLD, PHONE, paperTexture } from './shared';

const W = 2.3, H = 4.7, D = .3, BACK = -D / 2;
const roundRect = (w, h, r) => {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 12);
};
// Back camera plateau layout (x, y) — two lenses stacked left, one right, flash + sensor on the right
const LENSES = [[-.72, 1.92], [-.72, 1.3], [-.14, 1.61]];

// ─── phone: burgundy handset; swings in showing its camera back, turns to its screen,
//     receives the reminders, then the filed return ────────────────────────────
export default function Phone() {
  const g = useRef(), bubbles = useRef([]), ret = useRef(), check = useRef();
  const geo = useMemo(() => ({
    body: new RoundedBoxGeometry(W, H, D, 10, .36),
    plateau: new RoundedBoxGeometry(1.32, 1.32, .07, 6, .03),
    screen: roundRect(W - .14, H - .14, .3),
    island: roundRect(.62, .17, .085),
    bub: new RoundedBoxGeometry(1.5, .38, .02, 4, .18),
    ret: new RoundedBoxGeometry(.62, .8, .03, 2, .05),
  }), []);
  const mat = useMemo(() => ({
    // anodised burgundy: metallic, satin, a touch of clearcoat for the sheen in the recording
    shell: new THREE.MeshPhysicalMaterial({ color: '#5b1f35', metalness: .7, roughness: .34, clearcoat: .6, clearcoatRoughness: .25 }),
    plateau: new THREE.MeshPhysicalMaterial({ color: '#6a2740', metalness: .7, roughness: .22, clearcoat: 1, clearcoatRoughness: .1 }),
    ring: new THREE.MeshPhysicalMaterial({ color: '#2a0e19', metalness: .9, roughness: .25 }),
    glass: new THREE.MeshPhysicalMaterial({ color: '#0c0d14', metalness: .2, roughness: .05, clearcoat: 1, clearcoatRoughness: 0 }),
    iris: new THREE.MeshBasicMaterial({ color: '#2b3550' }),
    flash: new THREE.MeshBasicMaterial({ color: '#f3efe6', toneMapped: false }),
    dark: new THREE.MeshBasicMaterial({ color: '#07070a' }),
  }), []);
  const tex = useMemo(paperTexture, []);

  useFrame((state, dt) => {
    const p = story.p, t = state.clock.elapsedTime;
    g.current.scale.setScalar(damp(g.current.scale.x, Math.max(ease(seg(p, .62, .68)), .0001), 8, dt));
    // back first (lenses to camera), then a slow turn to the screen
    const turn = ease(seg(p, .69, .79)); // waits until the camera has panned over to the phone
    g.current.rotation.y = lerp(Math.PI + .55, .3, turn) + Math.sin(t * .5) * .04;
    g.current.rotation.x = lerp(-.18, 0, turn);
    bubbles.current.forEach((m, j) => {
      const on = ease(seg(p, .77 + j * .025, .8 + j * .025));
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

  const back = BACK - .036; // surface of the camera plateau
  return (
    <>
      <group ref={g} position={PHONE} scale={0.0001}>
        <mesh geometry={geo.body} material={mat.shell} />
        {/* front: screen, pill cut-out, chat */}
        <mesh geometry={geo.screen} position={[0, 0, D / 2 + .002]}><meshBasicMaterial color="#0b141a" /></mesh>
        <mesh geometry={geo.island} material={mat.dark} position={[0, H / 2 - .32, D / 2 + .004]} />
        {[0, 1, 2].map(j => (
          <mesh key={j} ref={el => (bubbles.current[j] = el)} geometry={geo.bub} position={[j % 2 ? -.12 : .12, 1.3 - j * .62, D / 2 + .015]} scale={0.0001}>
            <meshBasicMaterial color={j % 2 ? '#1f2c34' : '#005c4b'} toneMapped={false} />
          </mesh>
        ))}
        <mesh ref={check} position={[.55, -1.7, D / 2 + .02]} scale={0.0001}>
          <circleGeometry args={[.22, 32]} /><meshBasicMaterial color="#4ade80" toneMapped={false} />
        </mesh>
        {/* back: camera plateau, three lenses, flash, sensor. Seen from behind, local +x is the viewer's left */}
        <group position={[.33, 0, 0]}>
          <mesh geometry={geo.plateau} material={mat.plateau} position={[.12, 1.61, BACK]} />
          {LENSES.map(([x, y], i) => (
            <group key={i} position={[-(x + .21), y, back]}>
              <mesh material={mat.ring} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[.25, .25, .09, 40]} /></mesh>
              <mesh material={mat.glass} position={[0, 0, -.046]} rotation={[0, Math.PI, 0]}><circleGeometry args={[.185, 40]} /></mesh>
              <mesh material={mat.iris} position={[0, 0, -.048]} rotation={[0, Math.PI, 0]}><circleGeometry args={[.075, 32]} /></mesh>
            </group>
          ))}
          <mesh material={mat.flash} position={[-.36, 2.0, back - .002]} rotation={[0, Math.PI, 0]}><circleGeometry args={[.08, 32]} /></mesh>
          <mesh material={mat.dark} position={[-.36, 1.24, back - .002]} rotation={[0, Math.PI, 0]}><circleGeometry args={[.1, 32]} /></mesh>
          <mesh material={mat.dark} position={[-.36, 1.62, back - .002]} rotation={[0, Math.PI, 0]}><circleGeometry args={[.025, 16]} /></mesh>
        </group>
      </group>
      <mesh ref={ret} geometry={geo.ret} scale={0.0001}>
        <meshPhysicalMaterial map={tex} color="#c9ffe0" roughness={.4} clearcoat={.6} />
      </mesh>
    </>
  );
}
