// Scroll → 3D bridge. ScrollTrigger writes, the R3F frame loop reads. No React re-renders per frame.
export const story = {
  hero: 0,      // 0 → 1 as the hero scrolls away
  p: 0,         // 0 → 1 across the pinned story
  pointer: { x: 0, y: 0 },
};
export const CHAPTERS = [
  { key: 'arrive', at: 0.0 },
  { key: 'read', at: 0.2 },
  { key: 'sort', at: 0.4 },
  { key: 'remind', at: 0.6 },
  { key: 'deliver', at: 0.8 },
];
