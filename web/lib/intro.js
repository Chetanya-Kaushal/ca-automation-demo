'use client';
// Resolves when the opening intro finishes (or is skipped / not shown), so the hero can start after it
let resolve;
export const introDone = typeof window === 'undefined' ? Promise.resolve() : new Promise(r => (resolve = r));
export const finishIntro = () => resolve?.();
