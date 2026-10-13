'use client';
import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { story } from '@/lib/store';

// ─── wallpaper: slow mesh-gradient the glass refracts ─────────────────────
const wallVert = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`;
const wallFrag = `
uniform float t; uniform float p; varying vec2 vUv;
vec3 blob(vec2 uv, vec2 c, float r, vec3 col){ float d = length((uv - c) * vec2(1.75, 1.)); return col * smoothstep(r, 0., d); }
void main(){
  vec2 uv = vUv; float s = t * .05;
  vec3 c = vec3(.012, .015, .032);
  c += blob(uv, vec2(.40 + .05*sin(s*3.1), .56 + .04*cos(s*2.3)), .30, vec3(.09, .24, .86)) * .95;
  c += blob(uv, vec2(.60 + .06*cos(s*2.7), .47 + .05*sin(s*3.4)), .28, vec3(.40, .20, .86)) * .85;
  c += blob(uv, vec2(.50 + .07*sin(s*1.9 + p*3.), .36 + .04*cos(s*2.1)), .24, vec3(.04, .55, .50)) * .55;
  c += blob(uv, vec2(.64 + .04*sin(s*2.2), .64), .17, vec3(.95, .58, .16)) * (.12 + .3*p);
  c *= smoothstep(1., .2, length((uv - .5) * vec2(1.25, 1.7)));
  gl_FragColor = vec4(c, 1.);
}`;
export default function Wallpaper({ still }) {
  const uniforms = useMemo(() => ({ t: { value: 0 }, p: { value: 0 } }), []);
  useFrame((_, dt) => { if (!still) uniforms.t.value += dt; uniforms.p.value = story.p; });
  return (
    <mesh position={[0, 0, -9]} renderOrder={-1}>
      <planeGeometry args={[64, 36]} />
      <shaderMaterial vertexShader={wallVert} fragmentShader={wallFrag} uniforms={uniforms} depthWrite={false} />
    </mesh>
  );
}
