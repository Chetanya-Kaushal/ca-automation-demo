'use client';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { story } from '@/lib/store';
import { introDone } from '@/lib/intro';
import Icon from './Icon';

// Above the waterline the veil is clipped away; below it, whatever it covers is tinted and blurred like
// something seen through water, fading out with depth.
const ABOVE = 170; // px of veil above the resting waterline, room for crests to climb

export default function Hero() {
  const root = useRef();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, ({ conditions }) => {
      if (!conditions.motion) return;
      const $ = s => root.current.querySelector(s), $$ = s => [...root.current.querySelectorAll(s)];
      const inner = $('.hero-inner'), seaEl = $('.hero-sea'), veil = $('.sea-veil'), foam = $('.sea-foam'), reflect = $('.cta-reflect');
      const foamPaths = [...foam.querySelectorAll('path')], row = $('.hero-sea .cta-row');
      const pieces = $$('.hero .eyebrow, .hero .split-line>span, .hero .lede, .hero-sea .cta-row>*');

      // ── the sea: resting waterline 10px up the buttons, swell + travelling crests on top
      let base = 0, W = 0, fadeAt = 0;
      const place = () => {
        base = seaEl.offsetTop + seaEl.offsetHeight - 6;
        const top = base - ABOVE, h = root.current.offsetHeight - top;
        W = root.current.offsetWidth;
        for (const el of [veil, foam]) Object.assign(el.style, { top: `${top}px`, height: `${h}px` });
        foam.setAttribute('viewBox', `0 0 ${W} ${h}`);
        reflect.style.top = `${base}px`; // mirror line = resting waterline
        // the veil only covers the copy column; beyond it the 3D water takes over
        const r = Math.max(...$$('.hero .lede, .hero-sea .cta-row>*').map(el => el.offsetLeft + el.offsetWidth + (el.closest('.cta-row') ? row.offsetLeft : 0)));
        fadeAt = Math.min(W, r + inner.offsetLeft + 60);
        const m = `linear-gradient(to right,#000 ${fadeAt}px,transparent ${fadeAt + 220}px)`;
        for (const el of [veil, foam]) { el.style.webkitMaskImage = m; el.style.maskImage = m; }
      };
      place(); addEventListener('resize', place);

      let crest = null, nextCrest = 0, slapped = false;
      const height = (x, t) => { // px the water stands above its resting line at x
        let h = 3.5 * Math.sin(x * .011 - t * 1.7) + 2.5 * Math.sin(x * .027 + t * 2.3) + 1.5 * Math.sin(x * .061 - t * 3.1);
        const c = crest?.live; if (c) { const d = (x - c.x) / c.w; h += c.a * Math.exp(-d * d) * (d < 0 ? 1 : .8 + .2 * Math.cos(d * 3)); }
        return h;
      };
      const sea = () => {
        if (story.hero > .6 || document.hidden) return;
        const t = gsap.ticker.time;
        // a crest rolls across the copy every few seconds: small ones swamp the buttons, big ones reach the lede
        if (!crest && t > nextCrest && settled) {
          const big = Math.random() < .3;
          crest = { t0: t, dur: 2.2 + Math.random() * .8, a: big ? 95 + Math.random() * 45 : 34 + Math.random() * 36, w: 150 + Math.random() * 90, x: -300 };
          slapped = false;
        }
        if (crest) {
          const k = (t - crest.t0) / crest.dur;
          if (k >= 1) { crest = null; /* spent */ nextCrest = t + 2.2 + Math.random() * 3; }
          else {
            crest.x = -300 + (fadeAt + 500) * k;
            const rise = Math.sin(Math.PI * Math.min(1, k * 1.15)); // builds, breaks, spends itself
            crest.cur = crest.a * rise;
            const live = crest.live = { x: crest.x, w: crest.w, a: crest.cur };
            // spray where the crest breaks, read by the 3D water (screen px)
            if (Math.random() < gsap.ticker.deltaRatio() * .25 && crest.x > 0 && crest.x < fadeAt) {
              const r = root.current.getBoundingClientRect();
              (story.splashes ||= []).push({ x: r.left + crest.x, y: r.top + base - live.a * .5, w: crest.w, k: Math.min(1.6, live.a / 70) });
            }
            const b = row.getBoundingClientRect(), rr = root.current.getBoundingClientRect();
            if (!slapped && live.a > 30 && Math.abs(crest.x - (b.left - rr.left + b.width / 2)) < b.width / 2) {
              slapped = true; gsap.to(row, { rotate: (Math.random() - .5) * 1.6, y: '-=2', duration: .4, ease: 'power2.out', yoyo: true, repeat: 1 });
            }
          }
        }
        const H = x => height(x, t);
        // waterline polygon for the veil, polyline for the foam
        let poly = '', line = '';
        const n = Math.max(24, Math.round(Math.min(W, fadeAt + 240) / 22));
        for (let i = 0; i <= n; i++) {
          const x = (Math.min(W, fadeAt + 240) * i) / n, y = ABOVE - H(x);
          poly += `${x.toFixed(1)}px ${y.toFixed(1)}px,`; line += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
        }
        veil.style.clipPath = `polygon(${poly}${W}px ${ABOVE - H(W)}px,${W}px 100%,0 100%)`;
        foamPaths.forEach(p => p.setAttribute('d', line));
        // the reflection hides while the buttons are under a crest
        const cx = row.offsetLeft + inner.offsetLeft + row.offsetWidth / 2;
        reflect.style.opacity = String(Math.max(0, 1 - Math.max(0, H(cx) - 6) / 40));
        // gentle lapping along the buttons, and spray where pieces cross the line during the entrance
        const y = root.current.getBoundingClientRect().top + base;
        if (settled) story.wl = { y, k: .12, segs: $$('.hero-sea .cta-row>*').map(el => { const r = el.getBoundingClientRect(); return [r.left, r.right]; }) };
      };
      let settled = false;
      gsap.ticker.add(sea);

      // ── entrance: the whole copy rises up out of the water, spray where each piece breaks the surface
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' }, delay: .15, paused: true });
      introDone.then(() => tl.play());
      const disp = $('#surface feDisplacementMap'), turb = $('#surface feTurbulence'), wave = { s: 46, f: .02 };
      let lastY = 0;
      tl.fromTo(inner, { y: () => inner.offsetHeight + 60 }, { y: 0, duration: 3, ease: 'power3.out',
          onUpdate() {
            const y = gsap.getProperty(inner, 'y'), line = root.current.getBoundingClientRect().top + base, segs = [];
            for (const el of pieces) { const r = el.getBoundingClientRect(); if (r.top < line && r.bottom > line - 6 && r.width) segs.push([r.left, r.right]); }
            story.wl = { y: line, segs, k: Math.min(1.6, Math.abs(lastY - y) / 6 + .25) }; lastY = y;
          } }, 0)
        .set(inner, { filter: 'url(#surface)' }, 0)
        .to(wave, { s: 0, f: .006, duration: 2.8, ease: 'power3.out',
          onUpdate: () => { disp.setAttribute('scale', wave.s.toFixed(2)); turb.setAttribute('baseFrequency', `${wave.f.toFixed(4)} ${(wave.f * 5).toFixed(4)}`); },
          onComplete: () => gsap.set(inner, { clearProps: 'filter' }) }, 0)
        .from('.hero .eyebrow', { y: 16, autoAlpha: 0, duration: 1 }, .2)
        .from('.hero .split-line>span', { yPercent: 115, rotate: 3, duration: 1.6, stagger: .12 }, .35)
        .from('.hero .lede', { y: 24, autoAlpha: 0, duration: 1.2 }, 1)
        .from('.hero-sea .cta-row>*', { y: 20, autoAlpha: 0, duration: 1, stagger: .08 }, 1.3)
        .from('.hero .cue', { autoAlpha: 0, duration: 1 }, 2.4)
        .eventCallback('onComplete', () => { // every entrance tween done: now the buttons float
          settled = true; nextCrest = gsap.ticker.time + .8;
          gsap.to(row, { y: 3, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          gsap.to(reflect, { y: -3, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
          gsap.set(reflect, { visibility: 'visible' });
        });

      // Scroll away: text lifts and fades, camera rises (read by the 3D rig)
      gsap.to('.hero-inner', {
        yPercent: -18, autoAlpha: 0, ease: 'none',
        scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true, onUpdate: s => (story.hero = s.progress) },
      });
      return () => { gsap.ticker.remove(sea); removeEventListener('resize', place); story.wl = null; };
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} className="hero" id="top">
      <div className="hero-sea">
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
      </div>
      <div className="cta-reflect wrap" aria-hidden="true" inert>
        <div className="cta-row">
          <span className="btn btn-solid">See how it works<span className="knob"><Icon name="arrow" size={16} stroke={1.6} /></span></span>
          <span className="btn btn-glass glass">Open the staff app<span className="knob"><Icon name="up" size={16} stroke={1.6} /></span></span>
        </div>
      </div>
      <div className="sea-veil" aria-hidden="true" />
      <svg className="sea-foam" aria-hidden="true" preserveAspectRatio="none">
        <path className="glow" /><path className="edge" />
      </svg>
      <div className="cue" aria-hidden="true"><span /></div>
      <svg className="sr-filter" width="0" height="0" aria-hidden="true">
        <filter id="surface" x="-5%" y="-20%" width="110%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency=".02 .1" numOctaves="2" seed="7" />
          <feDisplacementMap in="SourceGraphic" scale="46" xChannelSelector="R" yChannelSelector="G" />
        </filter>
        <filter id="wobble" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency=".006 .11" numOctaves="2" seed="2">
            <animate attributeName="baseFrequency" dur="5s" values=".006 .11;.009 .14;.006 .11" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <style>{`
        .hero{position:relative;overflow:hidden;min-height:100vh;min-height:100dvh;display:flex;align-items:flex-end;padding:140px 0 clamp(64px,10vh,120px)}
        .hero-sea{position:relative;width:100%}
        .hero-inner{display:flex;flex-direction:column;align-items:flex-start;gap:28px}
        .hero h1 em{font-style:normal;color:transparent;-webkit-text-stroke:1.2px rgba(255,255,255,.85)}
        /* the water body over the copy: clipped to the live waterline, tints and blurs what it covers */
        .sea-veil,.sea-foam{position:absolute;left:0;width:100%;pointer-events:none;z-index:2}
        .sea-veil{clip-path:polygon(0 ${ABOVE}px,100% ${ABOVE}px,100% 100%,0 100%);
          background:linear-gradient(to bottom,rgba(12,18,36,.32) 0,rgba(12,18,36,.5) ${ABOVE}px,rgba(7,10,20,.94) ${ABOVE + 120}px,#05070c ${ABOVE + 260}px);
          -webkit-backdrop-filter:blur(2.5px) saturate(.7) brightness(.85);backdrop-filter:blur(2.5px) saturate(.7) brightness(.85)}
        .sea-foam{overflow:visible}
        .sea-foam path{fill:none;stroke-linejoin:round;stroke-linecap:round}
        .sea-foam .edge{stroke:rgba(228,240,255,.6);stroke-width:1.6}
        .sea-foam .glow{stroke:rgba(200,225,255,.12);stroke-width:7}
        .cta-reflect{position:absolute;left:0;right:0;z-index:3;pointer-events:none;visibility:hidden;opacity:0}
        .cta-reflect .cta-row{margin:0;transform:scaleY(-1);filter:url(#wobble) blur(.6px);opacity:.3;
          -webkit-mask-image:linear-gradient(to top,#000,transparent 85%);mask-image:linear-gradient(to top,#000,transparent 85%)}
        .sr-filter{position:absolute;width:0;height:0;pointer-events:none}
        .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
        .cue{position:absolute;left:50%;bottom:28px;z-index:3;width:22px;height:36px;margin-left:-11px;border-radius:12px;box-shadow:inset 0 0 0 1.25px rgba(255,255,255,.35)}
        .cue span{position:absolute;left:50%;top:8px;width:3px;height:7px;margin-left:-1.5px;border-radius:2px;background:var(--fg);animation:cue 2.2s var(--spring) infinite}
        @keyframes cue{0%{transform:translateY(0);opacity:1}70%{transform:translateY(12px);opacity:0}100%{opacity:0}}
        @media (max-width:640px){.cue{display:none}.hero h1 em{-webkit-text-stroke-width:1px}}
        @media (prefers-reduced-motion:reduce){.sea-veil,.sea-foam{display:none}}
      `}</style>
    </section>
  );
}
