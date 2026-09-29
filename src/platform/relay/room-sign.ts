import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Seat } from "@/platform/protocol";

/** About 130 bits of HMAC, which keeps every token well inside the 64 characters clients may send. */
const SIGNATURE_CHARS = 22;
const HELD = Symbol.for("standoff.roomSecret");

/**
 * The secret every server instance of one deployment shares. The build
 * writes a random one into the server code (see next.config), so the owner
 * sets nothing. STANDOFF_ROOM_SECRET, if set, wins, and also carries rooms
 * across deploys. Without either, as in a test, each process makes its own.
 */
export function roomSecret(): string {
  const configured = process.env.STANDOFF_ROOM_SECRET || process.env.STANDOFF_BUILD_SECRET;
  if (configured) return configured;
  const holder = globalThis as { [HELD]?: string };
  return (holder[HELD] ??= randomBytes(32).toString("base64url"));
}

/**
 * Signs room and seat tokens, so a server instance that never saw a room
 * can still trust them. Rooms live in one instance's memory, and when
 * Vercel sends new connections to a fresh instance, the host's signed
 * token lets it make the same room there (see RoomOps.resumeHost), and
 * each phone's signed seat token takes back its own seat.
 */
export class RoomSigner {
  constructor(private readonly secret: string = roomSecret()) {}

  /** A host token for this room, bound to its code, game and seat count. */
  hostToken(code: string, game: string, seats: number): string {
    const nonce = randomBytes(12).toString("base64url");
    return `${nonce}.${this.sign(`host|${code}|${game}|${seats}|${nonce}`)}`;
  }

  /** True if this server's deployment made `token` for exactly this room. */
  checkHost(token: string, code: string, game: string, seats: number): boolean {
    const [nonce, signature, extra] = token.split(".");
    if (!nonce || !signature || extra !== undefined) return false;
    return same(signature, this.sign(`host|${code}|${game}|${seats}|${nonce}`));
  }

  /**
   * A seat token that names its seat. It is bound to the room's host
   * token as well, so it means nothing in a later room with the same code.
   */
  seatToken(room: { code: string; hostToken: string }, seat: Seat): string {
    const nonce = randomBytes(9).toString("base64url");
    return `${seat}.${nonce}.${this.sign(`seat|${room.code}|${room.hostToken}|${seat}|${nonce}`)}`;
  }

  /** The seat a token was made for in this room, or null for a token this deployment did not sign for it. */
  seatOf(token: string | undefined, room: { code: string; hostToken: string }): Seat | null {
    const [seat, nonce, signature, extra] = (token ?? "").split(".");
    if (!seat || !nonce || !signature || extra !== undefined || !/^\d$/.test(seat)) return null;
    return same(signature, this.sign(`seat|${room.code}|${room.hostToken}|${seat}|${nonce}`)) ? Number(seat) : null;
  }

  private sign(text: string): string {
    return createHmac("sha256", this.secret).update(text).digest("base64url").slice(0, SIGNATURE_CHARS);
  }
}

function same(a: string, b: string): boolean {
  return a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
