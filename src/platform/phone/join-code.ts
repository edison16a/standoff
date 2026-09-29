import { ROOM_CODE_PATTERN } from "@/platform/protocol";

/**
 * Pulls a room code out of whatever a player typed or scanned: the code
 * itself, or a join link like https://standoff.example/join/ABCD from the
 * host's QR code. Returns null for anything else, so a stray QR code
 * never sends a phone somewhere unexpected. The phone always joins on its
 * own site, whatever address the link names.
 */
export function roomCodeFrom(text: string): string | null {
  const raw = text.trim();
  const direct = raw.toUpperCase();
  if (ROOM_CODE_PATTERN.test(direct)) return direct;
  let path: string;
  try {
    path = new URL(raw).pathname;
  } catch {
    return null;
  }
  const match = /^\/join\/([a-z]+)\/?$/i.exec(path);
  const code = match?.[1]?.toUpperCase() ?? "";
  return ROOM_CODE_PATTERN.test(code) ? code : null;
}
