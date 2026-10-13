'use client';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap';

// One shared instance so the menu can pause scrolling and deep links can use it
export let lenis = null;

export function startSmoothScroll() {
  // Phones keep native momentum scrolling; mobile address-bar resizes no longer re-trigger layouts
  ScrollTrigger.config({ ignoreMobileResize: true });
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return () => {};
  lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: true, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = t => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0); // Lenis owns timing; GSAP must not skip ahead
  return () => { gsap.ticker.remove(tick); lenis.destroy(); lenis = null; };
}

export function scrollToHash(hash) {
  const el = hash && document.querySelector(hash);
  if (!el) return;
  lenis ? lenis.scrollTo(el, { immediate: true }) : el.scrollIntoView();
}
