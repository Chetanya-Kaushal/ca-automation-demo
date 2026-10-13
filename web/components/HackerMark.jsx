import { useId } from 'react';

// Original Ledger Hackers mark: hooded figure at a laptop inside a glitch ring.
// Parts carry class names so the intro can animate them; `ring={false}` gives the compact nav version.
export default function HackerMark({ size = 40, ring = true, className = '', title = 'Ledger Hackers' }) {
  const u = useId().replace(/:/g, ''); // unique gradient ids when the mark appears more than once
  return (
    <svg className={`hm ${className}`} width={size} height={size} viewBox="0 0 200 200" role={title ? 'img' : undefined} aria-label={title || undefined} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={`hm-hood${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2a5c" /><stop offset="1" stopColor="#0a1130" />
        </linearGradient>
        <linearGradient id={`hm-rim${u}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#7fd8ff" /><stop offset="1" stopColor="#ff4fb0" />
        </linearGradient>
        <linearGradient id={`hm-face${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset=".35" stopColor="#1a1410" /><stop offset=".62" stopColor="#e8b98f" />
        </linearGradient>
        <linearGradient id={`hm-lid${u}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7ff" /><stop offset="1" stopColor="#c9d3ea" />
        </linearGradient>
        <radialGradient id={`hm-glow${u}`} cx=".5" cy=".5" r=".5">
          <stop offset=".55" stopColor="#3a7bff" stopOpacity=".55" /><stop offset="1" stopColor="#3a7bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {ring && (
        <g className="hm-ring">
          <circle cx="100" cy="100" r="96" fill={`url(#hm-glow${u})`} className="hm-glow" />
          {/* three offset copies make the RGB-split glitch */}
          <circle className="hm-ring-c" cx="98" cy="100" r="82" fill="none" stroke="#3ee8ff" strokeWidth="7" strokeDasharray="22 6 9 5 30 7 4 6" opacity=".9" />
          <circle className="hm-ring-m" cx="102" cy="100" r="82" fill="none" stroke="#ff3ea5" strokeWidth="7" strokeDasharray="14 9 26 6 8 5 18 7" opacity=".85" />
          <circle className="hm-ring-w" cx="100" cy="100" r="82" fill="none" stroke="#ffffff" strokeWidth="5" strokeDasharray="30 8 12 6 20 9" />
        </g>
      )}
      <g className="hm-figure">
        <path className="hm-shoulders" d="M26 196c3-36 32-58 74-58s71 22 74 58z" fill={`url(#hm-hood${u})`} />
        <path className="hm-hood" d="M100 30c-36 0-56 28-56 66v44c14 8 34 12 56 12s42-4 56-12V96c0-38-20-66-56-66z" fill={`url(#hm-hood${u})`} />
        <path className="hm-rimlight" d="M100 30c-36 0-56 28-56 66v44" fill="none" stroke={`url(#hm-rim${u})`} strokeWidth="2.5" opacity=".9" />
        <path d="M100 54c-21 0-33 17-33 38 0 20 14 34 33 34s33-14 33-34c0-21-12-38-33-38z" fill="#040714" />
        <path className="hm-face" d="M72 96c2 17 14 28 28 28s26-11 28-28z" fill={`url(#hm-face${u})`} />
        <path className="hm-grin" d="M88 108q12 9 24 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </g>
      <g className="hm-laptop">
        <rect x="56" y="128" width="88" height="58" rx="6" fill={`url(#hm-lid${u})`} />
        <rect className="hm-screenglow" x="56" y="128" width="88" height="58" rx="6" fill="#7fd8ff" opacity="0" />
        <rect x="50" y="184" width="100" height="7" rx="3.5" fill="#9aa6c4" />
        <g className="hm-skull" fill="#0b1228">
          <path d="M100 138c-11 0-19 7-19 17 0 6 3 10 7 12v6h24v-6c4-2 7-6 7-12 0-10-8-17-19-17zm-8 13a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm16 0a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm-8 10 3 5h-6z" fillRule="evenodd" />
          <rect x="93" y="174" width="2.4" height="4" rx="1" /><rect x="98.8" y="174" width="2.4" height="4" rx="1" /><rect x="104.6" y="174" width="2.4" height="4" rx="1" />
        </g>
      </g>
    </svg>
  );
}
