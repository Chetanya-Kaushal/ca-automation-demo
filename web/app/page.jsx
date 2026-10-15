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
      {/* staff sign in, always reachable: the liquid-orb button (styles in /orb-btn.css) */}
      <a href="/app" className="orb-btn signin"><span className="orb-label">Staff sign in</span><span className="orb" aria-hidden="true"><span className="orb-wave a"></span><span className="orb-wave b"></span><i className="orb-bub"></i><i className="orb-bub"></i><i className="orb-bub"></i><i className="orb-bub"></i><svg className="mail" viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2" /><path d="m4 7 8 6 8-6" /></svg><svg className="lock" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg></span></a>
      <style>{`.signin{position:fixed;top:14px;right:16px;z-index:60;font-size:11px}@media (max-width:640px){.signin{font-size:9.5px}}`}</style>
      <main id="main"><SpiralHero /><Film /><LaptopDemo /><Pipeline /></main>
    </>
  );
}
