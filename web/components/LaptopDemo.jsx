'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import Laptop from './Laptop';

// The live demo, running inside a laptop. The lid opens as the section scrolls in (like a product page), then
// the demo app loads on its screen at a 1280px-wide layout (height matched to the glass), scaled to fit.
const DW = 1280;

export default function LaptopDemo() {
  const root = useRef(), [fit, setFit] = useState({ s: .5, h: 828 }), [live, setLive] = useState(false);

  useEffect(() => {
    const el = root.current.querySelector('.mbp-screen');
    const ro = new ResizeObserver(() => { const s = el.clientWidth / DW; setFit({ s, h: Math.round(el.clientHeight / s) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.ld .mbp-lid', { rotateX: -84, filter: 'brightness(.5)' }, { rotateX: 0, filter: 'brightness(1)', ease: 'none',
        scrollTrigger: { trigger: '.ld-stage', start: 'top 85%', end: 'top 25%', scrub: .8 } });
      gsap.fromTo('.ld-head>*', { autoAlpha: 0, y: 24, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', stagger: .12, duration: .9, ease: 'power3.out',
        scrollTrigger: { trigger: '.ld-head', start: 'top 80%' } });
    });
    // load the app only when the laptop is near, so the page stays light
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setLive(true), io.disconnect()), { rootMargin: '400px' });
    io.observe(root.current);
    return () => { io.disconnect(); mm.revert(); };
  }, { scope: root });

  return (
    <section ref={root} id="demo" className="ld">
      <div className="ld-head">
        <span className="ld-eyebrow">Interactive demo</span>
        <h2>Try it. Right here.</h2>
        <p>Pick a scenario: a family upload, a missing document, a deadline. Press process, or switch on Autopilot and watch it decide.</p>
      </div>
      <div className="ld-stage">
        <Laptop>
          <div className="ld-app" style={{ width: DW, height: fit.h, transform: `scale(${fit.s})` }}>
            {live ? <iframe src="/demo?embed=1" title="Ledger Hackers interactive demo" /> : <div className="ld-boot" />}
          </div>
        </Laptop>
      </div>
      <a className="ld-full" href="/demo" target="_blank" rel="noopener">Open the demo full screen ↗</a>
      <style>{`
        .ld{position:relative;padding:clamp(100px,16vh,180px) 24px clamp(80px,12vh,140px);text-align:center;color:#eef5f0;
          background:radial-gradient(70% 50% at 50% 30%,#1f4a30,transparent 70%),linear-gradient(180deg,#2c7f4c 0%,#123522 30%,#08130d 100%)}
        .ld-head{display:grid;justify-items:center;gap:14px;margin-bottom:clamp(40px,7vh,80px)}
        .ld-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.75}
        .ld-head h2{font-size:clamp(36px,6vw,84px);font-weight:600;letter-spacing:-.045em;line-height:1}
        .ld-head p{max-width:52ch;font-size:clamp(15px,1.3vw,19px);opacity:.8}
        .ld-stage{width:min(1080px,92vw);margin:0 auto}
        .ld-app{transform-origin:0 0}
        .ld-app iframe{width:100%;height:100%;border:0;background:#000}
        .ld-boot{width:100%;height:100%;background:radial-gradient(40% 40% at 50% 50%,#132018,#000)}
        .ld-full{display:inline-block;margin-top:clamp(36px,6vh,60px);font-size:14px;opacity:.75;border-bottom:1px solid rgba(255,255,255,.3)}
        .ld-full:hover{opacity:1}
      `}</style>
    </section>
  );
}
