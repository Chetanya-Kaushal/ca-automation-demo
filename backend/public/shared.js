// Shared by the staff dashboard and the client upload page.
const P = {
  check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5M12 3v12"/>',
  inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  sparkles: '<path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', refresh: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>', auto: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
};
export const ico = (n, s = 16) => `<svg class="i" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]}</svg>`;
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = s => document.querySelector(s);
export const extOf = name => esc((name.split('.').pop() || '').toLowerCase().slice(0, 4));

const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let M = null;
import('https://cdn.jsdelivr.net/npm/motion@11.11.13/+esm').then(m => (M = m)).catch(() => {});
// Critically damped spring entrance (Apple default); WAAPI fallback if Motion didn't load
export function enter(node, y = 10) {
  if (reduce.matches) return;
  if (M) M.animate(node, { opacity: [0, 1], y: [y, 0], scale: [.98, 1] }, { type: 'spring', bounce: 0, duration: .4 });
  else node.animate([{ opacity: 0, transform: `translateY(${y}px)` }, { opacity: 1, transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.2,0,0,1)' });
}
export function leave(node) {
  if (reduce.matches || !node.animate) { node.remove(); return Promise.resolve(); }
  const a = node.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(24px) scale(.98)' }], { duration: 220, easing: 'cubic-bezier(.3,0,1,1)' });
  return a.finished.then(() => node.remove());
}

export function themeButton(btn) {
  const icons = { auto: 'auto', light: 'sun', dark: 'moon' }, order = ['auto', 'light', 'dark'];
  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.dataset.theme = t; } catch (e) {}
  const paint = () => { const t = document.documentElement.dataset.theme || 'auto'; btn.innerHTML = ico(icons[t], 18); btn.setAttribute('aria-label', `Theme: ${t}. Change theme`); };
  btn.addEventListener('click', () => {
    const next = order[(order.indexOf(document.documentElement.dataset.theme || 'auto') + 1) % 3];
    if (next === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = next;
    try { next === 'auto' ? localStorage.removeItem('theme') : localStorage.setItem('theme', next); } catch (e) {}
    paint();
  });
  paint();
}

// Upload with progress (fetch has no upload progress)
export function sendFiles(url, files, headers = {}, extra = {}, onProgress = () => {}) {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    Object.entries(extra).forEach(([k, v]) => v && fd.append(k, v));
    const x = new XMLHttpRequest();
    x.open('POST', url);
    Object.entries(headers).forEach(([k, v]) => x.setRequestHeader(k, v));
    x.upload.onprogress = e => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => { let b = {}; try { b = JSON.parse(x.responseText); } catch (e) {} x.status < 300 ? resolve(b) : reject(new Error(b.error || `Upload failed (${x.status})`)); };
    x.onerror = () => reject(new Error('Network error'));
    x.send(fd);
  });
}
