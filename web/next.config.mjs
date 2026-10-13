/** Static export: the Cloudflare Worker serves the built files from backend/public */
export default {
  output: 'export',
  images: { unoptimized: true },
  reactStrictMode: true,
  experimental: { optimizePackageImports: ['@react-three/drei', 'gsap'] },
};
