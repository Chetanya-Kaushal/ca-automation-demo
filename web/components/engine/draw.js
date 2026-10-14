// Canvas painters for the Engine console. Pure drawing: state comes in, pixels go out.

const N = 46;
const STRANDS = Array.from({ length: N }, (_, i) => ({
  o: (i / (N - 1) - .5),                 // horizontal offset in the bundle
  p1: i * 1.7, p2: i * .9,               // phases
  a: 18 + (i * 37 % 23),                 // sway amplitude (px at 1x)
}));

// x of strand s at height y and time t: two sine waves give the twisting-rope look
function strandX(s, y, t, cx, spread) {
  return cx + s.o * spread + Math.sin(y * .011 + t * .55 + s.p1) * s.a + Math.sin(y * .005 - t * .35 + s.p2) * s.a * .8;
}

export function drawStrands(ctx, w, h, t, agents, active) {
  const cx = w / 2, spread = Math.min(w * .32, 240);
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(cx, h / 2, 0, cx, h / 2, Math.max(w, h) * .55);
  g.addColorStop(0, 'rgba(60,110,255,.28)'); g.addColorStop(1, 'rgba(10,20,60,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 1;
  for (const s of STRANDS) {
    ctx.strokeStyle = `rgba(${150 + (s.a * 3 | 0)},${185 + (s.a | 0)},255,.13)`;
    ctx.beginPath();
    for (let y = -10; y <= h + 10; y += 10) {
      const x = strandX(s, y, t, cx, spread);
      y < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // agents ride their strand, drifting up and down
  ctx.font = '600 10px ui-monospace, "SF Mono", Menlo, monospace';
  agents.forEach((name, j) => {
    const s = STRANDS[(j * 8 + 3) % N];
    const y = h * (.18 + .64 * (.5 + .5 * Math.sin(t * .18 + j * 1.9)));
    const x = strandX(s, y, t, cx, spread);
    const on = j === active, r = on ? 7 : 4;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, on ? 34 : 18);
    glow.addColorStop(0, on ? 'rgba(160,220,255,.95)' : 'rgba(120,170,255,.7)'); glow.addColorStop(1, 'rgba(60,110,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, on ? 34 : 18, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (on) { // expanding ping on the working agent
      const k = (t * 1.2) % 1;
      ctx.strokeStyle = `rgba(127,216,255,${1 - k})`; ctx.beginPath(); ctx.arc(x, y, 8 + k * 26, 0, 7); ctx.stroke();
    }
    const left = x > cx;
    ctx.fillStyle = on ? '#e9f7ff' : 'rgba(200,220,255,.75)';
    ctx.textAlign = left ? 'left' : 'right';
    ctx.fillText(`${String(j + 1).padStart(2, '0')} · ${name.toUpperCase()}`, x + (left ? 12 : -12), y + 3.5);
  });
  ctx.globalCompositeOperation = 'source-over';
}

// Scrolling activity waveform with event tags (newest on the right)
// `shift` 1→0 glides the newest sample in from the right
export function drawTimeline(ctx, w, h, samples, tags, shift) {
  ctx.clearRect(0, 0, w, h);
  const step = w / (samples.length - 2), base = h - 14;
  const xs = i => (i - 1 + shift) * step;
  const line = () => {
    ctx.beginPath();
    samples.forEach((v, i) => { const x = xs(i), y = base - v * (h - 34); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
  };
  line(); ctx.lineTo(w, base); ctx.lineTo(0, base); ctx.closePath();
  const f = ctx.createLinearGradient(0, 10, 0, base);
  f.addColorStop(0, 'rgba(76,141,255,.45)'); f.addColorStop(1, 'rgba(76,141,255,0)');
  ctx.fillStyle = f; ctx.fill();
  line(); ctx.strokeStyle = '#7fb0ff'; ctx.lineWidth = 1.5; ctx.stroke();

  ctx.font = '600 9.5px ui-monospace, "SF Mono", Menlo, monospace'; ctx.textAlign = 'left';
  let lastLabel = Infinity; // newest first, so the latest label always wins the space
  [...tags].reverse().forEach(({ i, text }) => {
    const x = xs(i);
    if (x < -160 || x > w) return;
    ctx.fillStyle = 'rgba(127,216,255,.5)'; ctx.fillRect(x, 4, 1, base - 4);
    ctx.fillStyle = '#7fd8ff'; ctx.fillRect(x - 2, 4, 5, 5);
    const label = text.toUpperCase(), tw = ctx.measureText(label).width + 14;
    if (x + tw > lastLabel || x + tw > w + 40) return;
    ctx.fillStyle = 'rgba(225,238,255,.85)'; ctx.fillText(label, x + 7, 11);
    lastLabel = x;
  });
  ctx.fillStyle = 'rgba(160,180,220,.5)'; ctx.font = '9px ui-monospace, Menlo, monospace';
  for (let k = 1; k < 6; k++) ctx.fillText(`T-${(6 - k) * 2}M`, w * k / 6 - 12, h - 2);
}

// Decision pipeline: glowing fibre bundles in the lane gaps, tinted by the active case colour
const FIBRES = Array.from({ length: 14 }, (_, i) => ({ o: i / 13 - .5, p: i * 2.3, a: 6 + (i * 29 % 11) }));
const SPARKS = Array.from({ length: 90 }, (_, i) => ({ g: i % 5, f: (i * 0.37) % 1, s: .04 + (i * 13 % 7) / 140, o: (i * 0.61) % 1 - .5 }));
export function drawFibres(ctx, w, h, t, gaps, rgb) {
  ctx.clearRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'lighter';
  gaps.forEach((gx, gi) => {
    for (const f of FIBRES) {
      const hot = Math.abs(f.o) < .18; // the core of each bundle carries the case colour
      ctx.strokeStyle = hot ? `rgba(${rgb},.32)` : 'rgba(210,225,255,.12)';
      ctx.lineWidth = hot ? 1.4 : 1;
      ctx.beginPath();
      for (let y = -10; y <= h + 10; y += 12) {
        const x = gx + f.o * 26 + Math.sin(y * .02 + t * .9 + f.p + gi) * f.a + Math.sin(y * .006 - t * .4 + f.p) * f.a;
        y < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  });
  for (const s of SPARKS) { // particles drifting down the bundles
    const gx = gaps[s.g % gaps.length];
    if (gx == null) continue;
    const y = ((s.f + t * s.s) % 1) * h, x = gx + s.o * 30 + Math.sin(y * .02 + t + s.o * 9) * 8;
    ctx.fillStyle = s.g % 2 ? 'rgba(255,255,255,.75)' : `rgba(${rgb},.85)`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  ctx.globalCompositeOperation = 'source-over';
}

// Three-line confidence stream around the 0.85 gate
export function drawConfidence(ctx, w, h, t, rgb) {
  ctx.clearRect(0, 0, w, h);
  const gate = h * .32;
  ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.beginPath(); ctx.moveTo(0, gate); ctx.lineTo(w, gate); ctx.stroke(); ctx.setLineDash([]);
  [[rgb, 1, 0], ['127,216,255', 1.4, 2], ['255,207,122', .8, 4]].forEach(([c, k, p]) => {
    ctx.strokeStyle = `rgba(${c},.9)`; ctx.lineWidth = 1.5; ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = h * .5 + Math.sin(x * .03 * k + t * 2 + p) * h * .22 + Math.sin(x * .011 - t + p) * h * .12;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  });
  ctx.fillStyle = '#fff'; ctx.font = '10px ui-monospace, Menlo, monospace'; ctx.fillText('0.85', w - 30, gate - 4);
}
