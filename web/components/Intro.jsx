'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { finishIntro } from '@/lib/intro';
import { lenis } from '@/lib/smooth';
import HackerMark from './HackerMark';

gsap.registerPlugin(ScrambleTextPlugin, DrawSVGPlugin);

const LEDGER_CHARS = '0123456789₹₹,.DRCR';
const TOKENS = ['DR', 'CR', '₹', 'GST', 'PAN', 'TDS', 'ITR', '26AS', 'AIS'];

// Matrix-style rain, but made of ledger entries: amounts, ₹, DR/CR and tax codes
function startRain(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 1.5);
  const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
  const fs = 14 * dpr, cols = Math.ceil(W / (fs * 1.15));
  const ys = Array.from({ length: cols }, () => Math.random() * -H);
  const speed = Array.from({ length: cols }, () => (.6 + Math.random() * .9) * fs);
  ctx.font = `500 ${fs}px ui-monospace, "SF Mono", Menlo, monospace`;
  let raf, last = 0;
  const draw = t => {
    raf = requestAnimationFrame(draw);
    if (t - last < 33) return; // ~30 fps is plenty for rain
    last = t;
    ctx.fillStyle = 'rgba(5,6,10,.16)';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < cols; i++) {
      const tok = Math.random() < .035;
      const ch = tok ? TOKENS[(Math.random() * TOKENS.length) | 0] : LEDGER_CHARS[(Math.random() * LEDGER_CHARS.length) | 0];
      const x = i * fs * 1.15, y = ys[i];
      ctx.fillStyle = tok ? '#ff4fb0' : 'rgba(150,225,255,.95)';
      ctx.fillText(ch, x, y);
      ctx.fillStyle = 'rgba(58,123,255,.55)';
      ctx.fillText(LEDGER_CHARS[(i + (y | 0)) % LEDGER_CHARS.length], x, y - fs);
      ys[i] = y > H + Math.random() * H ? 0 : y + speed[i];
    }
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

// Right-angle circuit traces radiating from the mark to the screen edges
function useTraces(n = 18) {
  return useMemo(() => Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2 + (i % 2 ? .12 : -.08);
    const r1 = 150 + (i % 3) * 20, r2 = 330 + (i % 4) * 70;
    const x1 = 500 + Math.cos(a) * r1, y1 = 500 + Math.sin(a) * r1;
    const bend = i % 2 ? [500 + Math.cos(a) * (r1 + 70), y1] : [x1, 500 + Math.sin(a) * (r1 + 70)];
    const x2 = 500 + Math.cos(a) * r2, y2 = 500 + Math.sin(a) * r2;
    return { d: `M${x1.toFixed(1)} ${y1.toFixed(1)}L${bend[0].toFixed(1)} ${bend[1].toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`, x2, y2 };
  }), [n]);
}

export default function Intro() {
  const root = useRef(), rain = useRef();
  const [gone, setGone] = useState(false);
  const traces = useTraces();
  const tlRef = useRef();

  useGSAP((ctx, contextSafe) => {
    const html = document.documentElement;
    if (html.classList.contains('no-intro')) { finishIntro(); setGone(true); return; }
    const stopRain = startRain(rain.current);
    const stopScroll = setTimeout(() => lenis?.stop());

    const done = contextSafe(() => {
      stopRain(); clearTimeout(stopScroll);
      try { sessionStorage.setItem('lh-intro', '1'); } catch (e) {}
      html.classList.remove('intro-on');
      lenis?.start();
      finishIntro();
      setGone(true);
    });

    // Where the nav logo sits: the intro collapses into it
    const navMark = document.querySelector('.nav .brand .hm');
    const r = navMark?.getBoundingClientRect();
    const target = r ? `${((r.left + r.width / 2) / innerWidth * 100).toFixed(1)}% ${((r.top + r.height / 2) / innerHeight * 100).toFixed(1)}%` : '50% 50%';

    const glitch = gsap.timeline({ repeat: -1, repeatDelay: .35 })
      .to('.hm-ring-c', { x: () => gsap.utils.random(-6, 6), duration: .06, ease: 'steps(1)' })
      .to('.hm-ring-m', { x: () => gsap.utils.random(-6, 6), duration: .06, ease: 'steps(1)' }, '<')
      .to(['.hm-ring-c', '.hm-ring-m'], { x: 0, duration: .06, ease: 'steps(1)' }, '+=.08');

    const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, onComplete: done });
    tlRef.current = tl;
    tl.fromTo('.intro-rain', { autoAlpha: 0 }, { autoAlpha: .6, duration: 1 }, 0)
      .from('.trace', { drawSVG: '0%', duration: 1.2, stagger: .025, ease: 'power2.inOut' }, .1)
      .from('.node', { scale: 0, transformOrigin: '50% 50%', duration: .5, stagger: .025, ease: 'back.out(3)' }, .7)
      .from('.intro .hm-ring', { scale: .55, rotation: -120, autoAlpha: 0, transformOrigin: '50% 50%', duration: 1.4 }, .45)
      .add(() => root.current.classList.add('is-glitch'), .85)
      .from('.intro .hm-figure', { y: 26, autoAlpha: 0, duration: 1.1 }, .85)
      .add(() => root.current.classList.remove('is-glitch'), 1.35)
      .from('.intro .hm-laptop', { y: 40, autoAlpha: 0, duration: 1 }, 1.1)
      .fromTo('.intro .hm-screenglow', { opacity: 0 }, { opacity: .85, duration: .12, ease: 'none', yoyo: true, repeat: 3 }, 1.5)
      .from('.intro .hm-skull', { scale: 0, transformOrigin: '50% 60%', duration: .7, ease: 'back.out(2.4)' }, 1.75)
      .from('.intro .hm-grin', { drawSVG: '50% 50%', duration: .6, ease: 'power2.out' }, 2)
      .to('.intro-title', { duration: 1.3, scrambleText: { text: 'LEDGER HACKERS', chars: '₹0123456789DRCR#%', revealDelay: .25, speed: .7 } }, 1.55)
      .to('.intro-ledger', { duration: 1.1, scrambleText: { text: 'DR ₹1,84,200.00  =  CR ₹1,84,200.00  ✓ BALANCED', chars: '0123456789₹,.', speed: .9 } }, 2.25)
      .addLabel('exit', 3.6)
      .add(() => root.current.classList.add('is-glitch', 'is-burst'), 'exit-=.3')
      .to(root.current, { clipPath: `circle(0% at ${target})`, duration: 1, ease: 'expo.inOut' }, 'exit')
      .to('.intro-stage', { scale: .2, autoAlpha: 0, duration: .9, ease: 'expo.in' }, 'exit');

    const skip = contextSafe(() => { if (tl.time() < tl.labels.exit - .3) tl.seek('exit-=.3'); });
    const onKey = e => { if (e.key === 'Escape') skip(); };
    addEventListener('keydown', onKey);
    root.current.querySelector('.intro-skip').addEventListener('click', skip);
    return () => { removeEventListener('keydown', onKey); stopRain(); glitch.kill(); };
  }, { scope: root });

  if (gone) return null;
  return (
    <div ref={root} className="intro" role="dialog" aria-modal="true" aria-label="Ledger Hackers intro">
      <canvas ref={rain} className="intro-rain" aria-hidden="true" />
      <svg className="intro-traces" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        {traces.map((t, i) => <path key={i} className="trace" d={t.d} />)}
        {traces.map((t, i) => <circle key={i} className="node" cx={t.x2} cy={t.y2} r="5" />)}
      </svg>
      <div className="intro-stage" aria-hidden="true">
        <HackerMark size={260} className="intro-mark" />
        <div className="intro-title">&nbsp;</div>
        <div className="intro-ledger">&nbsp;</div>
      </div>
      <div className="intro-scan" aria-hidden="true" />
      <button className="intro-skip" autoFocus>Skip intro</button>
      <style>{`
        .intro{position:fixed;inset:0;z-index:100;display:grid;place-items:center;background:#05060a;clip-path:circle(150% at 50% 50%);overflow:hidden}
        .no-intro .intro{display:none}
        .intro-rain{position:absolute;inset:0;width:100%;height:100%;opacity:0}
        .intro-traces{position:absolute;inset:0;width:100%;height:100%}
        .trace{fill:none;stroke:#3a7bff;stroke-width:1.6;opacity:.75;filter:drop-shadow(0 0 4px #3a7bff)}
        .node{fill:#7fd8ff}
        .intro-stage{position:relative;display:flex;flex-direction:column;align-items:center;gap:26px;padding:0 16px;text-align:center}
        .intro-mark{width:min(260px,58vw);height:auto;filter:drop-shadow(0 0 40px rgba(58,123,255,.55))}
        .intro-title{font-family:var(--mono);font-weight:700;font-size:clamp(1.9rem,7vw,4.4rem);letter-spacing:.14em;line-height:1;white-space:nowrap;
          text-shadow:-2px 0 #ff3ea5,2px 0 #3ee8ff,0 0 24px rgba(58,123,255,.6)}
        .intro-ledger{font-family:var(--mono);font-size:clamp(.72rem,2.4vw,.95rem);letter-spacing:.06em;color:#7fd8ff;min-height:1.4em}
        .intro-scan{position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,rgba(255,255,255,.035) 0 1px,transparent 1px 3px);mix-blend-mode:overlay}
        .intro-skip{position:absolute;right:20px;bottom:20px;height:40px;padding:0 18px;border-radius:999px;font-size:13px;color:var(--fg-2);
          background:rgba(255,255,255,.08);box-shadow:inset 0 1px 0 rgba(255,255,255,.25),inset 0 0 0 1px rgba(255,255,255,.08)}
        .intro-skip:hover{color:var(--fg)}
        .is-glitch .intro-mark{animation:glitch .18s steps(2) infinite}
        .is-glitch .intro-title{animation:glitch .22s steps(2) infinite reverse}
        .is-burst .intro-stage{filter:url(#liquid)}
        @keyframes glitch{
          0%{clip-path:inset(0 0 62% 0);transform:translate(-6px,0)}
          25%{clip-path:inset(38% 0 30% 0);transform:translate(7px,0)}
          50%{clip-path:inset(70% 0 4% 0);transform:translate(-4px,0)}
          75%{clip-path:inset(12% 0 55% 0);transform:translate(5px,0)}
          100%{clip-path:inset(0 0 0 0);transform:none}}
      `}</style>
    </div>
  );
}
