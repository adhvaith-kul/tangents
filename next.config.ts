import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every screen fetches live simulation data on the client, so the
  // prerender-first cacheComponents model is deliberately off.
  // The dev badge sits on top of the account pill in the bottom-left corner.
  devIndicators: false,
  // A second instance (a test run on another port) needs its own build directory.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
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
