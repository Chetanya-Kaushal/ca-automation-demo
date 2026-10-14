'use client';
import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { drawFibres, drawConfidence } from './engine/draw';
import { useCanvas } from './Engine';

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin, ScrambleTextPlugin);

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
  const root = useRef(), board = useRef(), fib = useRef(), conf = useRef();
  const [ci, setCi] = useState(0);
  const st = useRef({ rgb: CASES[0].rgb, gaps: [] });
  const c = CASES[ci];

  const drawF = useRef(), drawC = useRef();
  drawF.current = (ctx, w, h, t) => drawFibres(ctx, w, h, t, st.current.gaps, st.current.rgb);
  drawC.current = (ctx, w, h, t) => drawConfidence(ctx, w, h, t, st.current.rgb);
  useCanvas(fib, drawF);
  useCanvas(conf, drawC);

  useGSAP((ctx, contextSafe) => {
    const b = board.current;
    // Fibre bundles sit in the gaps between lanes
    const measure = () => {
      const r = b.getBoundingClientRect(), lanes = [...b.querySelectorAll('.pl-lane')].map(l => l.getBoundingClientRect());
      st.current.gaps = lanes.slice(1).map((l, i) => (lanes[i].right + l.left) / 2 - r.left);
    };
    measure();
    const ro = new ResizeObserver(measure); ro.observe(b);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      CASES[0].path.forEach((p, k) => b.querySelectorAll('.pl-lane')[k].querySelectorAll('.pl-card')[p].classList.add('hit'));
      return () => ro.disconnect();
    }
    let i = 0, tl;
    const play = contextSafe(() => {
      const cs = CASES[i];
      st.current.rgb = cs.rgb; root.current.style.setProperty('--c', cs.rgb); setCi(i);
      const r = b.getBoundingClientRect();
      const cards = cs.path.map((p, k) => b.querySelectorAll('.pl-lane')[k].querySelectorAll('.pl-card')[p]);
      const pts = cards.map(el => { const q = el.getBoundingClientRect(); return { l: q.left - r.left, r: q.right - r.left, y: q.top - r.top + q.height / 2 }; });
      // orthogonal connector: out of each card's right edge, across the gap, into the next card
      let d = `M${pts[0].l - 30} ${pts[0].y} H${pts[0].r}`;
      for (let k = 1; k < pts.length; k++) { const mid = (pts[k - 1].r + pts[k].l) / 2; d += ` H${mid} V${pts[k].y} H${pts[k].r}`; }
      const path = b.querySelector('.pl-path'), dot = b.querySelector('.pl-dot'), ring = b.querySelector('.pl-ring');
      path.setAttribute('d', d);
      const last = pts[pts.length - 1];
      tl = gsap.timeline({ onComplete: () => { i = (i + 1) % CASES.length; play(); } })
        .add(() => b.querySelectorAll('.pl-card.hit').forEach(el => el.classList.remove('hit')), 0)
        .to('.pl-case-name', { duration: .6, scrambleText: { text: cs.name.toUpperCase(), chars: '01#%_', speed: .8 } }, 0)
        .to('.pl-route', { duration: .9, scrambleText: { text: cs.route, chars: '01→.', speed: 1 } }, .1)
        .fromTo(path, { drawSVG: '0%', autoAlpha: 1 }, { drawSVG: '100%', duration: 1.8, ease: 'power2.inOut' }, .2)
        .fromTo(dot, { autoAlpha: 1 }, { motionPath: { path, align: path, alignOrigin: [.5, .5] }, duration: 1.8, ease: 'power2.inOut' }, .2);
      cards.forEach((el, k) => tl.add(() => el.classList.add('hit'), .2 + k * .45));
      tl.set(ring, { x: last.r - 30, y: last.y, scale: .2, autoAlpha: 1 }, 2)
        .to(ring, { scale: 1.6, autoAlpha: 0, duration: 1.1, ease: 'expo.out' }, 2)
        .to({}, { duration: 1.6 })
        .to([path, dot], { autoAlpha: 0, duration: .4 });
    });
    play();
    const vis = ScrollTrigger.create({ trigger: root.current, start: 'top bottom', end: 'bottom top', onToggle: s => tl && (s.isActive ? tl.play() : tl.pause()) });
    gsap.from('.pl-head>*', { y: 50, autoAlpha: 0, duration: 1.2, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.pl-head', start: 'top 80%' } });
    return () => { ro.disconnect(); vis.kill(); tl?.kill(); };
  }, { scope: root });

  const decisions = 1610 + ci * 379;
  return (
    <section ref={root} id="pipeline" className="pl-sec" style={{ '--c': CASES[0].rgb }}>
      <div className="wrap pl-head">
        <span className="eyebrow glass-lite">Decision pipeline</span>
        <h2 className="h2">Every file takes<br /><span className="dim">the same four steps.</span></h2>
        <p className="lede">Intake, identify, gate, act. Watch six real cases from our system light up their route.</p>
      </div>
      <div className="wrap">
        <div className="pl-screen" role="img" aria-label={`Decision pipeline animation. Current case: ${c.name}, ${c.route}`}>
          <header className="pl-stats">
            <div><small>Decisions · this run</small><b>{decisions.toLocaleString('en-IN')}</b></div>
            <div><small>Median latency · sim</small><b>~180<span> ms</span></b></div>
            <div><small>Auto-filed</small><b>86%</b></div>
            <div><small>Confidence · live</small><b>{c.conf.toFixed(2)}</b><i className="pl-meter"><span style={{ transform: `scaleX(${c.conf})` }} /><em /></i></div>
          </header>
          <div className="pl-case">
            <span className="pl-badge">CASE {String(ci + 1).padStart(2, '0')} / 06</span>
            <b className="pl-case-name">{CASES[0].name.toUpperCase()}</b>
            <p className="pl-route">{CASES[0].route}</p>
          </div>
          <div ref={board} className="pl-board">
            <canvas ref={fib} className="pl-fib" aria-hidden="true" />
            {LANES.map(([n, name, cards]) => (
              <div key={n} className="pl-lane">
                <h3><span>{n}</span> {name}</h3>
                {cards.map(([t, k1, v1, k2, v2]) => (
                  <div key={t} className="pl-card"><b>{t}</b><dl><dt>{k1}</dt><dd>{v1}</dd><dt>{k2}</dt><dd>{v2}</dd></dl><i /></div>
                ))}
              </div>
            ))}
            <svg className="pl-svg" aria-hidden="true"><path className="pl-path" /><circle className="pl-dot" r="5" /><circle className="pl-ring" r="34" /></svg>
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
        .pl-screen{border-radius:22px;overflow:hidden;background:#07080d;font-family:var(--mono);color:#d6dbe6;box-shadow:0 0 0 1px rgba(255,255,255,.08),0 40px 100px -40px rgba(var(--c),.45);transition:box-shadow .8s var(--out)}
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
        .pl-board{position:relative;display:grid;grid-template-columns:repeat(4,minmax(170px,1fr));gap:56px;padding:18px 18px 22px;overflow-x:auto}
        .pl-fib,.pl-svg{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
        .pl-svg{overflow:visible}
        .pl-lane{position:relative;display:flex;flex-direction:column;gap:10px}
        .pl-lane h3{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#cfd6e4;padding-bottom:8px;border-bottom:1px solid rgba(var(--c),.5)}
        .pl-lane h3 span{color:rgb(var(--c))}
        .pl-card{position:relative;padding:10px 12px;border-radius:10px;background:rgba(18,20,30,.88);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);transition:box-shadow .5s var(--out),background-color .5s var(--out)}
        .pl-card b{font-size:12px;color:#eef1f7}.pl-card b::before{content:"■ ";color:rgba(var(--c),.8);font-size:9px}
        .pl-card dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin-top:6px;font-size:10px}
        .pl-card dt{color:#6e7588}.pl-card dd{text-align:right;color:#aab2c4}
        .pl-card i{display:block;width:30%;height:2px;margin:8px 0 0 auto;border-radius:2px;background:rgba(var(--c),.55)}
        .pl-card.hit{background:rgba(var(--c),.12);box-shadow:inset 0 0 0 1.5px rgb(var(--c)),0 0 24px rgba(var(--c),.55),0 0 60px rgba(var(--c),.25)}
        .pl-path{fill:none;stroke:rgb(var(--c));stroke-width:2.5;filter:drop-shadow(0 0 6px rgb(var(--c)));visibility:hidden}
        .pl-dot{fill:#fff;filter:drop-shadow(0 0 8px rgb(var(--c)));visibility:hidden}
        .pl-ring{fill:none;stroke:rgb(var(--c));stroke-width:2;visibility:hidden}
        .pl-foot{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:18px;padding:14px 18px 18px;border-top:1px solid rgba(255,255,255,.08)}
        .pl-stream canvas{width:100%;height:90px;margin-top:6px}
        .pl-cases{list-style:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;align-content:start}
        .pl-cases li{padding:8px 10px;border-radius:8px;font-size:12px;color:#cfd6e4;background:rgba(255,255,255,.04);transition:background-color .5s,color .5s}
        .pl-cases li small{display:block;font-size:10px;color:#6e7588}
        .pl-cases li.on{background:rgb(var(--k));color:#07080d}.pl-cases li.on small{color:rgba(0,0,0,.6)}
        @media (max-width:900px){.pl-stats{grid-template-columns:1fr 1fr}.pl-foot{grid-template-columns:1fr}.pl-board{grid-template-columns:repeat(4,200px)}}
      `}</style>
    </section>
  );
}
