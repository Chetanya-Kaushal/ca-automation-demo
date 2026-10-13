'use client';
import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import Nav from '@/components/Nav';
import Hero from '@/components/Hero';
import Story from '@/components/Story';
import Bento from '@/components/Bento';
import DayReel from '@/components/DayReel';
import { Demo, Roadmap, Finale } from '@/components/Sections';

// WebGL only in the browser
const Scene = dynamic(() => import('@/components/Scene'), { ssr: false });

export default function Page() {
  const stage = useRef();
  const [active, setActive] = useState(true);

  useGSAP(() => {
    gsap.from(stage.current, { autoAlpha: 0, duration: 1.6, ease: 'power2.out' });
    // The 3D stage lives behind hero + story; after that it fades and stops rendering
    ScrollTrigger.create({
      trigger: '#features', start: 'top 90%', end: 'top 20%', scrub: true,
      onUpdate: s => gsap.set(stage.current, { opacity: 1 - s.progress }),
      onLeave: () => setActive(false),
      onEnterBack: () => setActive(true),
    });
    // Sections are created top-to-bottom, but fonts can shift layout after load
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  });

  return (
    <>
      <div ref={stage} className="stage" aria-hidden="true"><Scene active={active} /></div>
      <Nav />
      <main>
        <Hero />
        <Story />
        <Bento />
        <DayReel />
        <Demo />
        <Roadmap />
        <Finale />
      </main>
      <style>{`.stage{position:fixed;inset:0;z-index:0}`}</style>
    </>
  );
}
