import * as THREE from 'three';

// ─── helpers ─────────────────────────────────────────────────────────────
export const clamp01 = v => Math.min(1, Math.max(0, v));
export const seg = (p, a, b) => clamp01((p - a) / (b - a));
export const ease = t => t * t * (3 - 2 * t);
export const lerp = (a, b, t) => a + (b - a) * t;
// Frame-rate independent critically damped follow (Apple's damping 1.0 default)
export const damp = (cur, to, k, dt) => cur + (to - cur) * (1 - Math.exp(-k * dt));

export const SRC = [[-7.4, 2.3], [-7.9, 0], [-7.4, -2.3]];          // WhatsApp, email, upload
export const FOLD = [[6.6, 2.25], [6.6, 0], [6.6, -2.25]];          // ITR, GST, Bank
export const PHONE = [-4.9, -.1, .8];
export const TINTS = ['#7fb0ff', '#7ef0c8', '#ffcf7a'].map(c => new THREE.Color(c));
export const N = 24;

// ─── hero sea: one frame of reference shared by the water, the spiral and the DOM splashes ──
// W: water level · cx, zc: centre of the 40×40 water sheet, kept under the hero camera on every aspect
export const SEA = 40;
export const sea = aspect => {
  const camZ = 13 * Math.min(Math.max(1, 1.7 / aspect), 2.1);
  return { W: aspect < .8 ? -3.3 : -3.95, cx: aspect > 1.2 ? -3.4 : 0, zc: camZ - 18 };
};
