'use client';
import { useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { story } from '@/lib/store';
import { ease, lerp, damp } from './shared';

// ─── camera: one keyframe per chapter, eased and damped ───────────────────
const CAM = [[0, -1.7, 13], [-1.4, .25, 11.6], [0, 0, 8.4], [1.7, 0, 12.2], [-1.8, 0, 12.6], [-2.4, .1, 11.2]];
const LOOK = [[0, -1.7, 0], [-1.6, 0, 0], [0, 0, 1.2], [2, 0, 0], [-1.8, 0, 0], [-3, 0, 0]];
export default function Rig() {
  const { camera, size } = useThree();
  const look = useMemo(() => new THREE.Vector3(), []);
  const v = useMemo(() => new THREE.Vector3(), []), w = useMemo(() => new THREE.Vector3(), []);
  useFrame((_, dt) => {
    const f = story.p * (CAM.length - 1), i = Math.min(Math.floor(f), CAM.length - 2), u = ease(f - i);
    // narrow screens: pull back so the whole stage fits
    const fit = Math.max(1, 1.7 / (size.width / size.height));
    v.fromArray(CAM[i]).lerp(w.fromArray(CAM[i + 1]), u);
    // wide screens: the hero text sits left, so the stage starts right of centre and glides back
    const hero = 1 - Math.min(1, f), aspect = size.width / size.height;
    const shift = aspect > 1.2 ? -3.4 * hero : 0;
    // portrait phones: the headline fills the lower half, so the stage starts high and settles as the story begins
    // the camera stays above the hero water and looks down, which puts the ribbon in the top half
    const lift = aspect < .8 ? -3.2 * hero : 0, camLift = aspect < .8 ? -.4 * hero : 0;
    v.x += story.pointer.x * .6 + shift; v.y += -story.pointer.y * .35 + story.hero * 1.2 + camLift;
    v.z *= Math.min(fit, 2.1);
    camera.position.x = damp(camera.position.x, v.x, 5, dt);
    camera.position.y = damp(camera.position.y, v.y, 5, dt);
    camera.position.z = damp(camera.position.z, v.z, 5, dt);
    v.fromArray(LOOK[i]).lerp(w.fromArray(LOOK[i + 1]), u);
    v.x += shift; v.y += lift;
    look.x = damp(look.x, v.x, 5, dt); look.y = damp(look.y, v.y, 5, dt); look.z = damp(look.z, v.z, 5, dt);
    camera.lookAt(look);
  });
  return null;
}
