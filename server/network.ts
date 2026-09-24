import { networkInterfaces } from "node:os";

/**
 * Finds the address other devices on the same WiFi can reach this machine
 * on. Private ranges win over anything else, and the usual Mac WiFi
 * interface (en0) wins a tie, so a VPN or Docker bridge does not end up in
 * the QR code.
 */
export function findLanAddress(): string | null {
  const candidates: { name: string; address: string }[] = [];
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) candidates.push({ name, address: entry.address });
    }
  }
  const score = ({ name, address }: { name: string; address: string }) =>
    (isPrivate(address) ? 2 : 0) + (name === "en0" || name.startsWith("wl") ? 1 : 0);
  candidates.sort((a, b) => score(b) - score(a));
  return candidates[0]?.address ?? null;
}

function isPrivate(address: string): boolean {
  const [a, b] = address.split(".").map(Number);
  return a === 10 || (a === 192 && b === 168) || (a === 172 && b !== undefined && b >= 16 && b <= 31);
}
