'use client';
import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { gsap } from '@/lib/gsap';

const SpiralCanvas = dynamic(() => import('./scene/SpiralCanvas'), { ssr: false });

// First screen after the opening: the card spiral alone, filling the page edge to edge like the reference
// ("Spiral Flux"): a steep ribbon of curved prints flowing upward, small labels in the corners, arrows to turn it.
export default function SpiralHero() {
  const spin = useMemo(() => ({ value: 0 }), []);
  const [ok, setOk] = useState(false);
  useEffect(() => { try { setOk(!!document.createElement('canvas').getContext('webgl2')); } catch { setOk(false); } }, []);
  const turn = dir => gsap.to(spin, { value: `+=${dir * Math.PI * 2 / 7.5}`, duration: .9, ease: 'power3.out' }); // one card per press

  return (
    <section className="sh" aria-label="Ledger Hackers">
      {/* browsers without WebGL 2 get a still of the spiral instead of an empty stage */}
      {ok ? <SpiralCanvas spin={spin} /> : <img className="sh-still" src="/media/spiral-still.jpg" alt="" />}
      <div className="sh-ui">
        <span className="sh-tl">Ledger Hackers ®</span>
        <span className="sh-plus" aria-hidden="true">+</span>
        <button className="sh-arrow l" aria-label="Turn the spiral back" onClick={() => turn(-1)}><svg viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" /></svg></button>
        <button className="sh-arrow r" aria-label="Turn the spiral forward" onClick={() => turn(1)}><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" /></svg></button>
        <span className="sh-bl">FY 2026–27 · GST · ITR · TDS</span>
        <span className="sh-bc">/12 Documents</span>
        <span className="sh-br">Paperwork study / 2026</span>
      </div>
      <style>{`
        .sh{position:relative;height:100vh;height:100svh;overflow:hidden;background:#ececea;color:#121212}
        .sh canvas{position:absolute!important;inset:0}
        .sh-still{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .sh-ui{position:absolute;inset:0;pointer-events:none;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase}
        .sh-ui>span{position:absolute}
        .sh-tl{left:20px;top:22px;display:flex;align-items:center;gap:8px}.sh-tl::before{content:"";width:7px;height:7px;border:1.2px solid currentColor}
        .sh-plus{left:50%;top:18px;font-size:18px;font-weight:300;letter-spacing:0}
        .sh-tr{right:20px;top:22px}
        .sh-bl{left:20px;bottom:22px}.sh-bc{left:50%;bottom:22px;transform:translateX(-50%)}.sh-br{right:20px;bottom:22px}
        .sh-arrow{position:absolute;top:50%;width:52px;height:52px;margin-top:-26px;border-radius:50%;display:grid;place-items:center;pointer-events:auto;
          border:1.5px solid #121212;background:rgba(236,236,234,.55);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:scale .4s cubic-bezier(.32,.72,0,1)}
        .sh-arrow:active{scale:.92}.sh-arrow.l{left:18px}.sh-arrow.r{right:18px}
        .sh-arrow svg{width:22px;height:22px;fill:none;stroke:#121212;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
        @media (max-width:640px){.sh-bc{display:none}.sh-ui{font-size:9.5px}}
      `}</style>
    </section>
  );
}
