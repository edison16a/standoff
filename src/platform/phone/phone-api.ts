import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { PhoneRoomApi, PhoneRoomEvent } from "@/platform/games/game-api";
import type { Payload } from "@/platform/protocol";

export interface PhoneApiDeps {
  code: string;
  seat: number;
  seats: number;
  audio: AudioEngine;
  /** Motion access may settle after the seat does, so it is read each time. */
  motion(): PhoneRoomApi["motion"];
  send(payload: Payload): void;
  sendLossy(payload: Payload): void;
  on(listener: (event: PhoneRoomEvent) => void): () => void;
}

/** The room as a game on the phone sees it, once seated. */
export function createPhoneApi(deps: PhoneApiDeps): PhoneRoomApi {
  const { code, seat, seats, audio } = deps;
  return {
    code,
    seat,
    seats,
    audio,
    get motion() {
      return deps.motion();
    },
    send: (payload) => deps.send(payload),
    sendLossy: (payload) => deps.sendLossy(payload),
    on: (listener) => deps.on(listener),
  };
}
