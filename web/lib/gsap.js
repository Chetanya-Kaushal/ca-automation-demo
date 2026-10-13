'use client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);
export { gsap, ScrollTrigger, useGSAP };
// Dev only: lets the console drive and inspect timelines
if (process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') { window.gsap = gsap; window.ScrollTrigger = ScrollTrigger; }
