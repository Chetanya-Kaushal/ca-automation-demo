'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import { lenis } from '@/lib/smooth';
import { introDone } from '@/lib/intro';
import HackerMark from './HackerMark';

const LINKS = [['Story', '#story'], ['Features', '#features'], ['Engine', '#engine'], ['Pipeline', '#pipeline'], ['A day', '#day'], ['Demo', '#demo'], ['Roadmap', '#roadmap']];

export default function Nav() {
  const [open, setOpen] = useState(false);
  const root = useRef(), menu = useRef(), burger = useRef();

  // Open menu: freeze page scroll, focus the first link, Esc closes, focus returns to the button
  useEffect(() => {
    const main = document.getElementById('main');
    if (!open) { lenis?.start(); main?.removeAttribute('inert'); return; }
    lenis?.stop(); main?.setAttribute('inert', '');
    menu.current.style.visibility = 'visible'; // focusable now; the fade-in can catch up
    menu.current.querySelector('.menu-link')?.focus();
    const onKey = e => { if (e.key === 'Escape') { setOpen(false); burger.current?.focus(); } };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [open]);

  useGSAP(() => {
    const t = gsap.from('.nav-island', { y: -30, autoAlpha: 0, duration: 1.1, ease: 'expo.out', paused: true });
    introDone.then(() => t.play());
  }, { scope: root });

  useGSAP(() => {
    if (!menu.current) return;
    if (open) {
      gsap.to(menu.current, { autoAlpha: 1, duration: .45, ease: 'power3.out' });
      gsap.fromTo(menu.current.querySelectorAll('.menu-link'), { yPercent: 110 }, { yPercent: 0, duration: .9, ease: 'expo.out', stagger: .06, delay: .05 });
    } else {
      gsap.to(menu.current, { autoAlpha: 0, duration: .3, ease: 'power2.in' });
    }
  }, { dependencies: [open], scope: root });

  return (
    <header ref={root} className="nav">
      <nav className="nav-island glass lens" aria-label="Main">
        <a href="#top" className="brand" onClick={() => setOpen(false)}>
          <span className="mark"><HackerMark size={34} ring={false} title="" /></span><span>Ledger Hackers</span>
        </a>
        <ul className="nav-links">
          {LINKS.map(([l, h]) => <li key={h}><a href={h}>{l}</a></li>)}
        </ul>
        <a href="/app" className="nav-cta orb-btn"><span className="orb-label">Staff sign in</span><span className="orb" aria-hidden="true"><span className="orb-wave a"></span><span className="orb-wave b"></span><i className="orb-bub"></i><i className="orb-bub"></i><i className="orb-bub"></i><i className="orb-bub"></i><svg className="mail" viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m4 7 8 6 8-6"/></svg><svg className="lock" viewBox="0 0 24 24"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/></svg></span></a>
        <button ref={burger} className={`burger ${open ? 'is-open' : ''}`} aria-controls="site-menu" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} onClick={() => setOpen(o => !o)}>
          <span /><span />
        </button>
      </nav>
      <div ref={menu} id="site-menu" className="menu glass" style={{ visibility: 'hidden', opacity: 0 }} aria-hidden={!open}>
        <ul>
          {[...LINKS, ['Staff sign in', '/app']].map(([l, h]) => (
            <li key={h} className="menu-row"><a className="menu-link" href={h} tabIndex={open ? 0 : -1} onClick={() => setOpen(false)}>{l}</a></li>
          ))}
        </ul>
      </div>
      <style>{`
        .nav{position:fixed;inset:20px 0 auto;z-index:30;display:flex;justify-content:center;pointer-events:none;padding:0 16px}
        .nav-island{pointer-events:auto;display:flex;align-items:center;gap:6px;height:56px;padding:0 8px 0 10px;border-radius:999px}
        .brand{display:flex;align-items:center;gap:10px;padding-right:10px;font-weight:600;font-size:15px;letter-spacing:-.02em}
        .mark{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 40%,#1d3b8f,#070b1d 70%);box-shadow:inset 0 0 0 1.5px rgba(127,216,255,.5),0 0 18px rgba(58,123,255,.45)}
        .mark .hm{width:34px;height:34px;margin-top:4px}
        .nav-links{display:flex;list-style:none;gap:2px}
        .nav-links a{display:block;padding:8px 14px;border-radius:999px;font-size:14px;color:var(--fg-2);transition:color .4s var(--out),background-color .4s var(--out)}
        .nav-links a:hover{color:var(--fg);background:rgba(255,255,255,.08)}
        .nav-cta{font-size:11.5px;margin-left:6px}
        .burger{display:none;position:relative;width:44px;height:44px;border-radius:50%}
        .burger span{position:absolute;left:13px;right:13px;height:1.5px;border-radius:2px;background:var(--fg);transition:transform .6s var(--spring),top .6s var(--spring)}
        .burger span:first-child{top:18px}.burger span:last-child{top:25px}
        .burger.is-open span:first-child{top:21.5px;transform:rotate(45deg)}
        .burger.is-open span:last-child{top:21.5px;transform:rotate(-45deg)}
        .menu{position:fixed;inset:0;z-index:-1;pointer-events:auto;display:flex;align-items:flex-end;padding:120px 24px 56px;border-radius:0;background:rgba(5,6,10,.42)}
        .menu ul{list-style:none;display:flex;flex-direction:column;gap:6px}
        .menu-row{overflow:hidden}
        .menu-link{display:block;font-size:clamp(2.4rem,11vw,4rem);font-weight:600;letter-spacing:-.045em;line-height:1.05}
        @media (max-width:900px){.nav-links,.nav-cta{display:none}.burger{display:block}.nav-island{width:100%;justify-content:space-between}}
        @media (min-width:901px){.menu{display:none}}
      `}</style>
    </header>
  );
}
