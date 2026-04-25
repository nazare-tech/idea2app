import type { NextConfig } from "next";
import fs from "fs";
import path from "path";

// Walk up from cwd until we find node_modules (handles git worktrees).
function findRoot(dir: string): string {
  if (fs.existsSync(path.join(dir, "node_modules"))) return dir;
  const parent = path.dirname(dir);
  return parent === dir ? dir : findRoot(parent);
}

const nextConfig: NextConfig = {
  // Pin Turbopack to the directory that owns node_modules so worktrees work.
  turbopack: {
    root: findRoot(process.cwd()),
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openrouter.ai https://api.anthropic.com https://api.stripe.com https://*.stripe.com https://contribution.usercontent.google.com https://lh3.googleusercontent.com",
      "frame-src 'self' https://*.stripe.com",
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ")

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
