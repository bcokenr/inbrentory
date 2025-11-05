import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    ppr: 'incremental'
  },
  images: {
    remotePatterns: [new URL('https://a6il6bs8nky4i26x.public.blob.vercel-storage.com/**')],
  },
};

export default nextConfig;
