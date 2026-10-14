'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { drawStrands, drawTimeline } from './engine/draw';

const AGENTS = ['Intake', 'Classifier', 'History check', 'Reminders', 'Filing prep', 'Delivery'];
const NOTES = ['Watching WhatsApp, email, links', 'Matching files to clients', 'Comparing with last year', 'Chasing missing documents', 'Queueing returns for review', 'Sending acknowledgements'];
// Simulated feed: [agent, timeline tag, toast]
const FEED = [
  [0, 'Intake · Form16_Jay.pdf', 'Form16_Jay.pdf received on WhatsApp'],
  [1, 'Classified · 97%', 'Jay Teli · Form 16 · 2025-26 · filed'],
  [2, 'Gap · Axis statement', 'Jay sent 4 statements last year, 3 now'],
  [3, 'Reminder · Jay Teli', 'WhatsApp reminder sent: Axis statement'],
  [0, 'Intake · Tally export', 'Tally_LedgerHackers.xlsx via email'],
  [1, 'Review · 35%', 'Needs a CA: personal or company?'],
  [0, 'Intake · Sales invoices', 'Tanuj Maniyar sent 3 GST files'],
  [4, 'Filing prep · GST Q3', 'GST Q3 for Tanuj ready for Chetanya'],
  [5, 'Delivered · GST24Q3TM7821', 'Acknowledgement sent to Tanuj Maniyar'],
  [3, 'Escalated · 1 day left', 'ITR due tomorrow, Chetanya to call'],
];
const APPROVALS = ['Tally_LedgerHackers.xlsx belongs to Ledger Hackers Pvt Ltd?', 'File GST Q3 for Tanuj Maniyar on the portal?', 'Send the ITR acknowledgement to Jay Teli?'];

// Runs `draw` every frame while the element is on screen; draws once and stops for reduced motion
export function useCanvas(ref, draw) {
  useEffect(() => {
    const c = ref.current, ctx = c.getContext('2d'), dpr = Math.min(devicePixelRatio || 1, 1.5);
    const size = () => { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf, on = false, t0 = performance.now();
    const loop = now => { draw.current(ctx, c.clientWidth, c.clientHeight, (now - t0) / 1000); if (on && !still) raf = requestAnimationFrame(loop); };
    const io = new IntersectionObserver(([e]) => { on = e.isIntersecting; cancelAnimationFrame(raf); if (on) raf = requestAnimationFrame(loop); });
    io.observe(c);
    const ro = new ResizeObserver(() => { size(); loop(performance.now()); });
    ro.observe(c);
    return () => { io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); };
  }, [ref, draw]);
}

export default function Engine() {
  const root = useRef(), strands = useRef(), wave = useRef();
  const [tick, setTick] = useState(0);
  const [toasts, setToasts] = useState([]);
  const seq = useRef(0);
  const [clock, setClock] = useState('');
  const live = useRef({ samples: Array.from({ length: 42 }, (_, i) => .25 + .2 * Math.sin(i * .7)), tags: [], shift: 0 });
  const ev = FEED[tick % FEED.length], active = ev[0];

  // One heartbeat drives the feed: new event, waveform sample, toast
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setTick(k => k + 1), 1800);
    const c = setInterval(() => setClock(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false })), 1000);
    return () => { clearInterval(id); clearInterval(c); };
  }, []);
  useEffect(() => {
    const L = live.current;
    L.samples.push(.3 + Math.random() * .55);
    L.tags.push({ i: L.samples.length - 1, text: ev[1] });
    if (L.samples.length > 60) { L.samples.shift(); L.tags.forEach(g => g.i--); }
    L.tags = L.tags.filter(g => g.i > 0);
    L.shift = 1; // glide the new sample in
    setToasts(ts => [...ts.slice(-1), { id: ++seq.current, text: ev[2] }]);
  }, [tick]); // eslint-disable-line react-hooks/exhaustive-deps

  const drawS = useRef(), drawW = useRef();
  drawS.current = (ctx, w, h, t) => drawStrands(ctx, w, h, t, AGENTS, active);
  drawW.current = (ctx, w, h) => {
    const L = live.current, from = L.samples.length - 41;
    L.shift = Math.max(0, L.shift - .03);
    drawTimeline(ctx, w, h, L.samples.slice(from), L.tags.map(g => ({ ...g, i: g.i - from })), L.shift);
  };
  useCanvas(strands, drawS);
  useCanvas(wave, drawW);

  // The monitor tilts back like a curved screen and settles flat as it scrolls in
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.eng-screen', { rotateX: 22, scale: .86, y: 60 }, { rotateX: 0, scale: 1, y: 0, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'top 15%', scrub: true } });
      gsap.from('.eng-head>*', { y: 50, autoAlpha: 0, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.eng-head', start: 'top 80%' } });
    });
    return () => mm.revert();
  }, { scope: root });

  const docs = 412 + tick * 3, auto = 86 + (tick % 5);
  return (
    <section ref={root} id="engine" className="eng-sec">
      <div className="wrap eng-head">
        <span className="eyebrow glass-lite">Engine room</span>
        <h2 className="h2">Six agents. One ledger.<br /><span className="dim">Running 24/7.</span></h2>
        <p className="lede">Every file answered. Every gap chased. A CA steps in only when something needs a yes.</p>
      </div>
      <div className="eng-stage">
        <div className="eng-screen" role="img" aria-label="Simulated live console of the six Ledger Hackers agents processing documents">
          <header className="eng-top">
            <b>LEDGER ENGINE</b><span className="eng-live">● LIVE · SIMULATED FEED</span>
            <span>LOOP <em>{14 + Math.floor(tick / 6)}</em></span><span>TASKS <em>{docs}</em></span><span>IST <em>{clock || '--:--:--'}</em></span>
          </header>
          <div className="eng-main">
            <ol className="eng-agents">
              {AGENTS.map((a, i) => (
                <li key={a} className={i === active ? 'on' : ''}><b>{String(i + 1).padStart(2, '0')} {a}</b><small>{i === active ? ev[1] : NOTES[i]}</small></li>
              ))}
            </ol>
            <div className="eng-core">
              <canvas ref={strands} aria-hidden="true" />
              <div className="eng-toasts" aria-live="off">
                {toasts.map(t => <div key={t.id} className="eng-toast">{t.text}</div>)}
              </div>
            </div>
            <aside className="eng-side">
              <div className="eng-kpi"><small>Documents filed today</small><b>{docs}</b><i>+{3 + (tick % 4)} last minute</i></div>
              <div className="eng-grid">
                <div><small>Auto-filed</small><b>{auto}%</b></div><div><small>Reminders</small><b>{38 + tick}</b></div>
                <div><small>Needs review</small><b>{3 + (tick % 3)}</b></div><div><small>Delivered</small><b>{21 + Math.floor(tick / 2)}</b></div>
              </div>
              <div className="eng-approve">
                <small>Approval queue</small><b>YOU APPROVE. <span>IT FILES.</span></b>
                <p key={tick % 3}>{APPROVALS[Math.floor(tick / 3) % APPROVALS.length]}</p>
                <span className={`eng-chip ${tick % 3 === 2 ? 'ok' : ''}`}>{tick % 3 === 2 ? 'Approved ✓' : 'Awaiting CA'}</span>
              </div>
            </aside>
          </div>
          <div className="eng-wave"><canvas ref={wave} aria-hidden="true" /></div>
          <div className="eng-ticker" aria-hidden="true"><div>
            {Array.from({ length: 2 }, (_, k) => <span key={k}>YOU DON&rsquo;T HAVE A PAPERWORK PROBLEM · YOU HAVE A COLLECTION PROBLEM · SIX AGENTS · ONE LEDGER · RUNNING 24/7 · ZERO CHASING ·&nbsp;</span>)}
          </div></div>
        </div>
      </div>
      <style>{`
        .eng-sec{padding:clamp(100px,14vh,180px) 0 clamp(60px,10vh,120px)}
        .eng-head{display:flex;flex-direction:column;align-items:flex-start;gap:22px;margin-bottom:56px}
        .eng-stage{perspective:1600px;padding:0 max(12px,calc((100vw - 1320px)/2))}
        .eng-screen{position:relative;transform-origin:50% 100%;border-radius:22px;overflow:hidden;font-family:var(--mono);color:#cfe0ff;
          background:linear-gradient(180deg,#0b1736,#081028 60%,#060b1c);box-shadow:0 0 0 1px rgba(127,176,255,.25),0 0 0 10px #05070d,0 0 0 11px rgba(255,255,255,.08),0 60px 120px -30px rgba(40,90,255,.45)}
        .eng-screen::after{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(130% 90% at 50% 50%,transparent 60%,rgba(0,0,0,.45)),repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px)}
        .eng-top{display:flex;flex-wrap:wrap;gap:6px 22px;align-items:center;padding:12px 18px;border-bottom:1px solid rgba(127,176,255,.18);font-size:11px;letter-spacing:.08em;color:#8aa3d6}
        .eng-top b{color:#fff;font-size:14px;letter-spacing:.14em}.eng-top em{font-style:normal;color:#e9f2ff;margin-left:6px}
        .eng-live{color:#ff7a8a}
        .eng-main{display:grid;grid-template-columns:220px minmax(0,1fr) 260px;min-height:clamp(380px,46vw,560px)}
        .eng-agents{list-style:none;padding:16px;display:flex;flex-direction:column;gap:6px;border-right:1px solid rgba(127,176,255,.14)}
        .eng-agents li{padding:9px 10px;border-radius:8px;transition:background-color .5s var(--out),box-shadow .5s var(--out)}
        .eng-agents li b{display:block;font-size:11.5px;letter-spacing:.06em;color:#dbe7ff}
        .eng-agents li small{display:block;font-size:10.5px;color:#7f93bf;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .eng-agents li.on{background:rgba(76,141,255,.16);box-shadow:inset 2px 0 0 #7fd8ff}
        .eng-agents li.on small{color:#9fe3ff}
        .eng-core{position:relative}
        .eng-core canvas,.eng-wave canvas{position:absolute;inset:0;width:100%;height:100%}
        .eng-toasts{position:absolute;right:14px;bottom:14px;display:flex;flex-direction:column;gap:8px;align-items:flex-end}
        .eng-toast{max-width:260px;padding:9px 12px;border-radius:10px;font-size:11px;line-height:1.4;color:#e9f2ff;background:rgba(10,20,50,.85);box-shadow:inset 0 0 0 1px rgba(127,216,255,.35);animation:toast-in .6s var(--spring) both}
        .eng-toast:not(:last-child){opacity:.45;transform:scale(.96)}
        @keyframes toast-in{from{opacity:0;transform:translateY(14px) scale(.96)}}
        .eng-side{padding:16px;display:flex;flex-direction:column;gap:12px;border-left:1px solid rgba(127,176,255,.14)}
        .eng-side small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7f93bf}
        .eng-kpi b{display:block;font-family:var(--font);font-size:clamp(2rem,3.4vw,2.8rem);font-weight:600;letter-spacing:-.03em;color:#fff;font-variant-numeric:tabular-nums}
        .eng-kpi i{font-style:normal;font-size:11px;color:#4ade80}
        .eng-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
        .eng-grid div{padding:9px;border-radius:8px;background:rgba(76,141,255,.08);box-shadow:inset 0 0 0 1px rgba(127,176,255,.15)}
        .eng-grid b{font-family:var(--font);font-size:20px;color:#fff;font-variant-numeric:tabular-nums}
        .eng-approve{padding:12px;border-radius:10px;background:rgba(76,141,255,.08);box-shadow:inset 0 0 0 1px rgba(127,176,255,.2)}
        .eng-approve b{display:block;margin:4px 0 8px;font-size:13px;letter-spacing:.06em;color:#fff}.eng-approve b span{color:#7fd8ff}
        .eng-approve p{font-size:11px;line-height:1.45;color:#cfe0ff;animation:toast-in .5s var(--spring) both}
        .eng-chip{display:inline-block;margin-top:8px;padding:3px 8px;border-radius:6px;font-size:10px;letter-spacing:.06em;background:rgba(255,181,71,.15);color:#ffcf7a}
        .eng-chip.ok{background:rgba(74,222,128,.15);color:#4ade80}
        .eng-wave{position:relative;height:96px;border-top:1px solid rgba(127,176,255,.18)}
        .eng-ticker{overflow:hidden;border-top:1px solid rgba(127,176,255,.18);font-size:10.5px;letter-spacing:.14em;color:#8aa3d6;padding:8px 0}
        .eng-ticker div{display:flex;width:max-content;animation:ticker 40s linear infinite}
        @keyframes ticker{to{transform:translateX(-50%)}}
        @media (max-width:980px){.eng-main{grid-template-columns:1fr}.eng-agents{flex-direction:row;overflow-x:auto;border-right:0;border-bottom:1px solid rgba(127,176,255,.14)}
          .eng-agents li{min-width:170px}.eng-core{height:340px}.eng-side{border-left:0;border-top:1px solid rgba(127,176,255,.14)}}
        @media (prefers-reduced-motion:reduce){.eng-ticker div{animation:none}}
      `}</style>
    </section>
  );
}
