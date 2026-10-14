// Decision pipeline canvas: breathing fibre bundles, a web of curves, and the glowing route.
// Everything is drawn additively so overlaps bloom like light, not paint.

const FIBRES = Array.from({ length: 24 }, (_, i) => ({ o: i / 23 - .5, p: i * 2.3, a: 4 + (i * 29 % 13), s: .7 + (i * 7 % 5) / 10 }));
const WEB = Array.from({ length: 30 }, (_, i) => ({ a: i % 3, b: (i * 7 + 1) % 3, y1: (i * .137) % 1, y2: (i * .291 + .3) % 1, k: (i * .53) % 1, hot: i % 4 === 0 }));
const SPARKS = Array.from({ length: 140 }, (_, i) => ({ g: i % 3, f: (i * .37) % 1, s: .03 + (i * 13 % 9) / 160, o: (i * .61) % 1 - .5 }));

const fx = (gx, y, t, f, gi) => gx + f.o * 34 + Math.sin(y * .018 + t * .9 * f.s + f.p + gi) * f.a + Math.sin(y * .006 - t * .45 + f.p) * f.a * 1.4;

// Smooth route: card → curve down the gap bundle → next card. Returns sampled points + where each card starts.
export function buildRoute(pts, gaps) {
  const out = [], marks = [];
  const line = (x1, y1, x2, y2, n) => { for (let i = 0; i <= n; i++) out.push([x1 + (x2 - x1) * i / n, y1 + (y2 - y1) * i / n]); };
  const bez = (p0, p1, p2, p3, n) => {
    for (let i = 1; i <= n; i++) {
      const t = i / n, u = 1 - t;
      out.push([u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]]);
    }
  };
  line(pts[0].l - 40, pts[0].y, pts[0].l, pts[0].y, 4);
  marks.push(out.length - 1);
  line(pts[0].l, pts[0].y, pts[0].r, pts[0].y, 10);
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1], b = pts[k], g = gaps[k - 1] ?? (a.r + b.l) / 2;
    // two S-curves meeting in the bundle: the line rides the fibres between cards
    const midY = (a.y + b.y) / 2;
    bez([a.r, a.y], [g - 6, a.y], [g, a.y + (midY - a.y) * .2], [g, midY], 26);
    bez([g, midY], [g, midY + (b.y - midY) * .8], [g + 6, b.y], [b.l, b.y], 26);
    marks.push(out.length - 1);
    line(b.l, b.y, b.r, b.y, 10);
  }
  // fraction of the path where each card is reached
  return { pts: out, at: marks.map(m => m / (out.length - 1)) };
}

export function drawPipeline(ctx, w, h, t, st) {
  ctx.clearRect(0, 0, w, h);
  const { gaps, rgb, route } = st;
  const breathe = .82 + .18 * Math.sin(t * 2.2);
  const head = route && route.pts.length ? route.pts[Math.min(route.pts.length - 1, Math.floor(route.p * (route.pts.length - 1)))] : null;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';

  // web of curves between bundles, gently breathing
  WEB.forEach(c => {
    const xa = gaps[c.a], xb = gaps[c.b];
    if (xa == null || xb == null) return;
    const y1 = c.y1 * h, y2 = c.y2 * h, sway = Math.sin(t * .6 + c.k * 6) * 60;
    ctx.strokeStyle = c.hot ? `rgba(${rgb},${.24 * breathe * (route?.alpha ?? 1)})` : `rgba(200,220,255,${.09 + .06 * breathe})`;
    ctx.lineWidth = c.hot ? 1.2 : .8;
    ctx.beginPath(); ctx.moveTo(xa, y1);
    ctx.bezierCurveTo(xa + 120 + sway, y1 + 40, xb - 120 - sway, y2 - 40, xb, y2);
    ctx.stroke();
  });

  // fibre bundles; the one nearest the moving head heats up into the case colour
  gaps.forEach((gx, gi) => {
    const heat = head ? Math.exp(-Math.abs(gx - head[0]) / 90) * (route.alpha ?? 1) : 0;
    const halo = ctx.createLinearGradient(gx - 40, 0, gx + 40, 0); // soft light column behind the strands
    halo.addColorStop(0, 'rgba(0,0,0,0)'); halo.addColorStop(.5, heat > .05 ? `rgba(${rgb},${.14 * heat * breathe})` : `rgba(150,190,255,${.05 * breathe})`); halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo; ctx.fillRect(gx - 40, 0, 80, h);
    for (const f of FIBRES) {
      const core = Math.abs(f.o) < .2;
      ctx.lineWidth = core ? 1.1 + heat * 2.2 : .8;
      ctx.strokeStyle = heat > .05 && core ? `rgba(${rgb},${(.25 + heat * .6) * breathe})`
        : `rgba(${core ? '235,242,255' : '170,200,255'},${(core ? .34 : .15) * breathe})`;
      ctx.beginPath();
      for (let y = -12; y <= h + 12; y += 10) { const x = fx(gx, y, t, f, gi); y < 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
      ctx.stroke();
    }
  });

  // sparks drifting down the bundles
  SPARKS.forEach(s => {
    const gx = gaps[s.g % gaps.length]; if (gx == null) return;
    const y = ((s.f + t * s.s) % 1) * h, x = gx + s.o * 40 + Math.sin(y * .02 + t + s.o * 9) * 9;
    const tw = .5 + .5 * Math.sin(t * 4 + s.f * 20);
    ctx.fillStyle = s.g === 1 ? `rgba(${rgb},${.7 * tw})` : `rgba(255,255,255,${.75 * tw})`;
    ctx.beginPath(); ctx.arc(x, y, .9 + tw * .8, 0, 7); ctx.fill();
  });

  // the route: layered glow passes make a neon tube
  if (route && route.pts.length && route.alpha > 0) {
    const n = Math.max(2, Math.floor(route.p * (route.pts.length - 1)) + 1);
    const pass = (width, a) => {
      ctx.lineWidth = width; ctx.strokeStyle = a;
      ctx.beginPath(); ctx.moveTo(route.pts[0][0], route.pts[0][1]);
      for (let i = 1; i < n; i++) ctx.lineTo(route.pts[i][0], route.pts[i][1]);
      ctx.stroke();
    };
    const A = route.alpha * breathe;
    pass(26, `rgba(${rgb},${.06 * A})`);
    pass(13, `rgba(${rgb},${.16 * A})`);
    pass(6, `rgba(${rgb},${.55 * A})`);
    pass(2, `rgba(255,255,255,${.85 * A})`);
    if (head && route.p < 1) { // glowing orb leading the line
      const g = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], 46);
      g.addColorStop(0, `rgba(255,255,255,${A})`); g.addColorStop(.25, `rgba(${rgb},${.8 * A})`); g.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(head[0], head[1], 46, 0, 7); ctx.fill();
    }
    if (route.ring > 0) { // ripple where the route lands
      const [x, y] = route.pts[route.pts.length - 1], k = route.ring;
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(${rgb},${(1 - k) * route.alpha})`;
      ctx.beginPath(); ctx.arc(x, y, 12 + k * 90, Math.PI * .1, Math.PI * 1.9); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'source-over';
}
