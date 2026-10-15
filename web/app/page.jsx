'use client';
import { useGSAP } from '@/lib/gsap';
import { startSmoothScroll } from '@/lib/smooth';
import Reveal from '@/components/Reveal';
import Film from '@/components/Film';

// The calm cut: the opening, then the whole story told as one scroll-driven film.
export default function Page() {
  useGSAP(() => startSmoothScroll());
  return (
    <>
      <Reveal />
      <main id="main"><Film /></main>
    </>
  );
}
