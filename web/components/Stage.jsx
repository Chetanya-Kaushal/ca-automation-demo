'use client';
import { Component, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

const Scene = dynamic(() => import('./scene'), { ssr: false });

// Static stand-in: shown while the 3D loads, and kept if WebGL is missing or crashes
const Fallback = () => <div className="stage-fallback" />;

class Guard extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Fallback /> : this.props.children; }
}

const hasWebGL = () => {
  try { return !!document.createElement('canvas').getContext('webgl2'); } catch { return false; }
};

export default function Stage({ active }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!hasWebGL()) return;
    // Let the hero text paint and become interactive before downloading ~270 KB of 3D
    const idle = window.requestIdleCallback || (cb => setTimeout(cb, 300));
    const id = idle(() => setReady(true), { timeout: 1500 });
    return () => (window.cancelIdleCallback || clearTimeout)(id);
  }, []);
  return (
    <>
      <Fallback />
      {ready && <Guard><Scene active={active} /></Guard>}
      <style>{`
        .stage-fallback{position:absolute;inset:0;background:
          radial-gradient(40% 45% at 62% 42%,rgba(30,70,220,.55),transparent 70%),
          radial-gradient(35% 40% at 75% 55%,rgba(100,50,220,.45),transparent 70%),
          radial-gradient(30% 35% at 60% 70%,rgba(10,140,128,.3),transparent 70%),#05060a}
        .stage canvas{position:absolute!important;inset:0;animation:stage-in 1.4s cubic-bezier(.2,0,0,1) both}
        @keyframes stage-in{from{opacity:0}}
      `}</style>
    </>
  );
}
