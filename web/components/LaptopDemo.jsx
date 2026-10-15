'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';

// The live demo, running on a real laptop: a 4K still from the same Pexels footage as the film (#4884237),
// with the demo app pinned to its screen at a 1280px-wide layout (height matched to the glass), scaled to fit.
// Screen rectangle measured from the photo: left 17.71%, top 22.97%, right 82.06%, bottom 82.78%.
const DW = 1280;

export default function LaptopDemo() {
  const root = useRef(), [fit, setFit] = useState({ s: .5, h: 828 }), [live, setLive] = useState(false);

  useEffect(() => {
    const el = root.current.querySelector('.ld-screen');
    const ro = new ResizeObserver(() => { const s = el.clientWidth / DW; setFit({ s, h: Math.round(el.clientHeight / s) }); });
    ro.observe(el); return () => ro.disconnect();
  }, []);

  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo('.ld-photo', { scale: .9, y: 60, autoAlpha: .4 }, { scale: 1, y: 0, autoAlpha: 1, ease: 'none',
        scrollTrigger: { trigger: '.ld-stage', start: 'top 90%', end: 'top 30%', scrub: .8 } });
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
        <div className="ld-photo">
          <img src="/media/desk-demo.jpg" alt="" />
          <div className="ld-screen">
            <div className="ld-app" style={{ width: DW, height: fit.h, transform: `scale(${fit.s})` }}>
              {live ? <iframe src="/demo?embed=1" title="Ledger Hackers interactive demo" /> : <div className="ld-boot" />}
            </div>
            <i className="ld-glare" aria-hidden="true" />
          </div>
        </div>
      </div>
      <a className="ld-full" href="/demo" target="_blank" rel="noopener">Open the demo full screen ↗</a>
      <style>{`
        .ld{position:relative;padding:clamp(100px,16vh,180px) 24px clamp(80px,12vh,140px);text-align:center;color:#eef5f0;
          background:radial-gradient(70% 50% at 50% 30%,#1f4a30,transparent 70%),linear-gradient(180deg,#2c7f4c 0%,#123522 30%,#08130d 100%)}
        .ld-head{display:grid;justify-items:center;gap:14px;margin-bottom:clamp(40px,7vh,80px)}
        .ld-eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;opacity:.75}
        .ld-head h2{font-size:clamp(36px,6vw,84px);font-weight:600;letter-spacing:-.045em;line-height:1}
        .ld-head p{max-width:52ch;font-size:clamp(15px,1.3vw,19px);opacity:.8}
        .ld-stage{width:min(1500px,100vw);margin:0 auto}
        .ld-photo{position:relative;border-radius:clamp(0px,2vw,28px);overflow:hidden;box-shadow:0 40px 120px -40px rgba(0,0,0,.7)}
        .ld-photo img{display:block;width:100%;height:auto}
        .ld-screen{position:absolute;left:17.71%;top:22.97%;width:64.35%;height:59.81%;overflow:hidden;background:#000}
        .ld-glare{position:absolute;inset:0;pointer-events:none;background:linear-gradient(118deg,rgba(255,255,255,.12),rgba(255,255,255,.03) 32%,transparent 46%)}
        .ld-app{transform-origin:0 0}
        .ld-app iframe{width:100%;height:100%;border:0;background:#000}
        .ld-boot{width:100%;height:100%;background:radial-gradient(40% 40% at 50% 50%,#132018,#000)}
        .ld-full{display:inline-block;margin-top:clamp(36px,6vh,60px);font-size:14px;opacity:.75;border-bottom:1px solid rgba(255,255,255,.3)}
        .ld-full:hover{opacity:1}
      `}</style>
    </section>
  );
}
