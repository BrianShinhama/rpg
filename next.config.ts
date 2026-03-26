import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow WebSocket upgrade via pages/api/ws
  // For Vercel, websockets need a separate deployment (Railway, Render, etc.)
  // For local dev, this works out of the box with `npm run dev`
  experimental: {
    // serverComponentsExternalPackages is now just "serverExternalPackages" in Next 15
  },
};

export default nextConfig;