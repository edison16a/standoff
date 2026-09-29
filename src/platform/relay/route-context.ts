import type { Backend } from "./backend";
import { sharedStore } from "./create-backend";
import type { RelayContext } from "./relay-types";

/** Set by the local server, which knows the network address phones must use. */
const PHONE_ORIGIN_ENV = "STANDOFF_PHONE_ORIGIN";

/**
 * The relay context for a client that reaches us through a Next route.
 * On Vercel, join links point back at whatever address the host used. The
 * local server names the phone address itself, since the host page is on
 * localhost and a phone cannot open that. It is also a single process, so
 * its rooms are always shared.
 */
export function routeContext(request: Request, backend: Backend, deadline: number | null): RelayContext {
  const local = process.env[PHONE_ORIGIN_ENV];
  const origin = local ?? requestOrigin(request);
  return {
    backend,
    joinUrlFor: (code) => `${origin}/join/${code}`,
    now: Date.now,
    client: clientAddress(request.headers),
    sharedRooms: simulatedInstances() ? false : local !== undefined || sharedStore(),
    deadline,
  };
}

/**
 * Set by a local run that stands in for several Vercel instances, each
 * with rooms of its own, so clients act as they would there.
 */
export function simulatedInstances(): boolean {
  return process.env.STANDOFF_SIMULATE_INSTANCES === "1";
}

/** Called by the local server before Next starts. */
export function setLocalPhoneOrigin(origin: string): void {
  process.env[PHONE_ORIGIN_ENV] = origin;
}

/** The address the host used to reach us, so the QR code points at the same deployment. */
function requestOrigin(request: Request): string {
  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? url.host;
  return `https://${host}`;
}

/** Vercel's edge sets the first forwarded address. Anything unlabelled shares one budget. */
function clientAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}
