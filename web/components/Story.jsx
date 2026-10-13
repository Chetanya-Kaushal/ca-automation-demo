'use client';
import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { story } from '@/lib/store';
import Icon from './Icon';

const CH = [
  { n: '01', eyebrow: 'Arrive', title: 'Every channel, one inbox.', body: 'WhatsApp, email and private upload links all land in the same place. No forwarding, no downloading, no renaming.',
    chips: [['chat', 'WhatsApp'], ['mail', 'docs@yourfirm'], ['link', 'Upload link']] },
  { n: '02', eyebrow: 'Read', title: 'It knows whose file it is.', body: 'PAN, names, the sender and the family or company they belong to. Confident matches are filed. The rest wait for one tap.',
    chips: [['doc', 'Form16_Jay.pdf'], ['eye', 'Jay Teli · Form 16'], ['spark', '2025-26 · 97% sure']] },
  { n: '03', eyebrow: 'Sort', title: 'Filed before you look.', body: 'Each document drops into the right client and return. Every correction your team makes becomes a rule, so it never asks twice.',
    chips: [['check', 'ITR · 9 files'], ['check', 'GST · 8 files'], ['check', 'Bank · 7 files']] },
  { n: '04', eyebrow: 'Remind', title: 'It chases. You don’t.', body: 'Due dates are tracked per client. Missing documents get a WhatsApp nudge at 7, 3 and 1 days, then the owner CA is told to call.',
    chips: [['clock', 'GST Q3 · due in 3 days'], ['send', 'Reminder sent 09:00'], ['chat', 'Still needed: ITC summary']] },
  { n: '05', eyebrow: 'Deliver', title: 'The return goes home.', body: 'Mark it filed and the acknowledgement lands in the client’s WhatsApp, logged for your audit trail.',
    chips: [['doc', 'GST_Return_Q3.pdf'], ['shield', 'Ack GST24Q3AP7821'], ['check', 'Delivered 16:33']] },
];

export default function Story() {
  const root = useRef();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduce: '(prefers-reduced-motion: reduce)' }, ({ conditions }) => {
      if (conditions.reduce) { story.p = 1; return; }
      const chs = gsap.utils.toArray('.chapter', root.current);
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root.current, pin: '.story-stage', start: 'top top', end: () => `+=${innerHeight * 5.2}`, scrub: true,
          onUpdate: s => {
            story.p = s.progress;
            const i = Math.min(4, Math.floor(s.progress * 5));
            root.current.querySelectorAll('.rail li').forEach((li, j) => li.classList.toggle('on', j <= i));
            root.current.style.setProperty('--prog', s.progress);
          },
        },
      });
      chs.forEach((c, i) => {
        const chips = c.querySelectorAll('.chip');
        tl.fromTo(c, { autoAlpha: 0 }, { autoAlpha: 1, duration: .12 }, i)
          .fromTo(c.querySelector('.ch-num'), { yPercent: 40, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: .3, ease: 'power3.out' }, i)
          .fromTo(c.querySelectorAll('.ch-text>*'), { y: 60, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: .3, stagger: .05, ease: 'power3.out' }, i + .02)
          .fromTo(chips, { y: 30, autoAlpha: 0, scale: .94 }, { y: 0, autoAlpha: 1, scale: 1, duration: .25, stagger: .07, ease: 'back.out(1.6)' }, i + .2);
        if (i < chs.length - 1) tl.to(c, { autoAlpha: 0, y: -50, duration: .18, ease: 'power2.in' }, i + .82);
      });
      tl.to({}, { duration: .3 }); // hold the last chapter before unpinning
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} id="story" className="story">
      <div className="story-stage">
        {CH.map((c, i) => (
          <article key={c.n} className={`chapter ch-${i}${[0, 3, 4].includes(i) ? ' right' : ''}`}>
            <span className="ch-num" aria-hidden="true">{c.n}</span>
            <div className="ch-text">
              <span className="eyebrow glass-lite">{c.eyebrow}</span>
              <h2 className="h2">{c.title}</h2>
              <p className="lede">{c.body}</p>
            </div>
            <ul className="chips">
              {c.chips.map(([ic, t]) => <li key={t} className="chip glass-lite"><Icon name={ic} size={16} /><span>{t}</span></li>)}
            </ul>
          </article>
        ))}
        <ol className="rail glass-lite" aria-hidden="true">
          {CH.map(c => <li key={c.n}><span>{c.eyebrow}</span></li>)}
          <i className="rail-fill" />
        </ol>
      </div>
      <style>{`
        .story{height:auto}
        .story-stage{position:relative;height:100vh;height:100dvh;overflow:hidden}
        .chapter{position:absolute;inset:0;display:grid;grid-template-columns:minmax(0,1fr);align-content:end;padding:0 max(16px,calc((100vw - 1240px)/2)) calc(14vh + 40px);pointer-events:none}
        .ch-text{position:relative;isolation:isolate;display:flex;flex-direction:column;align-items:flex-start;gap:18px;max-width:640px}
        .ch-text::before{content:"";position:absolute;inset:-70px -110px -50px;z-index:-1;pointer-events:none;background:radial-gradient(closest-side,rgba(5,6,10,.62),rgba(5,6,10,.25) 60%,transparent)}
        .ch-num{position:absolute;top:14vh;left:max(16px,calc((100vw - 1240px)/2));font-size:clamp(5rem,15vw,13rem);font-weight:600;letter-spacing:-.07em;line-height:1;color:transparent;-webkit-text-stroke:1px rgba(255,255,255,.16)}
        .chips{list-style:none;display:flex;flex-wrap:wrap;gap:10px;margin-top:26px}
        .chip{display:inline-flex;align-items:center;gap:10px;height:44px;padding:0 18px 0 14px;border-radius:999px;font-size:14px;color:var(--fg)}
        .ch-1 .chips,.ch-2 .chips{justify-content:flex-start}
        .chapter.right .ch-text,.chapter.right .chips{margin-left:auto;width:min(640px,100%)}
        .chapter.right .ch-num{left:auto;right:max(16px,calc((100vw - 1240px)/2))}
        .rail{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);list-style:none;display:flex;gap:2px;padding:6px;border-radius:999px;overflow:hidden}
        .rail li{display:flex;align-items:center;gap:10px;height:30px;padding:0 12px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--fg-3);transition:color .5s var(--out)}
        .rail li::before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor;transition:transform .6s var(--spring),background-color .5s}
        .rail li.on{color:var(--fg)}
        .rail li.on::before{transform:scale(1.4);background:var(--teal)}
        .rail-fill{position:absolute;left:0;bottom:0;height:2px;width:100%;transform-origin:left;transform:scaleX(var(--prog,0));background:linear-gradient(90deg,var(--blue),var(--teal));border-radius:2px}
        @media (max-width:900px){.rail{display:none}.chapter{padding-bottom:10vh}.ch-num{top:12vh}.chapter.right .ch-text,.chapter.right .chips{margin-left:0}}
        @media (prefers-reduced-motion:reduce){
          .story-stage{height:auto;overflow:visible}
          .chapter{position:relative;inset:auto;padding-top:20vh;padding-bottom:10vh}
          .ch-num{position:static}.rail{display:none}
        }
      `}</style>
    </section>
  );
}
