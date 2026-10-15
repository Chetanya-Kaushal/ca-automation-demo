'use client';
import { useGSAP } from '@/lib/gsap';
import { startSmoothScroll } from '@/lib/smooth';
import Reveal from '@/components/Reveal';
import Film from '@/components/Film';
import SpiralHero from '@/components/SpiralHero';
import Pipeline from '@/components/Pipeline';

// The calm cut: the opening, the card spiral, then the whole story told as one scroll-driven film, ending on the decision pipeline.
export default function Page() {
  useGSAP(() => startSmoothScroll());
  return (
    <>
      <Reveal />
      <main id="main"><SpiralHero /><Film /><Pipeline /></main>
    </>
  );
}
