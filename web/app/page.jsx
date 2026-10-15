'use client';
import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { startSmoothScroll, scrollToHash } from '@/lib/smooth';
import Stage from '@/components/Stage';
import Reveal from '@/components/Reveal';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Story from '@/components/Story';
import Bento from '@/components/Bento';
import DayReel from '@/components/DayReel';
import Engine from '@/components/Engine';
import Pipeline from '@/components/Pipeline';
import Sparks from '@/components/Sparks';
import { Demo, Roadmap, Finale } from '@/components/Sections';

export default function Page() {
  const stage = useRef(), aurora = useRef();
  const [active, setActive] = useState(true);

  useGSAP(() => {
    const stop = startSmoothScroll();
    // The 3D stage lives behind hero + story; after that it fades and stops rendering
    ScrollTrigger.create({
      trigger: '#features', start: 'top 90%', end: 'top 20%', scrub: true,
      onUpdate: s => { gsap.set(stage.current, { opacity: 1 - s.progress }); gsap.set(aurora.current, { opacity: s.progress }); },
      onLeave: () => setActive(false),
      onEnterBack: () => setActive(true),
    });
    // Pinned sections add height after load, so re-aim deep links like /#demo once positions are known
    document.fonts?.ready.then(() => { ScrollTrigger.refresh(); scrollToHash(location.hash); });
    // any laptop: if real frames run long (scrolling over live blur is GPU work), fall back to frosted glass once
    let slow = 0, total = 0, last = 0, raf;
    const watch = t => {
      if (last) { const d = t - last; if (d < 250) { total++; if (d > 28) slow++; } }
      last = t;
      if (total >= 240) { if (slow / total > .2) document.documentElement.classList.add('weak'); slow = total = 0; }
      if (!document.documentElement.classList.contains('weak')) raf = requestAnimationFrame(watch);
    };
    raf = requestAnimationFrame(watch);
    // liquid glass: the light catch on whichever glass surface is under the pointer follows it
    let lit = null;
    const sheen = e => {
      const el = e.target.closest?.('.glass,.glass-lite,.slab');
      if (lit && lit !== el) lit.style.removeProperty('--mx'), lit.style.removeProperty('--my');
      lit = el; if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width * 100).toFixed(1)}%`);
      el.style.setProperty('--my', `${((e.clientY - r.top) / r.height * 100 - 30).toFixed(1)}%`);
    };
    addEventListener('pointermove', sheen, { passive: true });
    return () => { stop(); cancelAnimationFrame(raf); removeEventListener('pointermove', sheen); };
  });

  return (
    <>
      <Reveal />
      <a className="skip" href="#main">Skip to content</a>
      <div ref={stage} className="stage" aria-hidden="true"><Stage active={active} /></div>
      {/* soft colour behind the glass once the 3D stage fades, so every pane has something to refract */}
      <div ref={aurora} className="aurora" aria-hidden="true"><i /><i /><i /><i /></div>
      <Nav />
      <main id="main">
        <Hero />
        <Story />
        <Bento />
        <Engine />
        <Pipeline />
        <Sparks />
        <DayReel />
        <Demo />
        <Roadmap />
        <Finale />
      </main>
      <style>{`
        .stage{position:fixed;inset:0;z-index:0}
        .aurora{position:fixed;inset:0;z-index:0;opacity:0;pointer-events:none;overflow:hidden}
        /* still on purpose: anything moving behind the glass forces every pane to re-blur each frame */
        .aurora i{position:absolute;width:62vmax;height:62vmax;border-radius:50%;opacity:.55}
        .aurora i:nth-child(1){left:-18vmax;top:-12vmax;background:radial-gradient(closest-side,#2b56ff,transparent)}
        .aurora i:nth-child(2){right:-20vmax;top:18vh;background:radial-gradient(closest-side,#7a4dff,transparent)}
        .aurora i:nth-child(3){left:18vw;bottom:-26vmax;background:radial-gradient(closest-side,#0fb3a0,transparent)}
        .aurora i:nth-child(4){right:6vw;bottom:-10vmax;width:38vmax;height:38vmax;background:radial-gradient(closest-side,#ff9a3c,transparent);opacity:.32}
        .skip{position:fixed;left:16px;top:16px;z-index:60;padding:10px 16px;border-radius:999px;background:var(--fg);color:var(--ink);font-size:14px;font-weight:500;transform:translateY(-200%)}
        .skip:focus{transform:none}
      `}</style>
    </>
  );
}
