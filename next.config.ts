import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Internal inventory app: every screen reads live, per-user data, so we keep
  // classic dynamic rendering instead of Cache Components.
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: { bodySizeLimit: "10mb" },
  },
};

export default nextConfig;
