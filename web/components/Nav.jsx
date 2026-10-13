'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, useGSAP } from '@/lib/gsap';
import Icon from './Icon';
import { lenis } from '@/lib/smooth';

const LINKS = [['Story', '#story'], ['Features', '#features'], ['A day', '#day'], ['Demo', '#demo'], ['Roadmap', '#roadmap']];

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
    gsap.from('.nav-island', { y: -30, autoAlpha: 0, duration: 1.1, ease: 'expo.out', delay: .2 });
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
          <span className="mark">LH</span><span>Ledger Hackers</span>
        </a>
        <ul className="nav-links">
          {LINKS.map(([l, h]) => <li key={h}><a href={h}>{l}</a></li>)}
        </ul>
        <a href="/app" className="nav-cta">Staff sign in<Icon name="up" size={14} /></a>
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
        .mark{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:11px;font-weight:700;letter-spacing:-.03em;
          background:linear-gradient(160deg,#fff,#c9d4ff);color:#05060a;box-shadow:inset 0 -2px 6px rgba(0,0,0,.18)}
        .nav-links{display:flex;list-style:none;gap:2px}
        .nav-links a{display:block;padding:8px 14px;border-radius:999px;font-size:14px;color:var(--fg-2);transition:color .4s var(--out),background-color .4s var(--out)}
        .nav-links a:hover{color:var(--fg);background:rgba(255,255,255,.08)}
        .nav-cta{display:inline-flex;align-items:center;gap:6px;height:40px;padding:0 16px;margin-left:6px;border-radius:999px;background:var(--fg);color:var(--ink);font-size:14px;font-weight:500;transition:transform .5s var(--spring)}
        .nav-cta:active{transform:scale(.96)}
        .burger{display:none;position:relative;width:44px;height:44px;border-radius:50%}
        .burger span{position:absolute;left:13px;right:13px;height:1.5px;border-radius:2px;background:var(--fg);transition:transform .6s var(--spring),top .6s var(--spring)}
        .burger span:first-child{top:18px}.burger span:last-child{top:25px}
        .burger.is-open span:first-child{top:21.5px;transform:rotate(45deg)}
        .burger.is-open span:last-child{top:21.5px;transform:rotate(-45deg)}
        .menu{position:fixed;inset:0;z-index:-1;pointer-events:auto;display:flex;align-items:flex-end;padding:120px 24px 56px;border-radius:0;background:rgba(5,6,10,.72)}
        .menu ul{list-style:none;display:flex;flex-direction:column;gap:6px}
        .menu-row{overflow:hidden}
        .menu-link{display:block;font-size:clamp(2.4rem,11vw,4rem);font-weight:600;letter-spacing:-.045em;line-height:1.05}
        @media (max-width:900px){.nav-links,.nav-cta{display:none}.burger{display:block}.nav-island{width:100%;justify-content:space-between}}
        @media (min-width:901px){.menu{display:none}}
      `}</style>
    </header>
  );
}
