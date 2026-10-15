'use client';
import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { drawConfidence } from './engine/draw';
import { buildRoute, drawPipeline } from './engine/pipelineDraw';
import { useCanvas } from './Engine';

gsap.registerPlugin(ScrambleTextPlugin);

// [title, key, value, key, value]
const LANES = [
  ['01', 'Intake / Channel', [['whatsapp_media', 'via', 'Cloud API', 'kind', 'pdf · photo'], ['email_attachment', 'via', 'docs@', 'parse', 'mime'], ['upload_link', 'via', 'private link', 'scope', 'one client'], ['deadline_cron', 'runs', '09:00 IST', 'checks', 'open filings'], ['pan_in_name', 'reads', 'filename', 'shape', 'ABCDE1234F'], ['filed_return', 'from', 'CA', 'after', 'portal']]],
  ['02', 'Identify / Client', [['pan_match', 'conf', '0.99', 'source', 'PAN'], ['learned_rule', 'conf', '0.97', 'hits', 'CA taught'], ['name_in_file', 'tokens', 'split', 'group', 'boost'], ['sender_group', 'family', 'company', 'direct', '0.50'], ['uploader_link', 'solo', '0.90', 'group', 'scoped'], ['history_check', 'vs', 'last year', 'diff', 'types']]],
  ['03', 'Gate / Route', [['gate ≥ 0.85', 'pass', 'auto', 'fail', 'review'], ['ambiguous_match', 'gap', '< 0.15', 'cap', '0.35'], ['missing_docs', 'window', '7 · 3 · 1 d', 'then', 'daily'], ['unknown_type', 'cap', '0.60', 'route', 'review'], ['ca_approval', 'who', 'a person', 'always', 'before filing'], ['escalate', 'when', '≤ 1 day', 'to', 'owner CA']]],
  ['04', 'Act / Deliver', [['auto_file', 'into', 'client folder', 'log', 'event'], ['review_queue', 'one tap', 'confirm', 'learns', 'rule'], ['whatsapp_reply', 'says', 'filed ✓', 'plus', 'still needed'], ['reminder_sent', 'via', 'template', 'logs', 'meta reason'], ['call_task', 'for', 'owner CA', 'note', 'client silent'], ['deliver_ack', 'sends', 'return pdf', 'with', 'ack no.']]],
];
// path = card index in each lane
const CASES = [
  { name: 'WhatsApp photo', rgb: '163,255,74', path: [0, 2, 0, 2], conf: .97, route: 'Form16_Jay.pdf → Jay Teli · Form 16 → 0.97 → filed' },
  { name: 'Email triage', rgb: '255,64,96', path: [1, 3, 1, 1], conf: .35, route: 'Tally_LedgerHackers.xlsx → 2 matches → 0.35 → review' },
  { name: 'Upload link', rgb: '62,232,255', path: [2, 4, 0, 0], conf: .9, route: 'Bank_SBI_Tanuj.pdf → Tanuj Maniyar → 0.90 → filed' },
  { name: 'PAN match', rgb: '170,130,255', path: [4, 0, 0, 0], conf: .99, route: '26AS_ABCPK1234K.pdf → Chetanya Kaushal → 0.99 → filed' },
  { name: 'Deadline', rgb: '255,181,71', path: [3, 5, 2, 3], conf: .88, route: 'GST Q3 · Tanuj → ITC summary missing → reminder' },
  { name: 'Delivery', rgb: '255,79,176', path: [5, 2, 4, 5], conf: .95, route: 'GST return Q3 → CA approved → acknowledgement sent' },
];

export default function Pipeline() {
  const root = useRef(), scroller = useRef(), board = useRef(), fib = useRef(), conf = useRef(), counter = useRef();
  const [ci, setCi] = useState(0);
  const st = useRef({ rgb: CASES[0].rgb, gaps: [], route: null, cards: [], decisions: 1610, last: 0, userAt: -1e9 });
  const c = CASES[ci];

  // One frame loop: canvas, card highlights synced to the moving head, live counter, mobile follow-cam
  const drawF = useRef(), drawC = useRef();
  drawF.current = (ctx, w, h, t) => {
    const S = st.current;
    drawPipeline(ctx, w, h, t, S);
    const R = S.route;
    if (R) S.cards.forEach((el, k) => el.classList.toggle('hit', R.alpha > .05 && R.p >= R.at[k]));
    S.decisions += Math.min(.1, t - S.last) * 41; S.last = t;
    if (counter.current) counter.current.textContent = Math.floor(S.decisions).toLocaleString('en-IN');
    const sc = scroller.current;
    if (R && sc.scrollWidth > sc.clientWidth + 4 && performance.now() - S.userAt > 2500) {
      const head = R.pts[Math.min(R.pts.length - 1, Math.floor(R.p * (R.pts.length - 1)))];
      const k = 1 - Math.exp(-Math.min(.1, t - (S.scrollT ?? t)) * 3); S.scrollT = t; // same speed at any refresh rate
      sc.scrollLeft += (head[0] - sc.clientWidth / 2 - sc.scrollLeft) * k;
    }
  };
  drawC.current = (ctx, w, h, t) => drawConfidence(ctx, w, h, t, st.current.rgb);
  useCanvas(fib, drawF);
  useCanvas(conf, drawC);

  useGSAP((ctx, contextSafe) => {
    const b = board.current, S = st.current;
    const lanes = () => [...b.querySelectorAll('.pl-lane')];
    const measure = () => {
      const r = b.getBoundingClientRect(), ls = lanes().map(l => l.getBoundingClientRect());
      S.gaps = ls.slice(1).map((l, i) => (ls[i].right + l.left) / 2 - r.left);
    };
    const routeFor = cs => {
      const r = b.getBoundingClientRect();
      S.cards = cs.path.map((p, k) => lanes()[k].querySelectorAll('.pl-card')[p]);
      const pts = S.cards.map(el => { const q = el.getBoundingClientRect(); return { l: q.left - r.left, r: q.right - r.left, y: q.top - r.top + q.height / 2 }; });
      return Object.assign(buildRoute(pts, S.gaps), { p: 0, alpha: 1, ring: 0 });
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(b);
    const touched = () => (S.userAt = performance.now());
    scroller.current.addEventListener('pointerdown', touched);
    scroller.current.addEventListener('wheel', touched, { passive: true });
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      S.route = Object.assign(routeFor(CASES[0]), { p: 1 });
      return () => ro.disconnect();
    }
    let i = 0, tl;
    const play = contextSafe(() => {
      const cs = CASES[i];
      S.rgb = cs.rgb; root.current.style.setProperty('--c', cs.rgb); setCi(i);
      const R = S.route = routeFor(cs);
      tl = gsap.timeline({ onComplete: () => { i = (i + 1) % CASES.length; play(); } })
        .to('.pl-case-name', { duration: .6, scrambleText: { text: cs.name.toUpperCase(), chars: '01#%_', speed: .8 } }, 0)
        .to('.pl-route', { duration: .9, scrambleText: { text: cs.route, chars: '01→.', speed: 1 } }, .1)
        .to(R, { p: 1, duration: 2.8, ease: 'sine.inOut' }, .15)
        .to(R, { ring: 1, duration: 1.3, ease: 'expo.out' }, 2.95)
        .to({}, { duration: 1.5 })
        .to(R, { alpha: 0, duration: .7, ease: 'sine.in' });
    });
    play();
    const vis = ScrollTrigger.create({ trigger: root.current, start: 'top bottom', end: 'bottom top', onToggle: s => tl && (s.isActive ? tl.play() : tl.pause()) });
    return () => { ro.disconnect(); vis.kill(); tl?.kill(); };
  }, { scope: root });

  return (
    <section ref={root} id="pipeline" className="pl-sec" style={{ '--c': CASES[0].rgb }}>
      <div className="wrap pl-head">
        <span className="eyebrow glass-lite">Decision pipeline</span>
        <h2 className="h2">Every file takes<br /><span className="dim">the same four steps.</span></h2>
        <p className="lede">Intake, identify, gate, act. Watch six real cases from our system light up their route.</p>
      </div>
      <div className="wrap pl-wide">
        <div className="pl-screen" role="img" aria-label={`Decision pipeline animation. Current case: ${c.name}, ${c.route}`}>
          <header className="pl-stats">
            <div><small>Decisions · this run</small><b ref={counter}>1,610</b></div>
            <div><small>Median latency · sim</small><b>~180<span> ms</span></b></div>
            <div><small>Auto-filed</small><b>86%</b></div>
            <div><small>Confidence · live</small><b>{c.conf.toFixed(2)}</b><i className="pl-meter"><span style={{ transform: `scaleX(${c.conf})` }} /><em /></i></div>
          </header>
          <div className="pl-case">
            <span className="pl-badge">CASE {String(ci + 1).padStart(2, '0')} / 06</span>
            <b className="pl-case-name">{CASES[0].name.toUpperCase()}</b>
            <p className="pl-route">{CASES[0].route}</p>
          </div>
          <div ref={scroller} className="pl-board">
            <div ref={board} className="pl-inner">
              <canvas ref={fib} className="pl-fib" aria-hidden="true" />
              {LANES.map(([n, name, cards]) => (
                <div key={n} className="pl-lane">
                  <h3><span>{n}</span> {name}</h3>
                  {cards.map(([t, k1, v1, k2, v2]) => (
                    <div key={t} className="pl-card"><b>{t}</b><dl><dt>{k1}</dt><dd>{v1}</dd><dt>{k2}</dt><dd>{v2}</dd></dl><i /></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
          <footer className="pl-foot">
            <div className="pl-stream"><small>Confidence stream · sim</small><canvas ref={conf} aria-hidden="true" /></div>
            <ol className="pl-cases">{CASES.map((x, k) => <li key={x.name} className={k === ci ? 'on' : ''} style={{ '--k': x.rgb }}><small>{String(k + 1).padStart(2, '0')}</small>{x.name}</li>)}</ol>
          </footer>
        </div>
      </div>
      <style>{`
        .pl-sec{padding:clamp(80px,12vh,160px) 0}
        .pl-head{display:flex;flex-direction:column;align-items:flex-start;gap:22px;margin-bottom:48px}
        .pl-screen{border-radius:22px;overflow:hidden;background:rgba(7,8,13,.5);-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);font-family:var(--mono);color:#d6dbe6;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 40px 100px -40px rgba(var(--c),.45);transition:box-shadow .8s var(--out)}
        .pl-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border-bottom:1px solid rgba(255,255,255,.08)}
        .pl-stats>div{padding:14px 18px;border-right:1px solid rgba(255,255,255,.06)}
        .pl-stats small,.pl-stream small{display:block;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#7c8396}
        .pl-stats b{font-size:clamp(1.5rem,2.6vw,2.2rem);font-weight:700;color:#fff;font-variant-numeric:tabular-nums}
        .pl-stats b span{font-size:.45em;color:#9aa3b5}
        .pl-stats>div:last-child b{color:rgb(var(--c))}
        .pl-meter{display:block;position:relative;height:4px;margin-top:6px;background:rgba(255,255,255,.08);border-radius:2px}
        .pl-meter span{position:absolute;inset:0;transform-origin:left;background:rgb(var(--c));border-radius:2px;transition:transform .8s var(--out)}
        .pl-meter em{position:absolute;left:85%;top:-3px;width:2px;height:10px;background:#fff}
        .pl-case{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 14px;padding:16px 18px 6px}
        .pl-badge{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:700;color:#07080d;background:rgb(var(--c))}
        .pl-case-name{font-size:clamp(1.1rem,2.4vw,1.7rem);letter-spacing:.06em;color:#fff}
        .pl-route{width:100%;font-size:12px;color:#aab2c4;min-height:1.4em}
        .pl-board{overflow-x:auto;scrollbar-width:none;overscroll-behavior-x:contain}.pl-board::-webkit-scrollbar{display:none}
        .pl-inner{position:relative;display:grid;grid-template-columns:repeat(4,minmax(190px,1fr));gap:64px;padding:18px 22px 26px;min-width:100%;width:max-content}
        .pl-fib{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
        .pl-lane{position:relative;display:flex;flex-direction:column;gap:10px}
        .pl-lane h3{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#cfd6e4;padding-bottom:8px;border-bottom:1px solid rgba(var(--c),.5)}
        .pl-lane h3 span{color:rgb(var(--c))}
        .pl-card{position:relative;transition:background-color .5s cubic-bezier(.2,0,0,1);padding:10px 12px;border-radius:10px;background:rgba(18,20,30,.36);-webkit-backdrop-filter:blur(14px) saturate(180%);backdrop-filter:blur(14px) saturate(180%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);transition:box-shadow .5s var(--out),background-color .5s var(--out)}
        .pl-card b{font-size:12px;color:#eef1f7}.pl-card b::before{content:"■ ";color:rgba(var(--c),.8);font-size:9px}
        .pl-card dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin-top:6px;font-size:10px}
        .pl-card dt{color:#6e7588}.pl-card dd{text-align:right;color:#aab2c4}
        .pl-card i{display:block;width:30%;height:2px;margin:8px 0 0 auto;border-radius:2px;background:rgba(var(--c),.55)}
        .pl-card{z-index:1}
        .pl-card.hit{background:rgba(var(--c),.18);animation:pl-in .55s cubic-bezier(.2,0,0,1) both,pl-breathe 2s ease-in-out .55s infinite}
        .pl-card.hit b{color:#fff;text-shadow:0 0 12px rgb(var(--c))}
        @keyframes pl-in{from{box-shadow:inset 0 0 0 1px rgba(255,255,255,.07),0 0 0 0 rgba(var(--c),0),0 0 0 0 rgba(var(--c),0)}
          to{box-shadow:inset 0 0 0 2px rgb(var(--c)),0 0 22px 3px rgba(var(--c),.8),0 0 70px 12px rgba(var(--c),.38)}}
        @keyframes pl-breathe{
          0%,100%{box-shadow:inset 0 0 0 2px rgb(var(--c)),0 0 22px 3px rgba(var(--c),.8),0 0 70px 12px rgba(var(--c),.38)}
          50%{box-shadow:inset 0 0 0 2px rgb(var(--c)),0 0 34px 7px rgba(var(--c),1),0 0 120px 26px rgba(var(--c),.5)}}
        .pl-foot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;padding:14px 18px 18px;border-top:1px solid rgba(255,255,255,.08)}
        .pl-stream canvas{width:100%;height:90px;margin-top:6px}
        .pl-cases{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-content:start}
        .pl-cases li{padding:8px 10px;border-radius:8px;font-size:12px;color:#cfd6e4;background:rgba(255,255,255,.04);transition:background-color .5s,color .5s}
        .pl-cases li small{display:block;font-size:10px;color:#6e7588}
        .pl-cases li.on{background:rgb(var(--k));color:#07080d}.pl-cases li.on small{color:rgba(0,0,0,.6)}
        @media (max-width:900px){.pl-stats{grid-template-columns:1fr 1fr}.pl-foot{grid-template-columns:1fr}}
        @media (max-width:760px){
          .pl-wide{width:100%}.pl-screen{border-radius:0}
          .pl-inner{grid-template-columns:repeat(4,82vw);gap:44px;padding:20px 9vw 28px}
          .pl-lane h3{font-size:13px}.pl-card{padding:14px 16px}.pl-card b{font-size:15px}.pl-card dl{font-size:12.5px}
          .pl-case-name{font-size:1.5rem}.pl-route{font-size:13px}.pl-stats b{font-size:1.9rem}
        }
        @media (prefers-reduced-motion:reduce){.pl-card.hit{animation:none;box-shadow:inset 0 0 0 2px rgb(var(--c)),0 0 20px rgba(var(--c),.7)}}
      `}</style>
    </section>
  );
}
