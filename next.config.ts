import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack to this repo so parent lockfiles do not affect module resolution.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
