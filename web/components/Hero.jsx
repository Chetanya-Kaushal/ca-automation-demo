'use client';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { story } from '@/lib/store';
import { introDone } from '@/lib/intro';
import Icon from './Icon';

export default function Hero() {
  const root = useRef();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, ({ conditions }) => {
      if (!conditions.motion) return;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .15, paused: true });
      introDone.then(() => tl.play());
      // the text surfaces like the spiral: rises through a waterline while a ripple distortion settles
      const disp = root.current.querySelector('#surface feDisplacementMap'), turb = root.current.querySelector('#surface feTurbulence');
      const wave = { s: 46, f: .02 };
      tl.set('.hero-inner', { filter: 'url(#surface)' })
        .to(wave, { s: 0, f: .006, duration: 2.6, ease: 'power3.out',
          onUpdate: () => { disp.setAttribute('scale', wave.s.toFixed(2)); turb.setAttribute('baseFrequency', `${wave.f.toFixed(4)} ${(wave.f * 5).toFixed(4)}`); },
          onComplete: () => gsap.set('.hero-inner', { clearProps: 'filter' }) }, 0)
        .from('.hero .eyebrow', { y: 16, autoAlpha: 0, duration: 1 }, 0)
        .from('.hero .split-line>span', { yPercent: 115, rotate: 3, duration: 1.6, stagger: .12 }, .25)
        .from('.hero .lede', { y: 24, autoAlpha: 0, duration: 1.2 }, '-=1')
        .from('.hero .cta-row>*', { y: 20, autoAlpha: 0, duration: 1, stagger: .08 }, '-=.9')
        .from('.hero .cue', { autoAlpha: 0, duration: 1 }, '-=.5');
      // Scroll away: text lifts and fades, camera rises (read by the 3D rig)
      gsap.to('.hero-inner', {
        yPercent: -18, autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => (story.hero = s.progress) },
      });
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} className="hero" id="top">
      <div className="hero-inner wrap">
        <span className="eyebrow glass-lite">Document automation for CA firms</span>
        <h1 className="display">
          <span className="split-line"><span>Paperwork</span></span>
          <span className="split-line"><span>that <em>files itself.</em></span></span>
        </h1>
        <p className="lede">Clients send documents on WhatsApp, email or a private link. Ledger Hackers works out whose they are, chases what&rsquo;s missing, and sends back the filed return.</p>
        <div className="cta-row">
          <a className="btn btn-solid" href="#story">See how it works<span className="knob"><Icon name="arrow" size={16} stroke={1.6} /></span></a>
          <a className="btn btn-glass glass" href="/app">Open the staff app<span className="knob"><Icon name="up" size={16} stroke={1.6} /></span></a>
        </div>
      </div>
      <div className="cue" aria-hidden="true"><span /></div>
      <svg className="sr-filter" width="0" height="0" aria-hidden="true">
        <filter id="surface" x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency=".02 .1" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="46" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <style>{`
        .hero{min-height:100vh;min-height:100dvh;display:flex;align-items:flex-end;padding:140px 0 clamp(64px,10vh,120px)}
        .hero-inner{display:flex;flex-direction:column;align-items:flex-start;gap:28px}
        .hero h1 em{font-style:normal;color:transparent;-webkit-text-stroke:1.2px rgba(255,255,255,.85)}
        .sr-filter{position:absolute;width:0;height:0;pointer-events:none}
        .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
        .cue{position:absolute;left:50%;bottom:28px;width:22px;height:36px;margin-left:-11px;border-radius:12px;box-shadow:inset 0 0 0 1.25px rgba(255,255,255,.35)}
        .cue span{position:absolute;left:50%;top:8px;width:3px;height:7px;margin-left:-1.5px;border-radius:2px;background:var(--fg);animation:cue 2.2s var(--spring) infinite}
        @keyframes cue{0%{transform:translateY(0);opacity:1}70%{transform:translateY(12px);opacity:0}100%{opacity:0}}
        @media (max-width:640px){.cue{display:none}.hero h1 em{-webkit-text-stroke-width:1px}}
      `}</style>
    </section>
  );
}
