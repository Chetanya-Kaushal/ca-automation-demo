'use client';
import { useRef } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import Icon from './Icon';

const DAY = [
  ['09:00', 'clock', 'Reminder goes out', 'GST Q3 is due in two days and Amit hasn’t sent anything. A WhatsApp nudge lists exactly what’s missing.', 'amber'],
  ['09:00', 'send', 'Escalated tomorrow', 'Still silent the next morning. A second, urgent reminder, and Dhruv gets a call-the-client task.', 'red'],
  ['11:31', 'chat', 'Files arrive', 'Sales invoices, purchase invoices, ITC summary. Three PDFs in a WhatsApp chat.', 'teal'],
  ['11:31', 'spark', 'Sorted in seconds', 'Each file is matched to Amit and typed. The checklist turns green. Nobody opened a folder.', 'violet'],
  ['16:30', 'shield', 'Filed by a CA', 'Dhruv reviews and files on the portal. Filing always stays with a person.', 'blue'],
  ['16:33', 'check', 'Delivered', 'Return and acknowledgement land in Amit’s WhatsApp. Logged, done.', 'green'],
];

export default function DayReel() {
  const root = useRef(), track = useRef();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 760px)', () => {
      const dist = () => track.current.scrollWidth - innerWidth + Math.max(16, (innerWidth - 1240) / 2) * 2;
      const tween = gsap.to(track.current, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: root.current, pin: true, start: 'top top', end: () => `+=${dist()}`, scrub: true, invalidateOnRefresh: true },
      });
      gsap.to('.reel-bar i', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: () => `+=${dist()}`, scrub: true } });
      // each card tilts flat and lights up as it crosses the centre
      gsap.utils.toArray('.moment', root.current).forEach(card => {
        gsap.fromTo(card, { rotateY: -14, scale: .92, autoAlpha: .35 }, {
          rotateY: 0, scale: 1, autoAlpha: 1, ease: 'none',
          scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 85%', end: 'left 40%', scrub: true },
        });
      });
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} id="day" className="reel">
      <div className="reel-head wrap">
        <span className="eyebrow glass-lite">A day at the firm</span>
        <h2 className="h2">One client. Zero chasing.</h2>
      </div>
      <div ref={track} className="reel-track">
        {DAY.map(([t, ic, title, body, tone], i) => (
          <article key={i} className={`moment bezel tone-${tone}`}><div className="core slab">
            <div className="m-top"><span className="m-time">{t}</span><span className="m-ic"><Icon name={ic} size={22} /></span></div>
            <h3 className="h3">{title}</h3>
            <p className="dim">{body}</p>
            <span className="m-step">{String(i + 1).padStart(2, '0')} / {String(DAY.length).padStart(2, '0')}</span>
          </div></article>
        ))}
      </div>
      <div className="reel-bar wrap" aria-hidden="true"><i /></div>
      <style>{`
        .reel{min-height:100vh;min-height:100dvh;display:flex;flex-direction:column;justify-content:center;gap:48px;padding:96px 0;overflow:hidden;perspective:1400px}
        .reel-head{display:flex;flex-direction:column;align-items:flex-start;gap:20px}
        .reel-track{display:flex;gap:20px;padding:0 max(16px,calc((100vw - 1240px)/2));width:max-content;will-change:transform}
        .moment{width:min(420px,78vw);flex-shrink:0;transform-style:preserve-3d}
        .moment .core{display:flex;flex-direction:column;gap:16px;padding:30px;min-height:380px}
        .m-top{display:flex;justify-content:space-between;align-items:flex-start}
        .m-time{font-size:clamp(3rem,5vw,4.4rem);font-weight:600;letter-spacing:-.06em;line-height:1;font-variant-numeric:tabular-nums}
        .m-ic{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.07);box-shadow:inset 0 1px 0 rgba(255,255,255,.2)}
        .moment p{font-size:15.5px;line-height:1.55}
        .m-step{margin-top:auto;font-family:var(--mono);font-size:12px;color:var(--fg-3)}
        .tone-amber .core{background:radial-gradient(90% 60% at 100% 0%,rgba(255,181,71,.2),transparent 60%),rgba(12,14,22,.8)}
        .tone-red .core{background:radial-gradient(90% 60% at 100% 0%,rgba(255,107,107,.2),transparent 60%),rgba(12,14,22,.8)}
        .tone-teal .core{background:radial-gradient(90% 60% at 100% 0%,rgba(62,224,197,.2),transparent 60%),rgba(12,14,22,.8)}
        .tone-violet .core{background:radial-gradient(90% 60% at 100% 0%,rgba(155,123,255,.22),transparent 60%),rgba(12,14,22,.8)}
        .tone-blue .core{background:radial-gradient(90% 60% at 100% 0%,rgba(76,141,255,.22),transparent 60%),rgba(12,14,22,.8)}
        .tone-green .core{background:radial-gradient(90% 60% at 100% 0%,rgba(74,222,128,.2),transparent 60%),rgba(12,14,22,.8)}
        .tone-amber .m-ic{color:var(--amber)}.tone-red .m-ic{color:var(--red)}.tone-teal .m-ic{color:var(--teal)}.tone-violet .m-ic{color:var(--violet)}.tone-blue .m-ic{color:var(--blue)}.tone-green .m-ic{color:var(--green)}
        .reel-bar{height:2px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden}
        .reel-bar i{display:block;height:100%;transform:scaleX(0);transform-origin:left;background:linear-gradient(90deg,var(--amber),var(--teal),var(--green))}
        @media (max-width:759px),(prefers-reduced-motion:reduce){
          .reel-track{width:auto;flex-direction:column;padding:0 16px}
          .moment{width:100%}.moment .core{min-height:0}.reel-bar{display:none}
        }
      `}</style>
    </section>
  );
}
