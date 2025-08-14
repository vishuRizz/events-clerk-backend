// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  eslint: {
    // Don't block production builds because of ESLint errors
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't block production builds because of TypeScript errors
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
