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
    NEXT_PUBLIC_TEST_PAGE_PASSWORD: process.env.TEST_PAGE_PASSWORD
  }
};

export default nextConfig;
