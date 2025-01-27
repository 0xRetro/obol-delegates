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
  reactStrictMode: true,
  env: {
    TALLY_API_KEY: process.env.TALLY_API_KEY!,
  }
};

export default nextConfig;
