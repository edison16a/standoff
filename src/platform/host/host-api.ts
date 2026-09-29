import type { AudioEngine } from "@/platform/audio/audio-engine";
import type { HostRoomApi, HostRoomEvent } from "@/platform/games/game-api";
import type { Payload, Seat } from "@/platform/protocol";
import { useHostStore } from "./host-store";

/** What one room's API needs from the host that made it. */
export interface HostApiDeps {
  audio(): AudioEngine;
  subscribe(listener: (event: HostRoomEvent) => void): () => void;
  send(to: Seat | "all", payload: Payload): void;
  leave(): void;
  /** True while this API's room is still the one open. */
  live(api: HostRoomApi): boolean;
}

/**
 * The room as one game sees it. Once that room is gone the API goes
 * quiet: a timer or a late load from the last game must never send to,
 * hide the code of, or close the next room this tab opens.
 */
export function createHostApi(code: string, seats: number, deps: HostApiDeps): HostRoomApi {
  const live = () => deps.live(api);
  const api: HostRoomApi = {
    code,
    seats,
    get audio() {
      return deps.audio();
    },
    // Reading is harmless, and a stale game loop must not trip over an empty line up.
    players: () => useHostStore.getState().players,
    on: (listener) => (live() ? deps.subscribe(listener) : () => undefined),
    send: (to, payload) => {
      if (live()) deps.send(to, payload);
    },
    setPlaying: (playing) => {
      if (live()) useHostStore.setState({ playing });
    },
    leave: () => {
      if (live()) deps.leave();
    },
  };
  return api;
}
