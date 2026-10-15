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
// weak machines (few cores / little memory) get fewer, slightly larger particles so the sequence never stutters
const WEAK = typeof navigator !== 'undefined' && ((navigator.hardwareConcurrency || 4) < 8 || (navigator.deviceMemory || 8) < 8);
const MAX = WEAK ? 16000 : 40000;
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
      words.forEach(o => (o.wd = ctx.measureText(o.w).width));
      return { fs, words, top: H * .42 - fs, bottom: y + fs * .3, x0, x1: x0 + maxW,
        burstPts: sample([[s.burst, x0, H * .55]], `700 ${bfs}px ${font}`, Math.max(1, bfs / (WEAK ? 60 : 95))) };
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
      dpr = Math.min(devicePixelRatio || 1, WEAK ? 1.5 : 2); W = c.clientWidth; H = c.clientHeight; // dpr 2: the dust is sub-pixel fine
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

      // 1 · words fade in one by one, grey to white, rising slightly; 2 · as the bolt passes, each word dims and fades
      const boltX = t < BOLT ? -1e9 : L.x0 - 60 + (L.x1 - L.x0 + 160) * ease((t - BOLT) / (BOLT_END - BOLT));
      if (t < BOLT_END + .5) {
        ctx.font = `600 ${L.fs}px ${font}`; ctx.textBaseline = 'alphabetic';
        L.words.forEach((o, i) => {
          const k = ease((t - REVEAL - .25 - i * .16) / .7), gone = ease((boltX - o.x - o.wd * .3) / 140);
          const a = k * (1 - gone);
          if (a <= .01) return;
          const g = (120 + 135 * k) * (1 - .55 * gone) | 0;
          ctx.fillStyle = `rgba(${g},${g},${g},${a})`; ctx.fillText(o.w, o.x, o.y + (1 - k) * 14);
        });
      }
      if (t >= BOLT && t < BOLT_END + .15) {
        for (let k = 0; k < 10; k++) { // sparse welding sparks thrown off the bolt
          const ang = Math.random() * 6.28, sp = 200 + Math.random() * 420;
          spawn(boltX + (Math.random() - .5) * 20, L.top - 80 + Math.random() * (L.bottom - L.top + 200), Math.cos(ang) * sp, Math.sin(ang) * sp - 80, 3);
        }
        bolt(boltX, t);
      }
      // 3 · a dense plume of fine sparks rises, then 4 · streams into the burst word as gold dust
      if (t >= FOUNTAIN && t < FORM + .5) for (let k = 0; k < 110; k++)
        spawn(L.x0 + W * .12 + (Math.random() - .5) * 90, H + 10, (Math.random() - .5) * 240, -420 - Math.random() * 520, 0);
      if (t >= FORM) { // fill the letters left to right over ~0.9s
        const want = Math.min(L.burstPts.length, Math.floor(L.burstPts.length * (t - FORM) / .9));
        for (L.sent = L.sent || 0; L.sent < want; L.sent++) {
          const [x, y] = L.burstPts[L.sent];
          spawn(L.x0 + W * .12 + (Math.random() - .5) * 140, H * .92 + Math.random() * 50, (Math.random() - .5) * 300, -420 - Math.random() * 260, 1, x, y);
        }
      }
      // 5 · the word heats to orange, hazes and fades (no flying off)
      if (t >= RELEASE && !L.dropped) { L.dropped = true; for (let i = 0; i < count; i++) if (mode[i] === 1) { mode[i] = 2; vx[i] = (Math.random() - .5) * 24; vy[i] = (Math.random() - .5) * 24; } }

      // integrate, then draw in a few alpha buckets (one style change per bucket, not per particle)
      const heat = Math.max(0, Math.min(1, (t - FORM - .6) / 1.2));
      const melt = Math.max(0, Math.min(1, (t - RELEASE) / (NEXT - RELEASE - .1)));
      const NB = 5, dust = Array.from({ length: NB }, () => []), streak = Array.from({ length: NB }, () => []);
      let alive = 0;
      for (let i = 0; i < count; i++) {
        const a = flow(px[i], py[i], t), m = mode[i];
        if (m === 1) { // seek the letter: swirl while far, settle as it arrives
          const dx = tx[i] - px[i], dy = ty[i] - py[i], near = Math.exp(-Math.hypot(dx, dy) / 70);
          vx[i] += (dx * 30 + Math.cos(a) * 260 * (1 - near)) * dt; vy[i] += (dy * 30 + Math.sin(a) * 260 * (1 - near)) * dt;
          const d = Math.exp(-(6 + 6 * near) * dt); vx[i] *= d; vy[i] *= d;
        } else if (m === 2) { // haze: tiny jitter, slow spread, fade
          vx[i] += Math.cos(a) * 30 * dt; vy[i] += Math.sin(a) * 30 * dt; life[i] = 1 - melt;
        } else if (m === 3) { // bolt sparks: fast, short-lived, light gravity
          vy[i] += 260 * dt; vx[i] *= .985; life[i] -= dt * (1.8 + seed[i] * .2);
        } else { // fountain: gravity plus swirl, burns out before piling up
          vy[i] += 380 * dt; vx[i] += Math.cos(a) * 120 * dt; vx[i] *= .992; life[i] -= dt * (1.1 + seed[i] * .1);
        }
        px[i] += vx[i] * dt; py[i] += vy[i] * dt;
        if (life[i] <= .01 || py[i] > H + 40) continue;
        const tw = m >= 1 && m <= 2 ? .75 + .25 * Math.sin(t * 7 + seed[i] * 7) : 1;
        const b = Math.min(NB - 1, (life[i] * tw * NB) | 0);
        if (m === 1 || m === 2) dust[b].push(px[i], py[i]);
        else { const k = m === 3 ? .018 : .011; streak[b].push(px[i], py[i], px[i] - vx[i] * k, py[i] - vy[i] * k); }
        px[alive] = px[i]; py[alive] = py[i]; vx[alive] = vx[i]; vy[alive] = vy[i]; tx[alive] = tx[i]; ty[alive] = ty[i];
        life[alive] = life[i]; mode[alive] = m; seed[alive] = seed[i]; alive++;
      }
      ctx.globalCompositeOperation = 'lighter';
      // dust: pale gold → warm sand, then orange as it melts
      const dr = 255, dg = 198 - 8 * heat - 70 * melt | 0, db = 112 + 10 * heat - 80 * melt | 0, ds = .9 + melt * .6;
      ctx.lineWidth = .8; ctx.lineCap = 'round';
      for (let k = 0; k < NB; k++) {
        const al = (k + 1) / NB;
        ctx.fillStyle = `rgba(${dr},${dg},${db},${al})`;
        const D = dust[k];
        for (let j = 0; j < D.length; j += 2) ctx.fillRect(D[j] - ds / 2, D[j + 1] - ds / 2, ds, ds);
        const S = streak[k];
        if (!S.length) continue;
        ctx.strokeStyle = `rgba(255,${190 + 40 * al | 0},${110 + 60 * al | 0},${al})`;
        ctx.beginPath();
        for (let j = 0; j < S.length; j += 4) { ctx.moveTo(S[j], S[j + 1]); ctx.lineTo(S[j + 2], S[j + 3]); }
        ctx.stroke();
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
