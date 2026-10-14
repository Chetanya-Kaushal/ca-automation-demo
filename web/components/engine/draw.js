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

// `act` holds each agent's eased 0..1 activeness, so the highlight glides between agents
export function drawStrands(ctx, w, h, t, agents, act) {
  const cx = w / 2, spread = Math.min(w * .32, 240);
  ctx.clearRect(0, 0, w, h);
  const g = ctx.createRadialGradient(cx, h / 2, 0, cx, h / 2, Math.max(w, h) * .55);
  g.addColorStop(0, 'rgba(60,110,255,.28)'); g.addColorStop(1, 'rgba(10,20,60,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);

  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 1;
  for (const s of STRANDS) {
    ctx.strokeStyle = `rgba(${150 + (s.a * 3 | 0)},${185 + (s.a | 0)},255,${.11 + .04 * Math.sin(t * 1.6 + s.p1)})`;
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
    const a = act[j], breathe = 1 + .12 * Math.sin(t * 2.4 + j);
    const gr = (18 + 18 * a) * breathe, r = 4 + 3 * a;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, gr);
    glow.addColorStop(0, `rgba(${120 + 40 * a | 0},${170 + 50 * a | 0},255,${.7 + .25 * a})`); glow.addColorStop(1, 'rgba(60,110,255,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, gr, 0, 7); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    if (a > .05) { // expanding ping on the working agent, fading with its activeness
      const k = (t * 1.1) % 1;
      ctx.strokeStyle = `rgba(127,216,255,${(1 - k) * a})`; ctx.beginPath(); ctx.arc(x, y, 8 + k * 28, 0, 7); ctx.stroke();
    }
    const left = x > cx;
    ctx.fillStyle = `rgba(${200 + 33 * a | 0},${220 + 27 * a | 0},255,${.75 + .25 * a})`;
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
  const line = () => { // curve through midpoints: a smooth wave, not a zigzag
    const P = samples.map((v, i) => [xs(i), base - v * (h - 34)]);
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]);
    for (let i = 1; i < P.length - 1; i++) ctx.quadraticCurveTo(P[i][0], P[i][1], (P[i][0] + P[i + 1][0]) / 2, (P[i][1] + P[i + 1][1]) / 2);
    ctx.lineTo(P[P.length - 1][0], P[P.length - 1][1]);
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
