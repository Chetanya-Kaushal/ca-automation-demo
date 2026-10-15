'use client';
import { useGSAP } from '@/lib/gsap';
import { startSmoothScroll } from '@/lib/smooth';
import Reveal from '@/components/Reveal';
import Film from '@/components/Film';
import SpiralHero from '@/components/SpiralHero';
import Pipeline from '@/components/Pipeline';
import LaptopDemo from '@/components/LaptopDemo';

// The calm cut: the opening, the card spiral, then the whole story told as one scroll-driven film, then the live demo in a laptop and the decision pipeline.
export default function Page() {
  useGSAP(() => startSmoothScroll());
  return (
    <>
      <Reveal />
      <main id="main"><SpiralHero /><Film /><LaptopDemo /><Pipeline /></main>
    </>
  );
}
