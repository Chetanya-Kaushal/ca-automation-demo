'use client';
import { gsap, ScrollTrigger } from './gsap';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';

gsap.registerPlugin(SplitText, ScrambleTextPlugin, DrawSVGPlugin);

// Site-wide motion for every section below the hero (hero, story and the opening animate themselves).
// Headings rise character by character out of word masks, paragraphs line by line, eyebrows scramble in,
// icons draw, list items cascade, buttons are magnetic, section heads drift, headings lean with scroll speed.
const SCOPE = 'main section:not(.hero):not(#story)';
const not = ':not(#day .moment *):not(.fin *)'; // the day reel scrolls sideways and the finale has its own words

export function initMotion() {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const q = s => gsap.utils.toArray(`${SCOPE} ${s}`);
    const enter = el => ({ trigger: el, start: 'top 88%', once: true });

    // headings: characters rise and untilt out of per-word masks
    q(`:is(.h2,.h3)${not}`).forEach(el => {
      // flex headings (icon + title) would turn split words into gapped flex items: lift those whole
      if (getComputedStyle(el).display.includes('flex')) return gsap.from(el, { yPercent: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: enter(el) });
      SplitText.create(el, {
        type: 'words,chars', mask: 'words', autoSplit: true,
        onSplit: s => gsap.from(s.chars, {
          yPercent: 115, rotateX: -80, transformOrigin: '50% 100% -20px', duration: 1.1, ease: 'expo.out',
          stagger: { each: .014, from: 'start' }, scrollTrigger: enter(el),
        }),
      });
    });

    // paragraphs: line by line from under a mask
    q(`:is(.lede,p.dim)${not}`).forEach(el => {
      SplitText.create(el, {
        type: 'lines', mask: 'lines', autoSplit: true,
        onSplit: s => gsap.from(s.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: .08, scrollTrigger: enter(el) }),
      });
    });

    // eyebrows: scramble in like a ledger code resolving
    q(`.eyebrow${not}`).forEach(el => {
      const text = el.textContent;
      gsap.fromTo(el, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .6, ease: 'power3.out', scrollTrigger: enter(el),
        onStart: () => gsap.to(el, { duration: 1.1, scrambleText: { text, chars: '₹0123456789DRCR#%', revealDelay: .2, speed: .6 } }) });
    });

    // icons: their strokes draw on
    q(`svg.i${not}`).forEach(svg => {
      const parts = svg.querySelectorAll('path,line,polyline,polygon,circle,rect');
      if (parts.length) gsap.from(parts, { drawSVG: '0%', duration: 1.2, ease: 'power2.inOut', stagger: .06, scrollTrigger: enter(svg) });
    });

    // list items cascade in
    ScrollTrigger.batch(q(`li${not}:not(.rv):not(.rv *)`), {
      start: 'top 92%', once: true,
      onEnter: els => gsap.from(els, { y: 26, autoAlpha: 0, duration: .9, ease: 'expo.out', stagger: .05 }),
    });

    // section heads drift slower than the page
    q(':is(.bento-head,.eng-head,.pl-head,.sec-head)').forEach(el =>
      gsap.to(el, { yPercent: -12, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } }));

    // headings lean a touch with scroll speed, then settle (critically damped, never wobbles)
    const lean = gsap.utils.toArray(`${SCOPE} .h2`).map(el => gsap.quickTo(el, 'skewY', { duration: .6, ease: 'power3' }));
    const clamp = gsap.utils.clamp(-4, 4);
    ScrollTrigger.create({ onUpdate: s => { const v = clamp(s.getVelocity() / -400); lean.forEach(f => f(v)); } });
    const settle = () => lean.forEach(f => f(0)); // no updates fire once scrolling stops, so straighten up explicitly
    ScrollTrigger.addEventListener('scrollEnd', settle);
    return () => ScrollTrigger.removeEventListener('scrollEnd', settle);
  });

  // magnetic buttons (pointer devices only)
  mm.add('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
    const offs = gsap.utils.toArray('.btn').map(btn => {
      const x = gsap.quickTo(btn, 'x', { duration: .5, ease: 'power3' }), y = gsap.quickTo(btn, 'y', { duration: .5, ease: 'power3' });
      const move = e => { const r = btn.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * .25); y((e.clientY - r.top - r.height / 2) * .35); };
      const leave = () => { x(0); y(0); };
      btn.addEventListener('pointermove', move); btn.addEventListener('pointerleave', leave);
      return () => { btn.removeEventListener('pointermove', move); btn.removeEventListener('pointerleave', leave); };
    });
    return () => offs.forEach(f => f());
  });
  return () => mm.revert();
}
