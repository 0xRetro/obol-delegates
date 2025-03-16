import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb'
    },
  },
  images: {
    domains: ['assets.tally.xyz'],
  },
  reactStrictMode: true
};

export default nextConfig;
