'use client';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import Icon from './Icon';

export default function Bento() {
  const root = useRef();
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.from('.bento-head>*', { y: 50, autoAlpha: 0, filter: 'blur(12px)', duration: 1.2, stagger: .1, ease: 'expo.out',
        scrollTrigger: { trigger: '.bento-head', start: 'top 80%' } });
      gsap.set('.tile', { y: 80, autoAlpha: 0, scale: .96 });
      ScrollTrigger.batch('.tile', {
        start: 'top 88%',
        onEnter: els => gsap.to(els, { y: 0, autoAlpha: 1, scale: 1, duration: 1.3, stagger: .1, ease: 'expo.out', overwrite: true }),
      });
      // counters tick up when they come into view
      gsap.utils.toArray('[data-count]', root.current).forEach(el => {
        const o = { v: 0 };
        gsap.to(o, { v: +el.dataset.count, duration: 2, ease: 'power3.out', onUpdate: () => (el.textContent = Math.round(o.v)),
          scrollTrigger: { trigger: el, start: 'top 85%' } });
      });
    });
    return () => mm.revert();
  }, { scope: root });

  return (
    <section ref={root} id="features" className="bento-sec">
      <div className="wrap">
        <div className="bento-head">
          <span className="eyebrow glass">Live now</span>
          <h2 className="h2">Built for the busiest<br />week of the year.</h2>
          <p className="lede">Everything below is running in the staff app today, not a mock-up.</p>
        </div>

        <div className="bento">
          <div className="tile t-wa bezel"><div className="core slab">
            <div className="tile-top"><Icon name="chat" size={22} /><span>WhatsApp intake</span></div>
            <h3 className="h3">Clients just send the photo.</h3>
            <p className="dim">Files, scans and photos sent to your business number are downloaded, sorted and acknowledged within seconds.</p>
            <div className="mini-chat" aria-hidden="true">
              <div className="b in"><span className="fc">PDF</span>Form16_Priya.pdf</div>
              <div className="b out">Received ✓ Filed under Priya Mehta · Form 16</div>
              <div className="b out">Still needed for ITR 2025-26: Bank statement</div>
              <div className="b in typing"><i /><i /><i /></div>
            </div>
          </div></div>

          <div className="tile t-learn bezel"><div className="core slab">
            <div className="tile-top"><Icon name="spark" size={22} /><span>Learns from you</span></div>
            <div className="big"><span data-count="97">97</span><small>%</small></div>
            <p className="dim">Confidence after one CA correction. Same kind of file next time? Filed without asking.</p>
          </div></div>

          <div className="tile t-remind bezel"><div className="core slab">
            <div className="tile-top"><Icon name="clock" size={22} /><span>Deadline reminders</span></div>
            <div className="dial" aria-hidden="true"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" /><circle className="arc" cx="60" cy="60" r="52" /></svg><b>3<small>days</small></b></div>
            <p className="dim">7 · 3 · 1 day nudges, then escalation.</p>
          </div></div>

          <div className="tile t-email bezel"><div className="core slab">
            <div className="tile-top"><Icon name="mail" size={22} /><span>Email &amp; links</span></div>
            <h3 className="h3">docs@yourfirm.in</h3>
            <p className="dim">Forward-to address and a private upload link per client. Family members can send each other&rsquo;s files.</p>
          </div></div>

          <div className="tile t-deliver bezel"><div className="core slab">
            <div className="tile-top"><Icon name="send" size={22} /><span>Delivery</span></div>
            <h3 className="h3">Filed. Sent. Logged.</h3>
            <p className="dim">The return and acknowledgement go back on WhatsApp the moment you mark it filed.</p>
          </div></div>

          <div className="tile t-review bezel"><div className="core slab">
            <div className="tile-top"><Icon name="list" size={22} /><span>One-tap review</span></div>
            <div className="review" aria-hidden="true">
              <div><span>Mehta_docs.pdf</span><em>35%</em></div>
              <div className="ok"><span>Tally_ABCPvt.xlsx</span><em>97%</em></div>
              <div className="ok"><span>Bank_SBI_Meera.pdf</span><em>99%</em></div>
            </div>
          </div></div>
        </div>
      </div>
      <style>{`
        .bento-sec{padding:clamp(120px,18vh,200px) 0 clamp(80px,12vh,160px);background:linear-gradient(180deg,transparent,var(--ink) 18%)}
        .bento-head{display:flex;flex-direction:column;align-items:flex-start;gap:22px;margin-bottom:64px}
        .bento{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-rows:minmax(220px,auto);gap:16px}
        .tile .core{display:flex;flex-direction:column;gap:14px;padding:30px;overflow:hidden}
        .tile-top{display:flex;align-items:center;gap:10px;font-size:13px;letter-spacing:.02em;color:var(--fg-2)}
        .tile p{font-size:15px;line-height:1.5;max-width:46ch}
        .t-wa{grid-column:span 7;grid-row:span 2}
        .t-learn{grid-column:span 5}
        .t-remind{grid-column:span 5}
        .t-email{grid-column:span 4}
        .t-deliver{grid-column:span 4}
        .t-review{grid-column:span 4}
        .t-wa .core{background:linear-gradient(180deg,rgba(0,168,132,.14),transparent 60%),rgba(12,14,22,.72)}
        .mini-chat{margin-top:auto;display:flex;flex-direction:column;gap:8px;padding:18px;border-radius:22px;background:rgba(11,20,26,.85);box-shadow:inset 0 1px 0 rgba(255,255,255,.08)}
        .b{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.35;display:flex;align-items:center;gap:8px;opacity:0;animation:pop 9s var(--spring) infinite}
        .b.in{align-self:flex-start;background:#1f2c34}
        .b.out{align-self:flex-end;background:#005c4b}
        .b:nth-child(1){animation-delay:.2s}.b:nth-child(2){animation-delay:1.2s}.b:nth-child(3){animation-delay:2s}.b:nth-child(4){animation-delay:3.2s}
        .fc{font-size:9px;font-weight:700;padding:4px 5px;border-radius:4px;background:#e5484d}
        .typing{gap:4px}.typing i{width:6px;height:6px;border-radius:50%;background:#8696a0;animation:dot 1.2s infinite}
        .typing i:nth-child(2){animation-delay:.15s}.typing i:nth-child(3){animation-delay:.3s}
        @keyframes pop{0%{opacity:0;transform:translateY(10px) scale(.94)}6%,88%{opacity:1;transform:none}96%,100%{opacity:0;transform:translateY(-6px)}}
        @keyframes dot{0%,60%,100%{transform:none}30%{transform:translateY(-4px)}}
        .big{font-size:clamp(4.5rem,9vw,7.5rem);font-weight:600;letter-spacing:-.06em;line-height:.9;margin-top:auto;font-variant-numeric:tabular-nums}
        .big small{font-size:.4em;letter-spacing:-.02em;color:var(--fg-3)}
        .t-learn .core{background:radial-gradient(80% 80% at 100% 0%,rgba(155,123,255,.22),transparent 60%),rgba(12,14,22,.72)}
        .dial{position:relative;width:132px;height:132px;margin:4px 0}
        .dial svg{width:100%;height:100%;transform:rotate(-90deg)}
        .dial circle{fill:none;stroke:rgba(255,255,255,.08);stroke-width:6}
        .dial .arc{stroke:var(--amber);stroke-linecap:round;stroke-dasharray:327;stroke-dashoffset:327;animation:arc 4s var(--spring) infinite alternate}
        @keyframes arc{to{stroke-dashoffset:120}}
        .dial b{position:absolute;inset:0;display:grid;place-content:center;text-align:center;font-size:40px;font-weight:600;letter-spacing:-.04em;line-height:1}
        .dial small{display:block;font-size:12px;font-weight:400;letter-spacing:.06em;color:var(--fg-3);text-transform:uppercase}
        .t-remind .core{background:radial-gradient(70% 70% at 0% 100%,rgba(255,181,71,.16),transparent 60%),rgba(12,14,22,.72)}
        .review{display:flex;flex-direction:column;gap:8px;margin-top:auto}
        .review div{display:flex;justify-content:space-between;gap:12px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.04);font-size:13.5px;box-shadow:inset 0 0 0 1px rgba(255,180,71,.35)}
        .review div.ok{box-shadow:inset 0 0 0 1px rgba(74,222,128,.25)}
        .review em{font-style:normal;font-family:var(--mono);color:var(--amber)}.review .ok em{color:var(--green)}
        .review span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        @media (max-width:980px){.bento{grid-template-columns:repeat(2,minmax(0,1fr))}.t-wa{grid-column:span 2;grid-row:auto}.tile{grid-column:span 1!important}.t-wa{grid-column:span 2!important}}
        @media (max-width:640px){.bento{grid-template-columns:1fr}.tile,.t-wa{grid-column:span 1!important}.tile .core{padding:24px}}
      `}</style>
    </section>
  );
}
