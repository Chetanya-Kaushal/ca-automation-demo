'use client';
import { useEffect, useRef } from 'react';

// Each slide: a headline revealed word by word, burnt away by lightning, then rebuilt from embers as `burst`
const SLIDES = [
  { words: 'Every file sorted the moment it lands.', burst: 'Filed.' },
  { words: 'Reminders sent. Returns delivered. Nothing chased.', burst: 'Done.' },
  { words: 'Paperwork that files itself.', burst: 'Ledger Hackers' },
];
// Beat timings (seconds into a slide)
const REVEAL = 0, BOLT = 3.0, BOLT_END = 4.0, FOUNTAIN = 4.0, FORM = 4.5, RELEASE = 6.6, NEXT = 7.4;
const MAX = 18000;
// Swirling flow field: every particle is advected by it, so sparks curl like a plume instead of flying straight
const flow = (x, y, t) => Math.sin(x * .006 + t * .6) * 2.1 + Math.cos(y * .008 - t * .45) * 1.7 + Math.sin((x + y) * .003 + t * .3);

export default function Sparks() {
  const root = useRef(), cv = useRef();

  useEffect(() => {
    const c = cv.current, ctx = c.getContext('2d');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const font = getComputedStyle(document.body).fontFamily;
    let W = 0, H = 0, dpr = 1, raf, visible = false, last = 0, clock = 0, slide = -1, L = null;

    // particle pool in typed arrays: position, velocity, target, life, mode (0 free, 1 seeking target)
    const px = new Float32Array(MAX), py = new Float32Array(MAX), vx = new Float32Array(MAX), vy = new Float32Array(MAX);
    const tx = new Float32Array(MAX), ty = new Float32Array(MAX), life = new Float32Array(MAX), mode = new Uint8Array(MAX), seed = new Float32Array(MAX);
    let count = 0;
    const spawn = (x, y, svx, svy, m = 0, t1 = 0, t2 = 0) => {
      const i = count < MAX ? count++ : (Math.random() * MAX) | 0;
      px[i] = x; py[i] = y; vx[i] = svx; vy[i] = svy; mode[i] = m; tx[i] = t1; ty[i] = t2; life[i] = 1; seed[i] = Math.random() * 6.28;
    };

    // lay out headline words, then sample the pixels of any text so it can become particles
    const layout = s => {
      const fs = Math.max(30, Math.min(88, W * .058)), x0 = W * .08, maxW = W * .62, lh = fs * 1.08;
      ctx.font = `600 ${fs}px ${font}`;
      const words = [], parts = s.words.split(' ');
      let x = x0, y = H * .42;
      parts.forEach(w => {
        const ww = ctx.measureText(w + ' ').width;
        if (x + ww - x0 > maxW && x > x0) { x = x0; y += lh; }
        words.push({ w, x, y }); x += ww;
      });
      const bfs = Math.max(48, Math.min(150, W * (s.burst.length > 8 ? .085 : .12)));
      return { fs, words, top: H * .42 - fs, bottom: y + fs * .3, x0, x1: x0 + maxW,
        wordPts: sample(words.map(o => [o.w, o.x, o.y]), `600 ${fs}px ${font}`, Math.max(1.5, fs / 40)),
        burstPts: sample([[s.burst, x0, H * .55]], `700 ${bfs}px ${font}`, Math.max(1.5, bfs / 64)), released: 0 };
    };
    const sample = (items, f, step) => {
      const o = document.createElement('canvas'); o.width = W; o.height = H;
      const g = o.getContext('2d', { willReadFrequently: true }); g.font = f; g.fillStyle = '#fff'; g.textBaseline = 'alphabetic';
      items.forEach(([t, x, y]) => g.fillText(t, x, y));
      const d = g.getImageData(0, 0, W, H).data, pts = [];
      for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) if (d[((y | 0) * W + (x | 0)) * 4 + 3] > 140) pts.push([x, y]);
      return pts.sort((a, b) => a[0] - b[0]); // left to right, so the bolt can release them in order
    };

    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 1.5); W = c.clientWidth; H = c.clientHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (slide >= 0) L = layout(SLIDES[slide]);
    };

    const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    const bolt = (bx, t) => { // jagged golden lightning, regrown every frame
      const pts = []; let x = bx;
      for (let y = -10; y <= H + 10; y += 16) { x += (Math.random() - .5) * 26; x += (bx - x) * .25; pts.push([x, y]); }
      ctx.globalCompositeOperation = 'lighter';
      [[18, 'rgba(255,170,60,.08)'], [8, 'rgba(255,190,90,.35)'], [3, 'rgba(255,225,160,.9)'], [1.2, '#fff']].forEach(([lw, s]) => {
        ctx.lineWidth = lw; ctx.strokeStyle = s; ctx.beginPath();
        pts.forEach(([a, b], i) => (i ? ctx.lineTo(a, b) : ctx.moveTo(a, b))); ctx.stroke();
      });
      const g = ctx.createRadialGradient(bx, H / 2, 0, bx, H / 2, W * .25);
      g.addColorStop(0, `rgba(255,190,100,${.12 + .06 * Math.sin(t * 60)})`); g.addColorStop(1, 'rgba(255,190,100,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    };

    const frame = now => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      if (visible) tick(dt);
    };
    const tick = dt => {
      clock += dt;
      if (slide < 0 || clock >= NEXT) { slide = (slide + 1) % SLIDES.length; clock = 0; L = layout(SLIDES[slide]); }
      const t = clock;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(3,3,5,.42)'; ctx.fillRect(0, 0, W, H); // short trails for the embers

      // 1 · words fade in one by one, grey to white, rising slightly
      const boltX = t < BOLT ? -1e9 : L.x0 - 60 + (L.x1 - L.x0 + 160) * ease((t - BOLT) / (BOLT_END - BOLT));
      if (t < BOLT_END + .1) {
        ctx.save();
        if (t >= BOLT) { ctx.beginPath(); ctx.rect(boltX, 0, W, H); ctx.clip(); }
        ctx.font = `600 ${L.fs}px ${font}`; ctx.textBaseline = 'alphabetic';
        L.words.forEach((o, i) => {
          const k = ease((t - REVEAL - .25 - i * .16) / .7);
          if (k <= 0) return;
          const g = 120 + 135 * k | 0;
          ctx.fillStyle = `rgba(${g},${g},${g},${k})`; ctx.fillText(o.w, o.x, o.y + (1 - k) * 14);
        });
        ctx.restore();
      }
      // 2 · the bolt burns the words away into embers as it passes
      if (t >= BOLT && t < BOLT_END + .15) {
        while (L.released < L.wordPts.length && L.wordPts[L.released][0] < boltX) {
          const [x, y] = L.wordPts[L.released++];
          if (Math.random() < .55) spawn(x, y, (Math.random() - .2) * 220, -Math.random() * 260, 0);
        }
        bolt(boltX, t);
      }
      // 3 · a sparkler fountain rises, then 4 · embers fly up and settle into the burst word
      if (t >= FOUNTAIN && t < FORM + .4) for (let k = 0; k < 50; k++)
        spawn(L.x0 + W * .12 + (Math.random() - .5) * 60, H + 10, (Math.random() - .5) * 260, -380 - Math.random() * 520, 0);
      if (t >= FORM) { // stream embers into the letters left to right over ~0.9s, so the word fills in
        const want = Math.min(L.burstPts.length, Math.floor(L.burstPts.length * (t - FORM) / .9));
        for (L.sent = L.sent || 0; L.sent < want; L.sent++) {
          const [x, y] = L.burstPts[L.sent];
          spawn(L.x0 + W * .12 + (Math.random() - .5) * 140, H * .92 + Math.random() * 50, (Math.random() - .5) * 300, -420 - Math.random() * 260, 1, x, y);
        }
      }
      if (t >= RELEASE && !L.dropped) { L.dropped = true; for (let i = 0; i < count; i++) if (mode[i] === 1) { mode[i] = 2; vx[i] = (Math.random() - .5) * 30; vy[i] = -20 - Math.random() * 40; } }

      // integrate + draw embers additively
      ctx.globalCompositeOperation = 'lighter';
      const heat = Math.max(0, Math.min(1, (t - FORM - .6) / 1.2)); // assembled text cools from gold toward white-hot
      let alive = 0;
      for (let i = 0; i < count; i++) {
        const a = flow(px[i], py[i], t);
        if (mode[i] === 1) { // seek the letter: swirl while far away, settle into place as it arrives
          const dx = tx[i] - px[i], dy = ty[i] - py[i], near = Math.exp(-Math.hypot(dx, dy) / 70);
          vx[i] += (dx * 30 + Math.cos(a) * 260 * (1 - near)) * dt; vy[i] += (dy * 30 + Math.sin(a) * 260 * (1 - near)) * dt;
          const d = Math.exp(-(6 + 6 * near) * dt); vx[i] *= d; vy[i] *= d;
        } else if (mode[i] === 2) { // deform: letters melt into drifting, curling smoke
          vx[i] += Math.cos(a) * 180 * dt; vy[i] += (Math.sin(a) * 180 - 40) * dt;
          const d = Math.exp(-1.6 * dt); vx[i] *= d; vy[i] *= d; life[i] -= dt * (.55 + seed[i] * .06);
        } else { // fountain / bolt embers: gravity plus swirl, burning out before they pile up
          vy[i] += 380 * dt; vx[i] += Math.cos(a) * 120 * dt; vx[i] *= .992; life[i] -= dt * (.95 + seed[i] * .1);
        }
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
        if (life[i] <= 0 || py[i] > H + 40) continue;
        const tw = .6 + .4 * Math.sin(t * 9 + seed[i] * 7), al = Math.min(1, life[i] * tw * 1.2);
        const r = 255, gg = mode[i] ? 196 + 30 * heat | 0 : 170 + 40 * life[i] | 0, b = mode[i] ? 105 + 45 * heat | 0 : 80; // stays warm gold, only a hint of white-hot
        ctx.fillStyle = `rgba(${r},${gg},${b},${al})`;
        const s = mode[i] === 1 ? 1.3 : 1;
        ctx.fillRect(px[i] - s / 2, py[i] - s / 2, s, s);
        // keep live particles packed at the front of the arrays
        px[alive] = px[i]; py[alive] = py[i]; vx[alive] = vx[i]; vy[alive] = vy[i]; tx[alive] = tx[i]; ty[alive] = ty[i];
        life[alive] = life[i]; mode[alive] = mode[i]; seed[alive] = seed[i]; alive++;
      }
      count = alive;
    };

    resize();
    if (reduce) { // static final frame: the last headline in plain type
      L = layout(SLIDES[2]); ctx.fillStyle = '#fff'; ctx.font = `600 ${L.fs}px ${font}`;
      L.words.forEach(o => ctx.fillText(o.w, o.x, o.y)); return;
    }
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: .15 });
    io.observe(c);
    const ro = new ResizeObserver(resize); ro.observe(c);
    last = performance.now(); raf = requestAnimationFrame(frame);
    if (process.env.NODE_ENV !== 'production') window.__sparks = sec => { for (let k = 0; k < sec * 60; k++) tick(1 / 60); }; // dev: step time deterministically
    return () => { cancelAnimationFrame(raf); io.disconnect(); ro.disconnect(); };
  }, []);

  return (
    <section ref={root} className="sparks-sec" aria-label="Every file sorted the moment it lands. Reminders sent, returns delivered, nothing chased. Paperwork that files itself.">
      <canvas ref={cv} aria-hidden="true" />
      <style>{`
        .sparks-sec{position:relative;height:min(86vh,820px);background:#030305;overflow:hidden}
        .sparks-sec canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
        @media (max-width:760px){.sparks-sec{height:72vh}}
      `}</style>
    </section>
  );
}
