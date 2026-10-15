'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { MeshReflectorMaterial } from '@react-three/drei';
import { story } from '@/lib/store';
import { R } from './Spiral';
import { sea, SEA } from './shared';

// ─── hero sea ──────────────────────────────────────────────────────────────
// A wave-equation heightfield (GPU ping-pong) drives the surface normals and the distortion of the reflection,
// so every disturbance spreads as real rings. Ambient swell rolls toward the shore and laps at the content.
// Spray is thrown wherever the spiral or the hero copy breaks the surface; droplets that fall back drop new
// ripples into the simulation. Only mounted while the hero is on screen (the reflector re-renders the scene).

const QUAD = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`;
const MAXD = 16;
// height/velocity wave step + raised-cosine drops
const STEP = `
precision highp float; varying vec2 vUv;
uniform sampler2D tex; uniform vec2 delta; uniform vec4 drops[${MAXD}]; uniform int count;
void main(){
  vec4 info = texture2D(tex, vUv);
  float avg = (texture2D(tex, vUv - vec2(delta.x, 0.)).r + texture2D(tex, vUv + vec2(delta.x, 0.)).r
             + texture2D(tex, vUv - vec2(0., delta.y)).r + texture2D(tex, vUv + vec2(0., delta.y)).r) * .25;
  info.g += (avg - info.r) * 1.2;
  info.g *= .986;
  info.r += info.g;
  info.r *= .9985;
  for (int i = 0; i < ${MAXD}; i++) {
    if (i >= count) break;
    vec4 d = drops[i];
    float k = max(0., 1. - length(vUv - d.xy) / d.z);
    info.r += (.5 - cos(k * 3.14159) * .5) * d.w;
  }
  gl_FragColor = info;
}`;
// surface normal from simulated height + wind swell travelling toward the shore (+z)
const SHADE = `
precision highp float; varying vec2 vUv;
uniform sampler2D tex; uniform vec2 delta; uniform float t; uniform vec2 origin; uniform float size;
float swell(vec2 uv){
  vec2 w = vec2(origin.x + (uv.x - .5) * size, origin.y + (.5 - uv.y) * size);
  return .020 * sin(w.y * 2.6 - t * 1.9 + sin(w.x * .35 + t * .2) * 1.4)
       + .010 * sin(w.y * 4.9 + w.x * 1.3 - t * 2.9)
       + .006 * sin(w.x * 6.1 - w.y * 2.3 + t * 2.4)
       + .004 * sin(w.y * 11. + w.x * 3.7 - t * 4.1);
}
float h(vec2 uv){ return texture2D(tex, uv).r + swell(uv); }
void main(){
  float dx = h(vUv + vec2(delta.x, 0.)) - h(vUv - vec2(delta.x, 0.));
  float dy = h(vUv + vec2(0., delta.y)) - h(vUv - vec2(0., delta.y));
  vec3 n = normalize(vec3(-dx * 9., -dy * 9., 1.));
  gl_FragColor = vec4(n * .5 + .5, 1.);
}`;

function fadeTexture(zc) { // opaque under the copy and the spiral, dissolving into the glow behind it
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const v = z => (zc + SEA / 2 - z) / SEA; // texture v at world z (canvas top = far edge)
  const g = c.getContext('2d'), k = g.createLinearGradient(0, 256, 0, 0);
  k.addColorStop(0, '#fff'); k.addColorStop(Math.min(.97, v(-1.8)), '#fff'); k.addColorStop(Math.min(.98, v(-9)), '#000'); k.addColorStop(1, '#000');
  g.fillStyle = k; g.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(c);
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

// spray: droplets (fall, ripple on landing) and mist (drifts, fades)
const MAXP = 2600;
const P_VERT = `
attribute float aSize; attribute float aAlpha; attribute float aSoft; uniform float scale; varying float vA; varying float vS;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = aSize * scale / -mv.z; vA = aAlpha; vS = aSoft; gl_Position = projectionMatrix * mv; }`;
const P_FRAG = `
varying float vA; varying float vS;
void main(){
  vec2 c = gl_PointCoord - .5; float d = length(c);
  if (d > .5) discard;
  if (vS > .5) { // whitewater / spray cloud: soft, lumpy billow
    float lump = .78 + .22 * sin(c.x * 19. + vS * 7.) * sin(c.y * 17. - vS * 5.);
    gl_FragColor = vec4(vec3(.9, .92, .95), exp(-d * d * 14.) * lump * vA); return;
  }
  float body = smoothstep(.5, .15, d), glint = smoothstep(.22, 0., length(c - vec2(-.13, -.15)));
  gl_FragColor = vec4(mix(vec3(.66, .69, .74), vec3(1.), glint), body * vA);
}`;

export default function Water({ hq, still }) {
  const [on, setOn] = useState(true);
  const { size, gl, camera } = useThree();
  const { W, cx, zc } = sea(size.width / size.height);
  const res = hq ? 512 : 256;

  const sim = useMemo(() => {
    const opts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false };
    const a = new THREE.WebGLRenderTarget(res, res, opts), b = new THREE.WebGLRenderTarget(res, res, opts);
    const shade = new THREE.WebGLRenderTarget(res, res, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, stencilBuffer: false });
    const delta = new THREE.Vector2(1 / res, 1 / res);
    const drops = Array.from({ length: MAXD }, () => new THREE.Vector4());
    const step = new THREE.ShaderMaterial({ vertexShader: QUAD, fragmentShader: STEP, uniforms: { tex: { value: null }, delta: { value: delta }, drops: { value: drops }, count: { value: 0 } } });
    const shadeMat = new THREE.ShaderMaterial({ vertexShader: QUAD, fragmentShader: SHADE, uniforms: { tex: { value: null }, delta: { value: delta }, t: { value: 0 }, origin: { value: new THREE.Vector2() }, size: { value: SEA } } });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), step), scene = new THREE.Scene(); scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const prev = gl.getRenderTarget(), col = gl.getClearColor(new THREE.Color()), alpha = gl.getClearAlpha();
    for (const rt of [a, b]) { gl.setRenderTarget(rt); gl.setClearColor(0x000000, 0); gl.clear(); } // flat, still water
    gl.setRenderTarget(prev); gl.setClearColor(col, alpha);
    return { a, b, shade, step, shadeMat, quad, scene, cam, drops, queue: [] };
  }, [gl, res]);
  useEffect(() => () => { sim.a.dispose(); sim.b.dispose(); sim.shade.dispose(); }, [sim]);

  const fade = useMemo(() => fadeTexture(zc), [zc]), foam = useMemo(foamTexture, []);
  const P = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(MAXP * 3), sz = new Float32Array(MAXP), al = new Float32Array(MAXP), so = new Float32Array(MAXP);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(al, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSoft', new THREE.BufferAttribute(so, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setDrawRange(0, 0);
    const mat = new THREE.ShaderMaterial({ vertexShader: P_VERT, fragmentShader: P_FRAG, uniforms: { scale: { value: 1 } }, transparent: true, depthWrite: false });
    return { geo, mat, pos, sz, al, so, seed: new Float32Array(MAXP), vel: new Float32Array(MAXP * 3), life: new Float32Array(MAXP), max: new Float32Array(MAXP), base: new Float32Array(MAXP), kind: new Uint8Array(MAXP), n: 0 };
  }, []);
  const tools = useMemo(() => ({ ray: new THREE.Raycaster(), plane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), v: new THREE.Vector3(), ndc: new THREE.Vector2() }), []);
  const g = useRef(), ring = useRef(), clock = useMemo(() => ({ value: 0 }), []);
  // the recording's reflection is chopped into thin horizontal bands that slide sideways, and the water is grey:
  // offset the reflection only in x, per screen band, driven by time and the simulated slope; desaturate it
  const patch = useMemo(() => mat => {
    if (!mat || mat.userData.patched) return;
    const orig = mat.onBeforeCompile.bind(mat);
    mat.onBeforeCompile = (shader, r) => {
      orig(shader, r);
      shader.uniforms.uClock = clock;
      shader.fragmentShader = 'uniform float uClock;\n' + shader.fragmentShader
        .replace(/new_vUv\.x \+= distortionFactor;\s*new_vUv\.y \+= distortionFactor;/, `
        float band = floor(gl_FragCoord.y / 3.);
        float wob = sin(band * 1.71 + uClock * 2.3) * .55 + sin(band * .37 - uClock * 1.15) * .45 + sin(band * 5.3 + uClock * 4.) * .2;
        new_vUv.x += (wob * .016 + (distortionFactor - distortion * .5) * 2.4) * new_vUv.w;`)
        .replace('newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;', `newMerge.b = (merge.b - 0.5) * mixContrast + 0.5;
        newMerge.rgb = mix(newMerge.rgb, vec3(dot(newMerge.rgb, vec3(.299, .587, .114))), .82);`);
    };
    mat.userData.patched = true; mat.needsUpdate = true;
  }, [clock]);

  useFrame((state, rawDt) => {
    const hero = story.p < .05;
    if (hero !== on) setOn(hero);
    if (!g.current) return;
    const dt = Math.min(rawDt, 1 / 30), t = state.clock.elapsedTime;
    const gy = W - story.p * 30; // sinks away as the story starts
    g.current.position.y = gy;
    const drop = (x, z, r, s) => { if (sim.queue.length < 96) sim.queue.push([(x - cx) / SEA + .5, .5 - (z - zc) / SEA], r, s); };

    // ── spray
    const emit = (x, y, z, vx, vy, vz, kind, sc = 1) => {
      const i = P.n < MAXP ? P.n++ : (Math.random() * MAXP) | 0, i3 = i * 3;
      P.pos[i3] = x; P.pos[i3 + 1] = y; P.pos[i3 + 2] = z;
      P.vel[i3] = vx; P.vel[i3 + 1] = vy; P.vel[i3 + 2] = vz;
      P.kind[i] = kind; P.seed[i] = 1 + Math.random() * 9;
      P.max[i] = P.life[i] = kind === 2 ? 1.2 + Math.random() * 1.2 : kind ? 1 + Math.random() * .9 : 1.6 + Math.random();
      P.base[i] = (kind === 2 ? .35 + Math.random() * .5 : kind ? .45 + Math.random() * .8 : .022 + Math.random() * .05) * sc;
    };
    // a burst at a point on the surface, thrown along (nx, nz); near = close to the camera (the copy), so smaller and lighter
    const splash = (x, z, nx, nz, k, n, near = 0) => {
      for (let j = 0; j < n; j++) {
        const up = (1.4 + Math.random() * 2.6) * (.6 + k * .6), out = (.2 + Math.random() * 1.1) * (.5 + k * .5);
        emit(x + (Math.random() - .5) * .12, gy + .02, z + (Math.random() - .5) * .12,
          nx * out + (Math.random() - .5) * .8, up * (near ? .6 : 1), nz * out + (Math.random() - .5) * .8, 0, near ? .6 : 1);
      }
      if (Math.random() < (.45 * k + .15) * (near ? .18 : 1)) emit(x, gy + .08, z, nx * .4, (.7 + Math.random() * .9 * k) * (near ? .5 : 1), nz * .4, 1, near ? .35 : 1);
      if (Math.random() < (near ? .35 : .8)) emit(x + (Math.random() - .5) * .3, gy + .03, z + (Math.random() - .5) * .3, nx * .25, 0, nz * .25, 2, near ? .3 : 1);
    };

    if (!still) {
      // the spiral: every card cutting the waterline throws spray along its arc and leaves a wake
      const wet = story.wet || [], boost = 1 + (story.rising || 0) * 7;
      for (let q = 0; q < wet.length; q += 3) {
        const a0 = wet[q], half = wet[q + 1], depth = wet[q + 2];
        const n = Math.random() < dt * 26 * boost * (.4 + depth) ? Math.ceil(boost) : 0;
        for (let j = 0; j < n; j++) {
          const a = a0 + (Math.random() * 2 - 1) * half, nx = Math.sin(a), nz = Math.cos(a);
          splash(-.5 + nx * R, 1.1 + nz * R, nx, nz, Math.min(1.6, .45 * boost), boost > 2 ? 5 : 2);
        }
        if (Math.random() < .5) { const a = a0 + (Math.random() * 2 - 1) * half; drop(-.5 + Math.sin(a) * R, 1.1 + Math.cos(a) * R, .012, .035 * Math.min(3, boost)); }
      }
      // the hero copy: where text or buttons break the screen waterline, plus wave strikes (raycast onto the water)
      const rect = gl.domElement.getBoundingClientRect();
      const hit = (px, py) => {
        tools.ndc.set(((px - rect.left) / rect.width) * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1);
        tools.ray.setFromCamera(tools.ndc, camera); tools.plane.constant = -gy;
        return tools.ray.ray.intersectPlane(tools.plane, tools.v);
      };
      const wl = story.wl;
      if (wl && wl.segs.length) for (const [x0, x1] of wl.segs) {
        if (Math.random() > dt * 60 * wl.k * Math.min(2, (x1 - x0) / 250)) continue;
        const p = hit(x0 + Math.random() * (x1 - x0), wl.y); if (!p) continue;
        splash(p.x, p.z, (Math.random() - .5) * .6, .7, Math.min(1.4, wl.k), 3, 1);
        if (Math.random() < .6) drop(p.x, p.z, .01, .05 * Math.min(2, wl.k));
      }
      const ev = story.splashes || [];
      while (ev.length) {
        const e = ev.shift(), c = hit(e.x, e.y); if (!c) continue;
        const px = c.x, pz = c.z, w = e.w ? hit(e.x + e.w / 2, e.y) : null, span = w ? Math.abs(w.x - px) : .3;
        for (let j = 0; j < 8; j++) { const ox = (Math.random() * 2 - 1) * span; splash(px + ox, pz, ox * .3, .8, e.k, 3, 1); }
        drop(px, pz, .03, .12 * e.k); drop(px - span * .6, pz, .02, .06 * e.k); drop(px + span * .6, pz, .02, .06 * e.k);
      }
    }

    // integrate spray; droplets that fall back in ring the water
    let alive = 0;
    for (let i = 0; i < P.n; i++) {
      const k = P.kind[i], i3 = i * 3;
      P.life[i] -= dt;
      if (k === 2) { P.vel[i3] *= .95; P.vel[i3 + 2] *= .95; P.vel[i3 + 1] = (gy + .03 - P.pos[i3 + 1]) * 4; }
      else if (k) { P.vel[i3 + 1] -= .5 * dt; P.vel[i3] *= .97; P.vel[i3 + 2] *= .97; } else P.vel[i3 + 1] -= 9.8 * dt;
      P.pos[i3] += P.vel[i3] * dt; P.pos[i3 + 1] += P.vel[i3 + 1] * dt; P.pos[i3 + 2] += P.vel[i3 + 2] * dt;
      if (!k && P.pos[i3 + 1] < gy && P.vel[i3 + 1] < 0) { if (Math.random() < .25) drop(P.pos[i3], P.pos[i3 + 2], .006, .012); continue; }
      if (P.life[i] <= 0) continue;
      const f = P.life[i] / P.max[i], a3 = alive * 3;
      P.sz[alive] = P.base[i] * (k ? 1 + (1 - f) * (k === 2 ? .8 : 1.6) : 1);
      P.al[alive] = k === 2 ? Math.min(1, (1 - f) * 6) * f * .55 : k ? f * .2 : Math.min(1, f * 3) * .85;
      P.so[alive] = k ? P.seed[i] : 0;
      if (alive !== i) {
        P.pos[a3] = P.pos[i3]; P.pos[a3 + 1] = P.pos[i3 + 1]; P.pos[a3 + 2] = P.pos[i3 + 2];
        P.vel[a3] = P.vel[i3]; P.vel[a3 + 1] = P.vel[i3 + 1]; P.vel[a3 + 2] = P.vel[i3 + 2];
        P.life[alive] = P.life[i]; P.max[alive] = P.max[i]; P.base[alive] = P.base[i]; P.kind[alive] = k; P.seed[alive] = P.seed[i];
      }
      alive++;
    }
    P.n = alive;
    P.geo.setDrawRange(0, alive);
    P.geo.attributes.position.needsUpdate = P.geo.attributes.aSize.needsUpdate = P.geo.attributes.aAlpha.needsUpdate = P.geo.attributes.aSoft.needsUpdate = true;
    P.mat.uniforms.scale.value = gl.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

    // ── ripple simulation: one wave step per frame, then shade into a normal map
    const q = sim.queue, n = Math.min(MAXD, q.length / 3);
    for (let j = 0; j < n; j++) { const [u, v] = q[j * 3]; sim.drops[j].set(u, v, q[j * 3 + 1], q[j * 3 + 2]); }
    q.splice(0, n * 3);
    sim.step.uniforms.count.value = n;
    const prev = gl.getRenderTarget();
    sim.quad.material = sim.step; sim.step.uniforms.tex.value = sim.a.texture;
    gl.setRenderTarget(sim.b); gl.render(sim.scene, sim.cam);
    [sim.a, sim.b] = [sim.b, sim.a];
    sim.quad.material = sim.shadeMat; sim.shadeMat.uniforms.tex.value = sim.a.texture;
    sim.shadeMat.uniforms.t.value = still ? 0 : t; sim.shadeMat.uniforms.origin.value.set(cx, zc);
    gl.setRenderTarget(sim.shade); gl.render(sim.scene, sim.cam);
    gl.setRenderTarget(prev);

    clock.value = still ? 0 : t;
    if (!still) ring.current.rotation.z += dt * .12;
    ring.current.material.opacity = .35 + .1 * Math.sin(t * 1.7) + (story.rising || 0) * .5;
  });

  if (!on) return null;
  return (
    <>
      <group ref={g}>
        <mesh rotation-x={-Math.PI / 2} position={[cx, 0, zc]}>
          <planeGeometry args={[SEA, SEA]} />
          {/* drei multiplies the reflection by the base colour, so the base is pale and the darkness comes from what it
              reflects. The simulated normals both shade the surface and break the reflection into ripples. */}
          <MeshReflectorMaterial ref={patch} resolution={hq ? 1024 : 256} mirror={1} mixBlur={hq ? .25 : 0} mixStrength={1.1} mixContrast={1.35}
            blur={hq ? [60, 12] : [0, 0]} distortion={.12} distortionMap={sim.shade.texture} depthScale={0}
            normalMap={sim.shade.texture} normalScale={[1.4, 1.4]} color="#4d5058" metalness={.25} roughness={.38}
            transparent alphaMap={fade} />
        </mesh>
        {/* foam where the ribbon meets the water (spiral axis sits at x -.5, z 1.1) */}
        <mesh ref={ring} rotation-x={-Math.PI / 2} position={[-.5, .01, 1.1]}>
          <planeGeometry args={[R * 2.7, R * 2.7]} />
          <meshBasicMaterial map={foam} transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
      {/* spray lives in world space */}
      <points geometry={P.geo} material={P.mat} frustumCulled={false} />
    </>
  );
}
