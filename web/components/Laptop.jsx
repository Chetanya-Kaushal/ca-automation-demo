'use client';
import { forwardRef } from 'react';

// A product-shot laptop: aluminium-edged lid with a camera notch, glossy glass glare, and a base with a lip
// and a soft contact shadow. Anything passed as children renders on the screen.
const Laptop = forwardRef(function Laptop({ children, className = '' }, ref) {
  return (
    <div ref={ref} className={`mbp ${className}`}>
      <div className="mbp-lid">
        <div className="mbp-screen">{children}</div>
        <i className="mbp-notch" aria-hidden="true" />
        <i className="mbp-glare" aria-hidden="true" />
      </div>
      <div className="mbp-base" aria-hidden="true"><i className="mbp-lip" /></div>
      <i className="mbp-shadow" aria-hidden="true" />
      <style>{`
        .mbp{position:relative;width:100%;perspective:2200px}
        .mbp-lid{position:relative;aspect-ratio:16/10.35;border-radius:3.1% / 4.8%;padding:1.7% 1.7% 2.3%;transform-origin:50% 100%;
          background:linear-gradient(180deg,#1a1b1e,#0b0b0c);
          box-shadow:0 0 0 1.6px #6c6f74,0 0 0 2.6px #2a2b2e,inset 0 0 0 1px rgba(255,255,255,.06),0 50px 90px -40px rgba(0,0,0,.55)}
        .mbp-screen{position:relative;width:100%;height:100%;border-radius:.6%;overflow:hidden;background:#000}
        .mbp-notch{position:absolute;left:50%;top:1.7%;width:9%;height:2.3%;margin-left:-4.5%;border-radius:0 0 8px 8px;background:#0b0b0c}
        .mbp-notch::after{content:"";position:absolute;left:50%;top:30%;width:14%;aspect-ratio:1;margin-left:-7%;border-radius:50%;background:radial-gradient(circle at 40% 40%,#2a3550,#05070b)}
        .mbp-glare{position:absolute;inset:1.7% 1.7% 2.3%;border-radius:.6%;pointer-events:none;
          background:linear-gradient(118deg,rgba(255,255,255,.1),rgba(255,255,255,.03) 34%,transparent 46%)}
        .mbp-base{position:relative;height:0;padding-bottom:2.6%;margin:0 -7.5%;border-radius:0 0 18px 18px / 0 0 100% 100%;
          background:linear-gradient(180deg,#e2e3e6 0%,#babcc1 38%,#8d9095 75%,#5d6065 100%);box-shadow:inset 0 1px 0 rgba(255,255,255,.8)}
        .mbp-lip{position:absolute;left:50%;top:0;width:15%;height:42%;margin-left:-7.5%;border-radius:0 0 10px 10px;background:linear-gradient(180deg,#9a9da2,#c9cbcf)}
        .mbp-shadow{position:absolute;left:-4%;right:-4%;bottom:-3.5%;height:6%;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.45),transparent);z-index:-1}
      `}</style>
    </div>
  );
});
export default Laptop;
