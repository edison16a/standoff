import type { HostRoomApi } from "@/platform/games/game-api";
import type { LobbySeat } from "./lobby";
import { lineUp, startHint } from "./lobby";
import type { HostStore } from "./host-store";
import { buildState, type ViewInput } from "./host-view";

/**
 * Sends the phones their state and refreshes the computer's HUD. It runs
 * every frame, but only sends when something a screen shows changed.
 */
export class Publisher {
  private lastSent = "";

  constructor(
    private readonly room: HostRoomApi,
    private readonly store: HostStore,
  ) {}

  /** Makes the next publish go out even if nothing changed, for phones that just arrived. */
  forget(): void {
    this.lastSent = "";
  }

  publish(input: ViewInput, lobby: readonly LobbySeat[]): void {
    const game = buildState(input);
    const serialized = JSON.stringify(game);
    if (serialized === this.lastSent) return;
    this.lastSent = serialized;
    this.room.send("all", game);
    this.store.setState({ game, canStart: input.phase === "lobby" && lineUp(lobby).length > 0, hint: startHint(lobby) });
  }
}
