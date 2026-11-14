import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen fetches live simulation data on the client, so the
  // prerender-first cacheComponents model is deliberately off.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
