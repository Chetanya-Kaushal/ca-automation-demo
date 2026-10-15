'use client';
import { useRef } from 'react';
import { gsap, ScrollTrigger, useGSAP } from '@/lib/gsap';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import HackerMark from './HackerMark';
import TRACK from './deskTrack.json';

gsap.registerPlugin(ScrambleTextPlugin);


// The site after the opening, told like a calm product film. One pinned stage, scrubbed by scroll:
// 1 a stack of documents settles, "Too many files. Too many deadlines."  2 a laptop on a desk asks "Everything scattered?"
// 3 "Finding a client's file / shouldn't feel like a chore."  4 dark: "meet / ledger hackers."
// 5 a glass dashboard assembles  6 "Capture every receipt / invoice / Form 16"  7 "Everything connected"  8 "All with" → the mark.
const words = (s, cls = '') => s.split(' ').map((w, i) => <span key={i} className={`fw ${cls}`}>{w}&nbsp;</span>);

const THEMES = {
  mint: { '--base': '#e8eee8', '--c1': '#c9e0cd', '--c2': '#f5f7f2', '--c3': '#b4d6bc', '--ink': '#1c2a21' },
  dark: { '--base': '#08130d', '--c1': '#14301f', '--c2': '#0b1b12', '--c3': '#1d4a30', '--ink': '#e9f3ec' },
  green: { '--base': '#2c7f4c', '--c1': '#b4ecbd', '--c2': '#1b5a35', '--c3': '#52c77a', '--ink': '#f1fbf3' },
};

export default function Film() {
  const root = useRef();
  useGSAP(() => {
    const $ = s => root.current.querySelectorAll(s);
    const film = root.current;
    gsap.set(film, THEMES.mint);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    // word in: blur → sharp, a little rise; word out: blur away
    const wIn = (sel, at, each = .12) => tl.fromTo(sel, { autoAlpha: 0, y: 10, filter: 'blur(10px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: .55, stagger: each }, at);
    const wOut = (sel, at) => tl.to(sel, { autoAlpha: 0, filter: 'blur(12px)', y: -6, duration: .45, ease: 'power2.in' }, at);
    const theme = (name, at, d = .9) => tl.to(film, { ...THEMES[name], duration: d, ease: 'power2.inOut' }, at);

    // 1 · documents tumble together and settle; the first lines
    tl.from('.st-card', { y: (i) => [-260, 220, -180, 260, -120][i], x: (i) => [-320, 260, 340, -220, 120][i], rotate: (i) => [-40, 35, 28, -30, 18][i],
      autoAlpha: 0, duration: 1.3, stagger: .1, ease: 'expo.out' }, 0)
      .to('.stack', { y: -8, duration: 2, ease: 'sine.inOut' }, 1.4);
    wIn('.s1a .fw', 1.6); wIn('.s1b .fw', 2.4);
    tl.to('.stack', { scale: .92, autoAlpha: 0, filter: 'blur(14px)', duration: .6, ease: 'power2.in' }, 4.1);
    wOut('.s1 .fw', 4.1);

    // 2 · the desk: a laptop asks the question while ghost words drift across the room
    tl.fromTo('.desk', { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: .7 }, 4.5)
      .fromTo('.ghost', { xPercent: 30, autoAlpha: 0 }, { xPercent: -30, autoAlpha: .35, duration: 2, ease: 'none' }, 4.6);
    wIn('.scr .fw', 4.9, .35);
    tl.to('.desk', { autoAlpha: 0, scale: 1.04, filter: 'blur(16px)', duration: .6, ease: 'power2.in' }, 6.3);

    // 3 · two short lines, word by word
    wIn('.s3a .fw', 6.7, .14); wOut('.s3a .fw', 7.7);
    wIn('.s3b .fw', 8, .16); wOut('.s3b .fw', 9.2);

    // 4 · the room goes dark: meet ledger hackers.
    theme('dark', 9.2, 1);
    tl.fromTo('.rise', { yPercent: 100, autoAlpha: 0 }, { yPercent: -10, autoAlpha: .9, duration: 1, ease: 'power2.inOut' }, 9.1)
      .to('.rise', { autoAlpha: 0, duration: .6 }, 9.9);
    wIn('.s4a .fw', 10); wOut('.s4a .fw', 10.6); wIn('.s4b .fw', 10.8); wOut('.s4b .fw', 11.5);

    // 5 · a flash of light, a glass panel sharpens, its tiles fill
    theme('green', 11.4, 1.2);
    tl.fromTo('.flash', { autoAlpha: 0, scale: .6 }, { autoAlpha: 1, scale: 1.2, duration: .5 }, 11.4).to('.flash', { autoAlpha: 0, duration: .6 }, 11.9)
      .fromTo('.dash', { autoAlpha: 0, scale: .88, filter: 'blur(26px)' }, { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: .9 }, 11.7)
      .fromTo('.tile', { autoAlpha: 0, scale: .94 }, { autoAlpha: 1, scale: 1, duration: .45, stagger: .05 }, 12.2)
      .fromTo('.tile>*', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: .45, stagger: .02 }, 12.7)
      .to('.dash', { autoAlpha: 0, scale: 1.05, filter: 'blur(24px)', duration: .7, ease: 'power2.in' }, 13.9);

    // 6 · capture every … (the last word cycles)
    wIn('.s6 .lead .fw', 14.3, .1);
    const cyc = gsap.utils.toArray('.cyc>span');
    cyc.forEach((el, i) => {
      const at = 14.6 + i * .8;
      tl.fromTo(el, { autoAlpha: 0, yPercent: -60, filter: 'blur(8px)' }, { autoAlpha: 1, yPercent: 0, filter: 'blur(0px)', duration: .45 }, at);
      if (i < cyc.length - 1) tl.to(el, { autoAlpha: 0, yPercent: 60, filter: 'blur(8px)', duration: .35, ease: 'power2.in' }, at + .6);
    });
    wOut('.s6 .fw, .cyc>span', 17);

    // 7 · everything connected
    wIn('.s7a', 17.3, 0);
    tl.fromTo('.s7b', { autoAlpha: 0, x: 30, y: -18, filter: 'blur(10px)' }, { autoAlpha: 1, x: 0, y: 0, filter: 'blur(0px)', duration: .6 }, 17.6);
    wOut('.s7 span', 18.5);

    // 8 · all with → the mark
    wIn('.s8 .fw', 18.8, .12);
    tl.to('.s8-word', { duration: .8, scrambleText: { text: 'Ledger Hackers.', chars: '₹0123456789#%', speed: .8 }, ease: 'none' }, 19.5)
      .fromTo('.s8-mark', { autoAlpha: 0, scale: .6, rotate: -20 }, { autoAlpha: 1, scale: 1, rotate: 0, duration: .6, ease: 'back.out(2)' }, 19.7)
      .to({}, { duration: 1.3 }, 20.3)
      .to('.s8', { autoAlpha: 0, y: -20, duration: .6 }, 21.4)
      .fromTo('.cta', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .8 }, 21.6);

    // the screen text rides the real laptop screen: footage framed to the stage, screen rect looked up by video time
    const vid = film.querySelector('.desk-vid'), scr = film.querySelector('.scr'), desk = film.querySelector('.desk');
    let raf;
    const place = () => {
      raf = requestAnimationFrame(place);
      const on = +getComputedStyle(desk).opacity > .01;
      if (on && vid.paused) vid.play().catch(() => {}); else if (!on && !vid.paused) vid.pause();
      if (!on) return;
      const W = desk.clientWidth, H = desk.clientHeight, portrait = W < H;
      const k = portrait ? W / (1920 * .5) : Math.max(W / 1920, H / 1080), dw = 1920 * k, dh = 1080 * k, ox = (W - dw) / 2, oy = (H - dh) / 2;
      Object.assign(vid.style, { width: `${dw}px`, height: `${dh}px`, left: `${ox}px`, top: `${oy}px` });
      const t = vid.currentTime, i = Math.min(TRACK.length - 2, Math.max(0, TRACK.findIndex(r => r[0] > t) - 1));
      const [t0, ...a] = TRACK[i], [t1, ...b] = TRACK[i + 1], u = Math.min(1, Math.max(0, (t - t0) / (t1 - t0 || 1)));
      const [x0, y0, x1, y1] = a.map((v, j) => v + (b[j] - v) * u);
      Object.assign(scr.style, { left: `${ox + x0 * dw}px`, top: `${oy + y0 * dh}px`, width: `${(x1 - x0) * dw}px`, height: `${(y1 - y0) * dh}px` });
    };
    raf = requestAnimationFrame(place);
    if (reduce) { tl.progress(1); return () => cancelAnimationFrame(raf); }
    ScrollTrigger.create({ trigger: film, start: 'top top', end: '+=1500%', pin: '.f-stage', scrub: .8, animation: tl, anticipatePin: 1 });
    return () => cancelAnimationFrame(raf);
  }, { scope: root });

  return (
    <section ref={root} className="film" id="film">
      <div className="f-stage">
        <div className="bg" aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="rise" aria-hidden="true" />
        <div className="flash" aria-hidden="true" />

        {/* 1 */}
        <div className="scene s1">
          <div className="stack" aria-hidden="true">
            <div className="st-card c-sheet"><span className="ring" /><b /><b /><b /></div>
            <div className="st-card c-dark"><em>GST · Q3</em><b /><b /><b /><b /><em>Form 16 · 26AS</em><b /><b /></div>
            <div className="st-card c-paper" />
            <div className="st-card c-white" />
            <div className="st-card c-front" />
          </div>
          <p className="s1-text"><span className="s1a">{words('Too many files.')}</span><span className="s1b">{words('Too many deadlines.', 'soft')}</span></p>
        </div>

        {/* 2 */}
        <div className="scene desk" aria-hidden="true">
          {/* real footage (Pexels #4884237, free licence): a laptop on a sunlit desk, the camera slowly pushing in */}
          <video className="desk-vid" src="/media/desk.mp4" poster="/media/desk-poster.jpg" muted playsInline loop preload="auto" />
          <div className="ghost">Everything scattered</div>
          <div className="scr"><p>{words('Everything scattered?')}</p></div>
        </div>

        {/* 3 */}
        <div className="scene s3"><p className="line s3a">{words("Finding a client's file")}</p><p className="line s3b">{words("shouldn't feel like a chore.")}</p></div>

        {/* 4 */}
        <div className="scene s4"><p className="line s4a">{words('meet')}</p><p className="line s4b">{words('ledger hackers.')}</p></div>

        {/* 5 */}
        <div className="scene s5">
          <div className="dash" aria-hidden="true">
            <aside><i /><i /><i /><i /><i /></aside>
            <header><b>Ledger Hackers</b><small>Staff dashboard · today</small></header>
            <div className="grid">
              <div className="tile big"><span>Files today</span><strong>89</strong><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="40" className="on" /></svg></div>
              <div className="tile"><span>Pending review</span><strong>13</strong></div>
              <div className="tile"><span>Auto-filed</span><strong>87%</strong></div>
              <div className="tile"><span>Due this week</span><strong>7</strong><small>returns</small></div>
              <div className="tile"><span>Reminders</span><strong>24</strong><small>sent</small></div>
              <div className="tile wide"><span>Discover</span><svg viewBox="0 0 200 80" className="ribbon"><defs><linearGradient id="rb" x1="0" x2="1"><stop offset="0" stopColor="#d6ffd9" /><stop offset=".5" stopColor="#4cc274" /><stop offset="1" stopColor="#1d6b3e" /></linearGradient></defs><path d="M0 60 C40 10 70 70 110 30 S170 10 200 40 L200 58 C170 30 140 60 110 50 S40 30 0 78Z" fill="url(#rb)" /></svg></div>
              <div className="tile wide"><span>Summary</span><svg viewBox="0 0 100 100" className="rings"><circle cx="50" cy="50" r="40" /><circle cx="50" cy="50" r="30" /><circle cx="50" cy="50" r="20" /></svg><ul><li>ITR · 31</li><li>GST · 42</li><li>TDS · 16</li></ul></div>
            </div>
          </div>
        </div>

        {/* 6 */}
        <div className="scene s6"><p className="line"><span className="lead">{words('Capture every')}</span><span className="cyc"><span>receipt</span><span>invoice</span><span>Form 16</span></span></p></div>

        {/* 7 */}
        <div className="scene s7"><p className="line"><span className="s7a fw">Everything&nbsp;</span><span className="s7b">connected</span></p></div>

        {/* 8 */}
        <div className="scene s8"><p className="line">{words('All with', 's8-lead')}<span className="s8-mark"><HackerMark size={44} ring={false} title="" /></span><span className="s8-word">&nbsp;</span></p></div>

        <div className="scene cta">
          <h2>Paperwork that files itself.</h2>
          <p>WhatsApp, email and upload links land in one inbox. Ledger Hackers names, sorts, chases and delivers.</p>
          <div className="cta-row"><a className="pill solid" href="/app">Open the staff app</a><a className="pill" href="#demo">Try the demo</a></div>
        </div>
      </div>

      <style>{`
        .film{position:relative;color:var(--ink);background:var(--base)}
        .f-stage{position:relative;height:100vh;height:100svh;overflow:hidden;background:var(--base)}
        .scene{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none}
        .fw{display:inline-block;visibility:hidden}
        .line{font-size:clamp(15px,1.5vw,22px);font-weight:500;letter-spacing:-.01em;text-align:center}
        /* mesh gradient: soft blobs drifting on the theme colours */
        .bg{position:absolute;inset:-10%}
        .bg i{position:absolute;width:70vmax;height:70vmax;border-radius:50%;background:radial-gradient(closest-side,var(--c1),transparent);animation:mesh 18s ease-in-out infinite alternate}
        .bg i:nth-child(2){right:-20vmax;top:-25vmax;background:radial-gradient(closest-side,var(--c2),transparent);animation-duration:23s}
        .bg i:nth-child(3){left:-25vmax;bottom:-30vmax;background:radial-gradient(closest-side,var(--c3),transparent);animation-duration:27s;animation-delay:-8s}
        .bg i:nth-child(4){right:5vw;bottom:-20vmax;width:50vmax;height:50vmax;background:radial-gradient(closest-side,var(--c1),transparent);animation-duration:21s;animation-delay:-4s}
        @keyframes mesh{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(9vw,7vh,0) scale(1.15)}100%{transform:translate3d(-7vw,-5vh,0) scale(.92)}}
        .rise{position:absolute;left:-10%;right:-10%;bottom:-40%;height:90%;border-radius:50%;background:radial-gradient(closest-side,#5fd28a,transparent);visibility:hidden}
        .flash{position:absolute;left:50%;top:40%;width:60vmax;height:40vmax;margin:-20vmax 0 0 -30vmax;border-radius:50%;background:radial-gradient(closest-side,#b6ffd0,transparent);visibility:hidden}

        /* 1 · the stack */
        .s1{grid-template-columns:1fr 1fr;align-items:center;padding:0 8vw}
        .s1-text{grid-column:1;grid-row:1;justify-self:start;font-size:clamp(16px,1.6vw,24px);font-weight:500;line-height:1.35;font-style:italic;display:grid}
        .soft{color:#5fae79}
        .stack{grid-column:1/-1;grid-row:1;position:relative;width:min(38vw,520px);aspect-ratio:1.25;justify-self:center;transform:translateX(10%)}
        .st-card{position:absolute;border-radius:18px;box-shadow:0 30px 60px -30px rgba(20,60,35,.45)}
        .c-sheet{left:5%;top:4%;width:42%;height:58%;background:#eef4ee;padding:14px;display:flex;flex-direction:column;gap:8px}
        .c-sheet .ring{width:38%;aspect-ratio:1;border-radius:50%;border:6px solid #8fd3a3}
        .c-sheet b,.c-dark b{display:block;height:5px;border-radius:3px;background:rgba(40,90,60,.22)}
        .c-dark{right:4%;top:0;width:44%;height:86%;background:#173a26;padding:16px;display:flex;flex-direction:column;gap:9px;transform:rotate(3deg)}
        .c-dark b{background:rgba(220,255,230,.22)} .c-dark em{font-size:10px;font-style:normal;letter-spacing:.06em;color:#c7f1d3;margin-top:4px}
        .c-paper{left:28%;bottom:-6%;width:36%;height:40%;border-radius:6px 6px 40px 6px;background:linear-gradient(180deg,#c9f2d2,#6ed592);transform:skewY(-6deg)}
        .c-white{left:20%;top:30%;width:52%;height:48%;background:#f8faf7}
        .c-front{left:14%;top:26%;width:58%;height:40%;background:linear-gradient(170deg,#2f8a55,#1f6b40);border-radius:26px}

        /* 2 · the desk */
        .desk{visibility:hidden}
        .desk{background:#ebe8e3}
        .desk-vid{position:absolute;object-fit:cover}
        .ghost{position:absolute;top:30%;left:0;right:0;text-align:center;font-size:12vw;font-weight:600;color:#fff;filter:blur(10px);white-space:nowrap;letter-spacing:-.04em}
        .scr{position:absolute;display:grid;place-items:center} /* placed on the video's screen every frame */
        .scr p{font-size:clamp(12px,1.2vw,18px);font-weight:500;color:#1c2a21}

        .s3 .line,.s4 .line{position:absolute}
        .s4 .line{font-size:clamp(16px,1.6vw,24px)}

        /* 5 · the dashboard */
        .dash{position:relative;width:min(62vw,880px);aspect-ratio:1.55;border-radius:22px;padding:2.2% 2.2% 2.2% 7%;visibility:hidden;color:#173a26;
          background:linear-gradient(160deg,rgba(255,255,255,.72),rgba(230,248,234,.55));box-shadow:inset 0 1px 0 rgba(255,255,255,.9),0 40px 80px -30px rgba(10,50,25,.5);
          -webkit-backdrop-filter:blur(20px) saturate(160%);backdrop-filter:blur(20px) saturate(160%)}
        .dash aside{position:absolute;left:1.6%;top:12%;display:grid;gap:10px}
        .dash aside i{width:22px;height:22px;border-radius:50%;background:rgba(23,58,38,.12)} .dash aside i:first-child{background:#4cc274}
        .dash header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:2%}
        .dash header b{font-size:clamp(14px,1.5vw,22px)} .dash header small{font-size:11px;opacity:.6}
        .dash .grid{display:grid;grid-template-columns:1.3fr 1fr 1fr;grid-template-rows:1fr 1fr 1.25fr;gap:10px;height:86%}
        .tile{position:relative;border-radius:14px;padding:10px 12px;background:linear-gradient(160deg,#f3fbf4,#d3efd9);overflow:hidden;display:flex;flex-direction:column;visibility:hidden}
        .tile span{font-size:11px;font-weight:600;opacity:.7} .tile strong{font-size:clamp(20px,2.6vw,40px);font-weight:600;letter-spacing:-.03em} .tile small{font-size:10px;opacity:.6}
        .tile.big{grid-row:1/3} .tile.big svg{position:absolute;right:8%;bottom:8%;width:50%;transform:rotate(-90deg)}
        .tile.big circle{fill:none;stroke:rgba(23,58,38,.1);stroke-width:9} .tile.big .on{stroke:#4cc274;stroke-dasharray:180 252;stroke-linecap:round}
        .tile.wide:nth-last-child(2){grid-column:1/3}
        .ribbon{position:absolute;left:4%;right:4%;bottom:6%;width:92%}
        .rings{position:absolute;right:6%;top:18%;width:42%} .rings circle{fill:none;stroke:#4cc274;stroke-width:5;opacity:.75} .rings circle:nth-child(2){opacity:.5} .rings circle:nth-child(3){opacity:.3}
        .tile ul{list-style:none;margin-top:auto;font-size:11px;display:grid;gap:3px}

        .cyc{position:relative;display:inline-block;min-width:7ch;height:1.35em;vertical-align:bottom;text-align:left;color:#d8ffe0}
        .cyc>span{position:absolute;left:0;top:0;visibility:hidden;white-space:nowrap}
        .s7b{display:inline-block;visibility:hidden;color:#d8ffe0}
        .s8 .line{display:flex;align-items:center;gap:10px;font-size:clamp(18px,2vw,30px);font-weight:600}
        .s8-mark{display:inline-grid;visibility:hidden} .s8-word{color:#fff}

        .cta{display:grid;place-items:center;align-content:center;gap:18px;padding:0 24px;text-align:center;visibility:hidden;pointer-events:auto}
        .cta h2{font-size:clamp(34px,6vw,84px);font-weight:600;letter-spacing:-.045em;line-height:1}
        .cta p{max-width:46ch;font-size:clamp(15px,1.3vw,19px);opacity:.85}
        .cta-row{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:10px}
        .pill{display:inline-flex;align-items:center;height:50px;padding:0 24px;border-radius:999px;font-weight:500;color:#f1fbf3;
          background:rgba(255,255,255,.16);box-shadow:inset 0 1px 0 rgba(255,255,255,.45),inset 0 0 0 1px rgba(255,255,255,.2);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px)}
        .pill.solid{background:#f1fbf3;color:#173a26}

        @media (max-width:760px){
          .s1{grid-template-columns:1fr;padding:0 24px}
          .s1-text{grid-row:2;justify-self:center;text-align:center;margin-top:-18vh}
          .stack{width:78vw;transform:translateY(-12vh)}
          .dash{width:92vw;padding:3%} .dash aside{display:none} .tile span{font-size:9px}
        }
        @media (prefers-reduced-motion:reduce){.bg i{animation:none}}
      `}</style>
    </section>
  );
}
