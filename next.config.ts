import type { NextConfig } from "next";

/**
 * Next only renders the pages. The custom server in `server/` owns the
 * HTTP listeners and the WebSocket endpoint, so nothing here touches
 * networking.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  // The Vercel socket route leans on Node built ins through these, so they
  // are loaded at runtime instead of being bundled.
  serverExternalPackages: ["@vercel/functions", "ws", "ioredis"],
  // Phones load the dev build from the LAN address, not localhost.
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
