/**
 * Runtime settings, read once from the environment.
 *
 * Two listeners run side by side. The computer opens the plain HTTP one on
 * localhost, which browsers already treat as secure. Phones use the HTTPS
 * one on the LAN address, because iOS and Android only hand motion sensor
 * data to pages served over HTTPS.
 */
export interface ServerConfig {
  dev: boolean;
  bindHost: string;
  httpPort: number;
  httpsPort: number;
  /** Overrides the address phones are sent to, e.g. a hostname on your network. */
  publicHost: string | null;
}

function readPort(name: string, fallback: number): number {
  const raw = process.env[name];
  const port = raw ? Number.parseInt(raw, 10) : fallback;
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`${name} must be a port number, got "${raw}"`);
  }
  return port;
}

export function readConfig(): ServerConfig {
  return {
    dev: process.env.NODE_ENV !== "production",
    bindHost: process.env.HOST ?? "0.0.0.0",
    httpPort: readPort("PORT", 3000),
    httpsPort: readPort("HTTPS_PORT", 3443),
    publicHost: process.env.PUBLIC_HOST?.trim() || null,
  };
}
