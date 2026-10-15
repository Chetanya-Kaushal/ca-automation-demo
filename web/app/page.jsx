'use client';
import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { startSmoothScroll, scrollToHash } from '@/lib/smooth';
import Stage from '@/components/Stage';
import Intro from '@/components/Intro';
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
  const stage = useRef();
  const [active, setActive] = useState(true);

  useGSAP(() => {
    const stop = startSmoothScroll();
    // The 3D stage lives behind hero + story; after that it fades and stops rendering
    ScrollTrigger.create({
      trigger: '#features', start: 'top 90%', end: 'top 20%', scrub: true,
      onUpdate: s => gsap.set(stage.current, { opacity: 1 - s.progress }),
      onLeave: () => setActive(false),
      onEnterBack: () => setActive(true),
    });
    // Pinned sections add height after load, so re-aim deep links like /#demo once positions are known
    document.fonts?.ready.then(() => { ScrollTrigger.refresh(); scrollToHash(location.hash); });
    return stop;
  });

  return (
    <>
      <Intro />
      <Reveal />
      <a className="skip" href="#main">Skip to content</a>
      <div ref={stage} className="stage" aria-hidden="true"><Stage active={active} /></div>
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
        .skip{position:fixed;left:16px;top:16px;z-index:60;padding:10px 16px;border-radius:999px;background:var(--fg);color:var(--ink);font-size:14px;font-weight:500;transform:translateY(-200%)}
        .skip:focus{transform:none}
      `}</style>
    </>
  );
}
