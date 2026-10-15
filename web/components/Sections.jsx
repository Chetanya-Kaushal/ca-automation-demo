'use client';
import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import Icon from './Icon';

// Shared heavy fade-up for section intros
function useReveal(root) {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.set('.rv', { y: 60, autoAlpha: 0 });
      ScrollTrigger.batch(root.current.querySelectorAll('.rv'), {
        start: 'top 86%',
        onEnter: els => gsap.to(els, { y: 0, autoAlpha: 1, duration: 1.3, stagger: .09, ease: 'expo.out', overwrite: true }),
      });
    });
    return () => mm.revert();
  }, { scope: root });
}

export function Demo() {
  const root = useRef();
  const [live, setLive] = useState(false);
  useReveal(root);
  return (
    <section ref={root} id="demo" className="demo-sec">
      <div className="wrap">
        <div className="sec-head">
          <span className="eyebrow glass-lite">Interactive demo</span>
          <h2 className="h2">Run the whole workflow.<br /><span className="dim">Right here.</span></h2>
          <p className="lede">Three scenarios with sample data: a family upload, a missing document, and a deadline from reminder to delivery. Turn on Autopilot and watch it decide.</p>
        </div>
        <div className="device bezel rv"><div className="core slab">
          {live ? (
            <iframe src="/demo?embed=1" title="Ledger Hackers interactive demo" />
          ) : (
            <button className="device-cover" onClick={() => setLive(true)}>
              <span className="play glass"><svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
              <b>Start the demo</b><span className="dim">Loads the live three-panel workflow</span>
            </button>
          )}
        </div></div>
      </div>
      <style>{`
        .demo-sec{padding:clamp(120px,18vh,200px) 0}
        .sec-head{display:flex;flex-direction:column;align-items:flex-start;gap:22px;margin-bottom:56px}
        .device .core{overflow:hidden;height:min(820px,88dvh);display:grid}
        .device iframe{width:100%;height:100%;border:0;background:#000}
        .device-cover{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;text-align:center;
          background:radial-gradient(60% 60% at 50% 40%,rgba(76,141,255,.25),transparent 70%),radial-gradient(50% 50% at 70% 70%,rgba(155,123,255,.2),transparent 70%)}
        .device-cover b{font-size:24px;font-weight:600;letter-spacing:-.03em}
        .play{width:88px;height:88px;border-radius:50%;display:grid;place-items:center;transition:transform .6s var(--spring)}
        .device-cover:hover .play{transform:scale(1.08)}
        .device-cover:active .play{transform:scale(.96)}
        @media (max-width:760px){.device .core{height:1700px}}
      `}</style>
    </section>
  );
}

const NEXT = [
  ['eye', 'Reads inside the file', 'PAN, name and assessment year read from the document itself, scanned photos included. No more relying on filenames.'],
  ['merge', 'Automatic reconciliation', 'Purchase registers against GSTR-2B, Form 16 against 26AS and AIS. Only the differences reach a person.'],
  ['shield', 'Filing prep with sign-off', 'Return JSON prepared for the GST and ITR utilities. A CA reviews and signs with a DSC before anything is filed.'],
  ['plug', 'Plugs into your stack', 'Tally ledgers in, Drive or SharePoint and your CRM kept in sync. Named staff logins with an audit trail.'],
];

export function Roadmap() {
  const root = useRef();
  useReveal(root);
  return (
    <section ref={root} id="roadmap" className="road">
      <div className="wrap road-grid">
        <div className="road-left">
          <span className="eyebrow glass-lite">Next</span>
          <h2 className="h2">Where it goes<br />from here.</h2>
          <p className="lede">Intake, sorting, learning, reminders and delivery are live. These come next, in build order.</p>
        </div>
        <ol className="road-list">
          {NEXT.map(([ic, t, d], i) => (
            <li key={t} className="rv bezel"><div className="core slab">
              <span className="r-n">{String(i + 1).padStart(2, '0')}</span>
              <div><h3 className="h3"><Icon name={ic} size={22} />{t}</h3><p className="dim">{d}</p></div>
            </div></li>
          ))}
        </ol>
      </div>
      <style>{`
        .road{padding:clamp(80px,12vh,160px) 0}
        .road-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:clamp(32px,6vw,96px);align-items:start}
        .road-left{position:sticky;top:120px;display:flex;flex-direction:column;align-items:flex-start;gap:22px}
        .road-list{list-style:none;display:flex;flex-direction:column;gap:14px}
        .road-list .core{display:grid;grid-template-columns:auto 1fr;gap:24px;padding:30px}
        .r-n{font-family:var(--mono);font-size:13px;color:var(--fg-3);padding-top:6px}
        .road-list h3{display:flex;align-items:center;gap:12px;margin-bottom:10px}
        .road-list p{font-size:15.5px;line-height:1.55}
        @media (max-width:900px){.road-grid{grid-template-columns:1fr}.road-left{position:static}}
      `}</style>
    </section>
  );
}

export function Finale() {
  const root = useRef();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.fin-word', { yPercent: 110 }, { yPercent: 0, duration: 1.4, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: root.current, start: 'top 70%' } });
      gsap.fromTo('.fin-orb', { scale: .6, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'center center', scrub: true } });
      gsap.from('.fin-cta>*', { y: 30, autoAlpha: 0, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.fin-cta', start: 'top 90%' } });
    });
    return () => mm.revert();
  }, { scope: root });
  return (
    <section ref={root} className="finale">
      <div className="fin-orb" aria-hidden="true" />
      <div className="wrap fin-inner">
        <h2 className="display">
          <span className="split-line"><span className="fin-word">Ready when</span></span>
          <span className="split-line"><span className="fin-word">your clients are.</span></span>
        </h2>
        <div className="fin-cta">
          <a className="btn btn-solid" href="/app">Open the staff app<span className="knob"><Icon name="up" size={16} stroke={1.6} /></span></a>
          <a className="btn btn-glass glass" href="#demo">Try the demo<span className="knob"><Icon name="arrow" size={16} stroke={1.6} /></span></a>
        </div>
      </div>
      <footer className="wrap foot">
        <span className="brand-sm"><img src="/favicon.svg" width="28" height="28" alt="" />Ledger Hackers</span>
        <span className="dim">Demo data only. Built on Cloudflare Workers.</span>
      </footer>
      <style>{`
        .finale{position:relative;min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;justify-content:flex-end;padding-top:160px;overflow:hidden}
        .fin-orb{position:absolute;left:50%;top:38%;width:min(1100px,140vw);aspect-ratio:1;margin-left:min(-550px,-70vw);transform-origin:center;border-radius:50%;
          background:radial-gradient(closest-side,rgba(76,141,255,.62),rgba(155,123,255,.34) 45%,rgba(62,224,197,.12) 70%,transparent);pointer-events:none}
        .fin-inner{position:relative;display:flex;flex-direction:column;gap:40px;padding-bottom:120px}
        .fin-cta{display:flex;flex-wrap:wrap;gap:12px}
        .foot{position:relative;display:flex;justify-content:space-between;flex-wrap:wrap;gap:12px;padding-block:28px 40px;border-top:1px solid var(--hair);font-size:13px}
        .brand-sm{display:flex;align-items:center;gap:10px;font-weight:600}
        .brand-sm .mark{width:28px;height:28px;border-radius:50%;display:grid;place-items:center;font-size:10px;font-weight:700;background:linear-gradient(160deg,#fff,#c9d4ff);color:#05060a}
      `}</style>
    </section>
  );
}
