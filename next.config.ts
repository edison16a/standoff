import { randomBytes } from "node:crypto";
import type { NextConfig } from "next";

/**
 * Signs room tokens, so every server instance of one deployment can make
 * a host's room again when Vercel moves new connections to a fresh one
 * (see relay/room-sign). A new secret each build, written into the server
 * code, so there is nothing to set. Only server code reads it. The local
 * server reads the same value from the environment of this process.
 */
process.env.STANDOFF_BUILD_SECRET ??= randomBytes(32).toString("base64url");

/**
 * Next only renders the pages. The custom server in `server/` owns the
 * HTTP listeners and the WebSocket endpoint, so nothing here touches
 * networking.
 */
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  env: { STANDOFF_BUILD_SECRET: process.env.STANDOFF_BUILD_SECRET },
  // The Vercel socket route leans on Node built ins through these, so they
  // are loaded at runtime instead of being bundled.
  serverExternalPackages: ["@vercel/functions", "ws", "ioredis"],
  // Phones load the dev build from the LAN address, not localhost.
  allowedDevOrigins: ["*.local", "192.168.*.*", "10.*.*.*", "172.16.*.*"],
};

export default nextConfig;
