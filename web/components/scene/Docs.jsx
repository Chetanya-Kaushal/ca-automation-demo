'use client';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { story } from '@/lib/store';
import { clamp01, seg, ease, lerp, damp, SRC, FOLD, TINTS, N, paperTexture } from './shared';

// ─── documents: one instanced mesh, 24 papers ─────────────────────────────
export default function Docs({ still }) {
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
