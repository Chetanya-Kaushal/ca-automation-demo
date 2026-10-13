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
export const PHONE = [-6.3, 0, 0.2];
export const TINTS = ['#7fb0ff', '#7ef0c8', '#ffcf7a'].map(c => new THREE.Color(c));
export const N = 24;

export function paperTexture() {
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
