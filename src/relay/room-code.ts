import { randomBytes, randomInt } from "node:crypto";
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from "@/shared/protocol";

/** A short code players could also read out loud or type by hand. */
export function makeRoomCode(): string {
  let code = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * The secret that lets a reloaded tab reclaim its seat. It never shows up
 * in a URL, so a spectator who scans the QR code cannot take over a player.
 */
export function makeToken(): string {
  return randomBytes(18).toString("base64url");
}
