'use client';
import { useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { finishIntro, videoDone } from '@/lib/intro';
import { lenis } from '@/lib/smooth';
import HackerMark from './HackerMark';

// Stage two of the opening, after the intro video. A glowing dot bounces in, a stroke drops onto it to make "!",
// letters tumble in beside it to spell LEDGER!, then flip one by one into HACKERS. The word sinks and grows while
// dust gathers into the hacker mark behind it, then the whole layer hands over to the hero.
const FIRST = 'LEDGER!', SECOND = 'HACKERS';

// sample the hacker mark into dust targets: denser where the artwork is brighter
async function markPoints(src, w, h) {
  const svg = new XMLSerializer().serializeToString(src);
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  await img.decode();
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); g.drawImage(img, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, pts = [];
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
    const k = (y * w + x) * 4, a = d[k + 3] / 255, lum = (d[k] * .3 + d[k + 1] * .59 + d[k + 2] * .11) / 255;
    if (a > .5 && Math.random() < .28 + lum * .9) pts.push(x, y, lum);
  }
  return pts;
}

export default function Reveal() {
  const root = useRef();
  const [gone, setGone] = useState(false);

  useGSAP((ctx, contextSafe) => {
    const html = document.documentElement;
    if (html.classList.contains('no-intro')) { setGone(true); return; }
    const $ = s => root.current.querySelector(s), $$ = s => [...root.current.querySelectorAll(s)];
    let tl, raf, alive = true;

    const done = contextSafe(() => {
      alive = false; cancelAnimationFrame(raf);
      html.classList.remove('intro-on'); lenis?.start();
      finishIntro(); setGone(true);
    });

    // ── dust: scattered specks drift, then converge into the mark
    const cv = $('.rv-dust'), cx = cv.getContext('2d');
    const dust = { k: 0, a: 0, P: null };
    const size = () => { const dpr = Math.min(devicePixelRatio || 1, 1.5); cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    size();
    const prep = async () => {
      const box = Math.min(innerHeight * .62, innerWidth * .8), ox = (innerWidth - box) / 2, oy = innerHeight * .08;
      const pts = await markPoints($('.rv-src svg'), Math.round(box), Math.round(box));
      const n = pts.length / 3, P = { n, tx: new Float32Array(n), ty: new Float32Array(n), sx: new Float32Array(n), sy: new Float32Array(n), d: new Float32Array(n), l: new Float32Array(n) };
      for (let i = 0; i < n; i++) {
        P.tx[i] = ox + pts[i * 3]; P.ty[i] = oy + pts[i * 3 + 1]; P.l[i] = pts[i * 3 + 2];
        P.sx[i] = Math.random() * innerWidth; P.sy[i] = Math.random() * innerHeight; P.d[i] = Math.random() * .45;
      }
      dust.P = P;
    };
    const ready = prep();
    const draw = t => {
      raf = requestAnimationFrame(draw);
      cx.clearRect(0, 0, innerWidth, innerHeight);
      const P = dust.P; if (!P || dust.a <= 0) return;
      const time = t / 1000;
      for (let i = 0; i < P.n; i++) {
        const u = Math.min(1, Math.max(0, (dust.k - P.d[i]) / (1 - .45))), e = 1 - Math.pow(1 - u, 3);
        const j = (1 - e) * 6 + .6; // loose specks wander, settled ones only shimmer
        const x = P.sx[i] + (P.tx[i] - P.sx[i]) * e + Math.sin(time * 1.3 + i) * j;
        const y = P.sy[i] + (P.ty[i] - P.sy[i]) * e + Math.cos(time * 1.1 + i * 1.7) * j;
        cx.fillStyle = `rgba(${200 + P.l[i] * 55 | 0},${208 + P.l[i] * 47 | 0},255,${(dust.a * (.25 + .75 * e) * (.45 + P.l[i] * .55)).toFixed(3)})`;
        cx.fillRect(x, y, 1.3, 1.3);
      }
    };

    const run = async () => {
      await ready;
      if (!alive) return;
      raf = requestAnimationFrame(draw);
      const letters = $$('.rv-ch');
      const bang = letters[letters.length - 1];
      // the pool of light sits under the dot, wherever the word's last slot lands
      const d = $('.rv-dot').getBoundingClientRect();
      gsap.set('.rv-glow', { x: d.left + d.width / 2 - innerWidth / 2, y: d.top - innerHeight / 2 });
      const floor = 0; // the word's baseline sits on the dot's landing spot
      tl = gsap.timeline({ onComplete: done });
      tl.set(root.current, { autoAlpha: 1 })
        // a dot drops into a pool of light and bounces
        .fromTo('.rv-glow', { opacity: 0, scale: .4 }, { opacity: 1, scale: 1, duration: .6, ease: 'power2.out' }, 0)
        .fromTo('.rv-dot', { y: '-34vh', scaleY: 1 }, { y: floor, duration: .9, ease: 'bounce.out' }, .15)
        .to('.rv-dot', { scaleY: .55, scaleX: 1.35, duration: .07, yoyo: true, repeat: 1, ease: 'power1.out' }, .48)
        .to('.rv-glow', { scale: 1.25, duration: .25, yoyo: true, repeat: 1, ease: 'power2.out' }, .48)
        // the stroke drops onto it: "!"
        .fromTo('.rv-stem', { y: '-40vh', autoAlpha: 1 }, { y: 0, duration: .32, ease: 'power3.in', immediateRender: false }, 1.05)
        .to('.rv-dot', { scaleY: .6, scaleX: 1.3, duration: .06, yoyo: true, repeat: 1 }, 1.37)
        .to('.rv-glow', { scale: 1.3, duration: .2, yoyo: true, repeat: 1 }, 1.37)
        // hand the "!" to the word's last slot, then the letters tumble in from the upper left
        .set('.rv-bang', { autoAlpha: 0 }, 1.6).set(bang, { autoAlpha: 1 }, 1.6)
        .fromTo(bang, { rotation: 0 }, { rotation: -28, duration: .18, ease: 'power2.out', yoyo: true, repeat: 1 }, 1.6)
        .fromTo(letters.slice(0, -1), { x: i => -260 + i * 18, y: i => -240 - i * 30, rotation: i => -140 + i * 25, autoAlpha: 1 },
          { x: 0, y: 0, rotation: 0, duration: .55, ease: 'back.out(1.7)', stagger: .11, immediateRender: false }, 1.62)
        .to('.rv-glow', { opacity: .55, scale: 1.8, duration: 1.2 }, 1.7)
        // LEDGER! → HACKERS, one letter at a time
        .add(() => {}, 2.75);
      letters.forEach((el, i) => {
        tl.to(el, { rotationX: 90, duration: .08, ease: 'power1.in' }, 2.8 + i * .13)
          .add(() => (el.textContent = SECOND[i]), 2.88 + i * .13)
          .to(el, { rotationX: 0, duration: .1, ease: 'power1.out' }, 2.88 + i * .13);
      });
      // the word sinks and grows; dust gathers into the mark behind it
      tl.to('.rv-group', { y: '24vh', scale: 1.35, duration: 1.1, ease: 'expo.inOut' }, 3.85)
        .to('.rv-glow', { opacity: .25, y: '-14vh', scale: 2.6, duration: 1.4 }, 3.85)
        .to(dust, { a: 1, duration: .6 }, 4.3)
        .to(dust, { k: 1, duration: 1.9, ease: 'power2.inOut' }, 4.3)
        .to('.rv-sub', { autoAlpha: 1, duration: .6 }, 5.1)
        // hand over to the site: the layer lifts away
        .to('.rv-group', { y: '-=6vh', duration: .9, ease: 'power2.in' }, 6.5)
        .to(dust, { a: 0, duration: .7 }, 6.4)
        .to(root.current, { autoAlpha: 0, duration: .8, ease: 'power2.inOut' }, 6.6);
    };
    videoDone.then(run);

    const skip = contextSafe(() => { if (tl && tl.time() < 6.4) tl.seek(6.4); else if (!tl) done(); });
    const onKey = e => { if (e.key === 'Escape') skip(); };
    addEventListener('keydown', onKey); addEventListener('resize', size);
    $('.rv-skip').addEventListener('click', skip);
    return () => { alive = false; cancelAnimationFrame(raf); tl?.kill(); removeEventListener('keydown', onKey); removeEventListener('resize', size); };
  }, { scope: root });

  if (gone) return null;
  return (
    <div ref={root} className="rv" aria-hidden="true">
      <div className="rv-glow" />
      <canvas className="rv-dust" />
      <div className="rv-stage">
        <div className="rv-group">
          <div className="rv-word">
            {FIRST.split('').map((c, i) => <span key={i} className={`rv-ch${i === FIRST.length - 1 ? ' rv-last' : ''}`}>{c}</span>)}
            <span className="rv-bang"><span className="rv-stem" /><span className="rv-dot" /></span>
          </div>
          <div className="rv-sub">Ledger Hackers <em>· paperwork that files itself</em></div>
        </div>
      </div>
      <div className="rv-src" hidden><HackerMark size={400} ring={false} title="" /></div>
      <button className="rv-skip" tabIndex={-1}>Skip</button>
      <style>{`
        .rv{position:fixed;inset:0;z-index:99;background:#050506;overflow:hidden;visibility:visible}
        .no-intro .rv{display:none}
        .rv-glow{position:absolute;left:50%;top:50%;width:min(70vw,720px);aspect-ratio:1;margin:calc(min(70vw,720px) / -2) 0 0 calc(min(70vw,720px) / -2);
          border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.2),rgba(255,255,255,.06) 45%,transparent);opacity:0;pointer-events:none}
        .rv-dust{position:absolute;inset:0;width:100%;height:100%}
        .rv-stage{position:absolute;inset:0;display:grid;place-items:center;align-content:center;gap:14px}
        .rv-word{position:relative;display:flex;font-weight:800;font-size:clamp(52px,11vw,170px);line-height:.9;letter-spacing:-.02em;perspective:600px;
          font-family:var(--font-geist),system-ui,sans-serif}
        .rv-ch{display:inline-block;visibility:hidden;transform-origin:50% 60%;
          background:linear-gradient(180deg,#fff 15%,#b9bcc4 55%,#6e7179);-webkit-background-clip:text;background-clip:text;color:transparent;
          filter:drop-shadow(0 6px 14px rgba(0,0,0,.6))}
                .rv-group{display:grid;justify-items:center;gap:16px;transform-origin:50% 50%}
        /* the "!" that is built first, standing where the word's last letter will be */
        .rv-bang{position:absolute;right:0;bottom:0;width:.42em;height:1em;transform:translateX(-.02em)}
        .rv-dot{position:absolute;left:50%;bottom:.04em;width:.17em;height:.17em;margin-left:-.085em;border-radius:50%;
          background:radial-gradient(circle at 40% 35%,#fff,#c9ccd3 60%,#8b8e96);box-shadow:0 0 .3em rgba(255,255,255,.45);transform-origin:50% 100%}
        .rv-stem{position:absolute;left:50%;bottom:.3em;width:.15em;height:.58em;margin-left:-.075em;border-radius:.04em;visibility:hidden;
          background:linear-gradient(180deg,#fff,#b9bcc4 60%,#7d8088)}
        .rv-sub{font-size:clamp(12px,1.1vw,15px);font-weight:600;color:#e8e9ec;visibility:hidden;opacity:0}
        .rv-sub em{font-style:italic;font-weight:400;color:#9a9da6}
        .rv-skip{position:absolute;right:20px;bottom:20px;height:40px;padding:0 18px;border-radius:999px;font-size:13px;color:rgba(255,255,255,.7);
          background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
      `}</style>
    </div>
  );
}
