'use client';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { story } from '@/lib/store';
import { introDone } from '@/lib/intro';
import Icon from './Icon';

// The water over the copy is painted on a canvas with a feathered edge (no drawn line): below the surface the
// copy fades into dark water, and churned whitewater gathers only where the buttons touch it.
const ABOVE = 170; // px of veil above the resting waterline, room for crests to climb

export default function Hero() {
  const root = useRef();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)' }, ({ conditions }) => {
      if (!conditions.motion) return;
      const $ = s => root.current.querySelector(s), $$ = s => [...root.current.querySelectorAll(s)];
      const inner = $('.hero-inner'), seaEl = $('.hero-sea'), veil = $('.sea-veil'), reflect = $('.cta-reflect');
      const ctx = veil.getContext('2d'), row = $('.hero-sea .cta-row');
      let VH = 0, dpr = 1;
      const pieces = $$('.hero .eyebrow, .hero .split-line>span, .hero .lede, .hero-sea .cta-row>*');

      // ── the sea: resting waterline 10px up the buttons, swell + travelling crests on top
      let base = 0, W = 0, fadeAt = 0;
      const place = () => {
        base = seaEl.offsetTop + seaEl.offsetHeight - 4; // only the bottom few px of the buttons sit in the water
        const top = base - ABOVE; VH = root.current.offsetHeight - top;
        W = root.current.offsetWidth; dpr = Math.min(devicePixelRatio || 1, 1.5);
        Object.assign(veil.style, { top: `${top}px`, height: `${VH}px` });
        veil.width = W * dpr; veil.height = VH * dpr;
        reflect.style.top = `${base}px`; // mirror line = resting waterline
        // the veil only covers the copy column; beyond it the 3D water takes over
        const r = Math.max(...$$('.hero .lede, .hero-sea .cta-row>*').map(el => el.offsetLeft + el.offsetWidth + (el.closest('.cta-row') ? row.offsetLeft : 0)));
        fadeAt = Math.min(W, r + inner.offsetLeft + 60);
        const m = `linear-gradient(to right,#000 ${fadeAt}px,transparent ${fadeAt + 220}px)`;
        veil.style.webkitMaskImage = m; veil.style.maskImage = m;
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
        // now and then a swell rolls across and laps up the buttons, then drains off them
        if (!crest && t > nextCrest && settled) {
          const big = Math.random() < .25;
          crest = { t0: t, dur: 2.4 + Math.random() * .8, a: big ? 30 + Math.random() * 16 : 12 + Math.random() * 12, w: 170 + Math.random() * 90, x: -300 };
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
            if (!slapped && live.a > 18 && Math.abs(crest.x - (b.left - rr.left + b.width / 2)) < b.width / 2) {
              slapped = true; gsap.to(row, { rotate: (Math.random() - .5) * 1.6, y: '-=2', duration: .4, ease: 'power2.out', yoyo: true, repeat: 1 });
            }
          }
        }
        const H = x => height(x, t);
        // water body: drawn only as a blurred shadow of the surface shape, so its edge is feathered, never a line
        const span = Math.min(W, fadeAt + 240), n = Math.max(24, Math.round(span / 20)), OFF = 4000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, VH);
        ctx.save();
        ctx.shadowColor = 'rgba(8,9,12,.82)'; ctx.shadowBlur = 16 * dpr; ctx.shadowOffsetY = OFF * dpr;
        ctx.beginPath(); ctx.moveTo(0, ABOVE - H(0) - OFF);
        for (let i = 1; i <= n; i++) { const x = span * i / n; ctx.lineTo(x, ABOVE - H(x) - OFF); }
        ctx.lineTo(span, VH - OFF); ctx.lineTo(0, VH - OFF); ctx.closePath(); ctx.fill();
        ctx.restore();
        // depth: what sinks further fades out completely
        const deep = ctx.createLinearGradient(0, ABOVE + 20, 0, ABOVE + 200);
        deep.addColorStop(0, 'rgba(6,6,8,0)'); deep.addColorStop(1, 'rgba(6,6,8,.97)');
        ctx.fillStyle = deep; ctx.fillRect(0, ABOVE + 20, span, VH);
        // whitewater churning where each button meets the water (and a little more while a swell breaks on it)
        for (const el of $$('.hero-sea .cta-row>*')) {
          const r = el.getBoundingClientRect(), rr = veil.getBoundingClientRect();
          const x0 = r.left - rr.left - 8, w = r.width + 16, lift = Math.max(0, H(x0 + w / 2) - 2);
          for (let j = 0; j < 22; j++) {
            const u = j / 21, x = x0 + u * w + Math.sin(t * 2.1 + j * 1.9) * 5;
            const y = ABOVE - H(x) + Math.sin(t * 3.3 + j * 2.7) * 2;
            const rx = 10 + 8 * (.5 + .5 * Math.sin(t * 1.7 + j * 3.1)) + lift * .4, ry = 3 + 2 * (.5 + .5 * Math.sin(t * 2.6 + j)) + lift * .12;
            const a = (.14 + .1 * Math.sin(t * 4 + j * 5.3) + Math.min(.25, lift / 80)) * (1 - Math.pow(Math.abs(u - .5) * 2, 4) * .7);
            const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
            g.addColorStop(0, `rgba(235,238,244,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(235,238,244,0)');
            ctx.fillStyle = g; ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
            ctx.beginPath(); ctx.arc(x, y, rx, 0, 7); ctx.fill(); ctx.restore();
          }
        }
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
      <canvas className="sea-veil" aria-hidden="true" />
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
        .sea-veil{position:absolute;left:0;width:100%;pointer-events:none;z-index:2}
        .cta-reflect{position:absolute;left:0;right:0;z-index:3;pointer-events:none;visibility:hidden;opacity:0}
        .cta-reflect .cta-row{margin:0;transform:scaleY(-1);filter:url(#wobble) blur(1px);opacity:.16;
          -webkit-mask-image:linear-gradient(to top,#000,transparent 85%);mask-image:linear-gradient(to top,#000,transparent 85%)}
        .sr-filter{position:absolute;width:0;height:0;pointer-events:none}
        .cta-row{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
        .cue{position:absolute;left:50%;bottom:28px;z-index:3;width:22px;height:36px;margin-left:-11px;border-radius:12px;box-shadow:inset 0 0 0 1.25px rgba(255,255,255,.35)}
        .cue span{position:absolute;left:50%;top:8px;width:3px;height:7px;margin-left:-1.5px;border-radius:2px;background:var(--fg);animation:cue 2.2s var(--spring) infinite}
        @keyframes cue{0%{transform:translateY(0);opacity:1}70%{transform:translateY(12px);opacity:0}100%{opacity:0}}
        @media (max-width:640px){.cue{display:none}.hero h1 em{-webkit-text-stroke-width:1px}}
        @media (prefers-reduced-motion:reduce){.sea-veil{display:none}}
      `}</style>
    </section>
  );
}
