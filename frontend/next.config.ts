import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @ts-ignore - Next.js 15 allows boolean for devIndicators
  devIndicators: false,
  experimental: {
    // Older Next.js versions might have turbopack options here
  },
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
