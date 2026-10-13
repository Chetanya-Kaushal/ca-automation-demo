'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MeshTransmissionMaterial, Environment, Lightformer } from '@react-three/drei';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { story } from '@/lib/store';

// ─── helpers ─────────────────────────────────────────────────────────────
const clamp01 = v => Math.min(1, Math.max(0, v));
const seg = (p, a, b) => clamp01((p - a) / (b - a));
const ease = t => t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
// Frame-rate independent critically damped follow (Apple's damping 1.0 default)
const damp = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.exp(-k * dt));

const SRC = [[-7.4, 2.3], [-7.9, 0], [-7.4, -2.3]];          // WhatsApp, email, upload
const FOLD = [[6.6, 2.25], [6.6, 0], [6.6, -2.25]];          // ITR, GST, Bank
const PHONE = [-6.3, 0, 0.2];
const TINTS = ['#7fb0ff', '#7ef0c8', '#ffcf7a'].map(c => new THREE.Color(c));
const N = 24;

function paperTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 328;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfbfd'; g.fillRect(0, 0, 256, 328);
  g.fillStyle = '#e3e7ef'; g.fillRect(0, 0, 256, 54);
  g.fillStyle = '#8e97aa'; g.fillRect(26, 22, 96, 11);
  g.fillStyle = '#cfd5e0';
  for (let i = 0; i < 9; i++) g.fillRect(26, 84 + i * 24, i % 3 === 2 ? 118 : 204, 8);
  g.fillStyle = '#9fb5ff'; g.fillRect(26, 300, 64, 10);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// ─── wallpaper: slow mesh-gradient the glass refracts ─────────────────────
const wallVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const wallFrag = `
uniform float t; uniform float p; varying vec2 vUv;
vec3 blob(vec2 uv, vec2 c, float r, vec3 col){ float d = length((uv - c) * vec2(1.75, 1.)); return col * smoothstep(r, 0., d); }
void main(){
  vec2 uv = vUv; float s = t * .05;
  vec3 c = vec3(.012, .015, .032);
  c += blob(uv, vec2(.40 + .05*sin(s*3.1), .56 + .04*cos(s*2.3)), .30, vec3(.09, .24, .86)) * .95;
  c += blob(uv, vec2(.60 + .06*cos(s*2.7), .47 + .05*sin(s*3.4)), .28, vec3(.40, .20, .86)) * .85;
  c += blob(uv, vec2(.50 + .07*sin(s*1.9 + p*3.), .36 + .04*cos(s*2.1)), .24, vec3(.04, .55, .50)) * .55;
  c += blob(uv, vec2(.64 + .04*sin(s*2.2), .64), .17, vec3(.95, .58, .16)) * (.12 + .3*p);
  c *= smoothstep(1., .2, length((uv - .5) * vec2(1.25, 1.7)));
  gl_FragColor = vec4(c, 1.);
}`;
function Wallpaper({ still }) {
  const uniforms = useMemo(() => ({ t: { value: 0 }, p: { value: 0 } }), []);
  useFrame((_, dt) => { if (!still) uniforms.t.value += dt; uniforms.p.value = story.p; });
  return (
    <mesh position={[0, 0, -9]} renderOrder={-1}>
      <planeGeometry args={[64, 36]} />
      <shaderMaterial vertexShader={wallVert} fragmentShader={wallFrag} uniforms={uniforms} depthWrite={false} />
    </mesh>
  );
}

// ─── the liquid glass core ────────────────────────────────────────────────
function Core({ hq, still }) {
  const ref = useRef();
  const geo = useMemo(() => new RoundedBoxGeometry(2.5, 2.5, 0.95, 10, 0.6), []);
  useFrame((state, dt) => {
    const t = still ? 0 : state.clock.elapsedTime, p = story.p, m = ref.current;
    m.rotation.y = Math.sin(t * .35) * .32 + p * .7 + story.pointer.x * .25;
    m.rotation.x = Math.sin(t * .27) * .12 - story.pointer.y * .18;
    const reading = ease(seg(p, .2, .3)) * (1 - ease(seg(p, .37, .44)));
    m.position.z = damp(m.position.z, -reading * 1.4, 6, dt);
    m.scale.setScalar(1 + .035 * Math.sin(t * 1.3) + .08 * story.pulse);
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

// ─── documents: one instanced mesh, 24 papers ─────────────────────────────
function Docs({ still }) {
  const ref = useRef();
  const tex = useMemo(paperTexture, []);
  const geo = useMemo(() => new RoundedBoxGeometry(0.62, 0.8, 0.03, 2, 0.05), []);
  const items = useMemo(() => Array.from({ length: N }, (_, i) => ({
    s: i % 3, f: (i * 7) % 3, o: i / N, k: Math.floor(i / 3) % 5,
    x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, sc: 1, tint: 0,
  })), []);
  const tmp = useMemo(() => new THREE.Object3D(), []), col = useMemo(() => new THREE.Color(), []);
  useEffect(() => { for (let i = 0; i < N; i++) ref.current.setColorAt(i, col.set('#ffffff')); }, [col]);

  useFrame((state, dt) => {
    const p = story.p, t = still ? 0 : state.clock.elapsedTime;
    let crossed = 0;
    items.forEach((it, i) => {
      // hero: slow tilted orbit around the core
      const ang = it.o * Math.PI * 2 + t * .1;
      let x = Math.cos(ang) * 3.7, y = Math.sin(ang) * 1.55, z = Math.sin(ang) * 1.3 - .4;
      let rx = 0, ry = .45 * Math.sin(ang), rz = -.14 * Math.cos(ang), sc = 1, tint = 0;

      // 1 · arrive: glide to its channel, then stream into the core
      const a = ease(clamp01(seg(p, .015, .19) * 1.55 - it.o * .55));
      if (a > 0) {
        const a1 = ease(clamp01(a * 2)), a2 = ease(clamp01(a * 2 - 1));
        const [sx, sy] = SRC[it.s];
        x = lerp(lerp(x, sx, a1), 0, a2); y = lerp(lerp(y, sy, a1), 0, a2); z = lerp(z, 0, a);
        ry = lerp(ry, 0, a); rz = lerp(rz, 0, a); sc = lerp(1, .32, a2);
        if (a2 > .97) crossed++;
      }
      // 2 · read: the first document is pulled forward and magnified
      if (i === 0) {
        const b = ease(seg(p, .21, .3)), back = ease(seg(p, .37, .44));
        const m = b * (1 - back);
        z = lerp(z, 3.2, m); sc = lerp(sc, 2.5, m); ry = lerp(ry, -.18, m); rx = lerp(rx, .06, m);
      }
      // 3 · sort: out of the core along an arc into its folder
      const c = ease(clamp01(seg(p, .43, .6) * 1.45 - it.o * .45));
      if (c > 0) {
        const [fx, fy] = FOLD[it.f];
        const tx = fx + .02 * it.k, ty = fy - .05 + .07 * it.k, tz = .05 + .045 * it.k;
        const mx = 3.1, my = fy * .45, mz = 1.4; // quadratic Bézier control point
        const u = c, iu = 1 - u;
        x = iu * iu * x + 2 * iu * u * mx + u * u * tx;
        y = iu * iu * y + 2 * iu * u * my + u * u * ty;
        z = iu * iu * z + 2 * iu * u * mz + u * u * tz;
        sc = lerp(sc, .55, u); rz = lerp(rz, .04 * (it.k - 2), u); tint = u;
      }
      const k = 9;
      it.x = damp(it.x, x, k, dt); it.y = damp(it.y, y, k, dt); it.z = damp(it.z, z, k, dt);
      it.rx = damp(it.rx, rx, k, dt); it.ry = damp(it.ry, ry, k, dt); it.rz = damp(it.rz, rz, k, dt);
      it.sc = damp(it.sc, sc, k, dt); it.tint = damp(it.tint, tint, k, dt);
      tmp.position.set(it.x, it.y, it.z); tmp.rotation.set(it.rx, it.ry, it.rz); tmp.scale.setScalar(it.sc);
      tmp.updateMatrix(); ref.current.setMatrixAt(i, tmp.matrix);
      ref.current.setColorAt(i, col.set('#ffffff').lerp(TINTS[it.f], it.tint * .55));
    });
    // causality: the core swells as documents land in it
    if (crossed > (story.crossed || 0)) story.pulse = 1;
    story.crossed = crossed;
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[geo, null, N]} frustumCulled={false}>
      <meshPhysicalMaterial map={tex} roughness={.42} clearcoat={.7} clearcoatRoughness={.25} />
    </instancedMesh>
  );
}

// ─── glass folders (ITR · GST · Bank) ─────────────────────────────────────
function Folders() {
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

// ─── reminder ring + glass pills flying to the phone ──────────────────────
function Reminders({ still }) {
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

// ─── phone: receives reminders, then the filed return ─────────────────────
function Phone() {
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

// ─── camera: one keyframe per chapter, eased and damped ───────────────────
const CAM = [[0, -1.7, 13], [-1.4, .25, 11.6], [0, 0, 8.4], [1.7, 0, 12.2], [-1.8, 0, 12.6], [-2.4, .1, 11.2]];
const LOOK = [[0, -1.7, 0], [-1.6, 0, 0], [0, 0, 1.2], [2, 0, 0], [-1.8, 0, 0], [-3, 0, 0]];
function Rig() {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const v = useMemo(() => new THREE.Vector3(), []), w = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const f = story.p * (CAM.length - 1), i = Math.min(Math.floor(f), CAM.length - 2), u = ease(f - i);
    // narrow screens: pull back so the whole stage fits
    const fit = Math.max(1, 1.7 / (size.width / size.height));
    v.fromArray(CAM[i]).lerp(w.fromArray(CAM[i + 1]), u);
    // wide screens: the hero text sits left, so the stage starts right of centre and glides back
    const shift = size.width / size.height > 1.2 ? -3.4 * (1 - Math.min(1, f)) : 0;
    v.x += story.pointer.x * .6 + shift; v.y += -story.pointer.y * .35 + story.hero * 1.2;
    v.z *= Math.min(fit, 2.1);
    camera.position.x = damp(camera.position.x, v.x, 5, dt);
    camera.position.y = damp(camera.position.y, v.y, 5, dt);
    camera.position.z = damp(camera.position.z, v.z, 5, dt);
    v.fromArray(LOOK[i]).lerp(w.fromArray(LOOK[i + 1]), u);
    v.x += shift;
    look.x = damp(look.x, v.x, 5, dt); look.y = damp(look.y, v.y, 5, dt); look.z = damp(look.z, v.z, 5, dt);
    camera.lookAt(look);
  });
  return null;
}

export default function Scene({ active }) {
  const reduce = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hq = typeof window !== 'undefined' && window.innerWidth >= 900;
  story.pulse ??= 0;
  useEffect(() => {
    const move = e => { story.pointer.x = e.clientX / innerWidth - .5; story.pointer.y = e.clientY / innerHeight - .5; };
    addEventListener('pointermove', move, { passive: true });
    return () => removeEventListener('pointermove', move);
  }, []);
  return (
    <Canvas dpr={[1, hq ? 1.75 : 1.4]} frameloop={active ? 'always' : 'never'} camera={{ fov: 35, position: [0, 0, 12.5] }}
      gl={{ antialias: true, powerPreference: 'high-performance' }} aria-hidden="true">
      <color attach="background" args={['#05060a']} />
      <ambientLight intensity={.55} />
      <directionalLight position={[4, 6, 8]} intensity={1.7} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={4} position={[0, 5, -2]} scale={[10, 2, 1]} />
        <Lightformer form="rect" intensity={2.2} color="#6f9bff" position={[-6, 0, 2]} scale={[2, 8, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="ring" intensity={2} color="#b49bff" position={[6, 1, 1]} scale={3} rotation-y={-Math.PI / 2} />
      </Environment>
      <Wallpaper still={reduce} />
      <Core hq={hq && !reduce} still={reduce} />
      <Docs still={reduce} />
      <Folders />
      <Reminders still={reduce} />
      <Phone />
      <Rig />
    </Canvas>
  );
}
