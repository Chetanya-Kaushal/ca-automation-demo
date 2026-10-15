import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata = {
  title: 'Ledger Hackers — Paperwork that files itself',
  description: 'Client documents arrive on WhatsApp, email and private upload links. Ledger Hackers sorts them, chases what is missing, and delivers the filed return. Built for CA firms.',
  icons: { icon: '/favicon.svg' },
};
export const viewport = { themeColor: '#05060a', colorScheme: 'dark' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Real refraction through the SVG filter only works in Chromium; elsewhere glass falls back to blur */}
        <script dangerouslySetInnerHTML={{ __html: "var d=document.documentElement;if(navigator.userAgentData&&(navigator.hardwareConcurrency||4)>=8&&(navigator.deviceMemory||8)>=8)d.classList.add('lens-ok');if((navigator.hardwareConcurrency||8)<4||(navigator.deviceMemory||8)<4)d.classList.add('weak');d.classList.add(matchMedia('(prefers-reduced-motion: reduce)').matches?'no-intro':'intro-on')" }} />
        <link rel="stylesheet" href="/orb-btn.css" />
      </head>
      <body>
        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <filter id="liquid" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="n" />
            <feGaussianBlur in="n" stdDeviation="2" result="nb" />
            <feDisplacementMap in="SourceGraphic" in2="nb" scale="28" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
