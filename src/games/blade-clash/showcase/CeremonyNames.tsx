"use client";
import type { BladeHost } from "../host/blade-host";
import { useBladeStore } from "../host/host-store";
import { SessionContext } from "../host/components/session-context";
import { Victory } from "../host/components/Victory";
import type { Slot } from "../players";

/** Sample players for the showcase's ceremony: the Knight and the Star Knight. */
export function showSampleWin(winner: Slot): void {
  useBladeStore.setState({
    names: { 1: "Edison", 2: "Maya" },
    seats: {
      1: { connected: true, pick: "knight", ready: true, computer: false },
      2: { connected: true, pick: "star", ready: true, computer: false },
    },
    hud: { phase: "matchOver", score: { 1: winner === 1 ? 5 : 4, 2: winner === 2 ? 5 : 4 }, scorer: winner, countdown: null, winner, rematchVotes: { 1: true, 2: false } },
  });
}

/**
 * The ceremony's names and result over the showcase with `?ceremony`, as
 * the host shows them, for looking it over in development. The Menu
 * button does nothing here.
 */
export function CeremonyNames() {
  const idle = { backToLobby: () => undefined } as unknown as BladeHost;
  return (
    <SessionContext.Provider value={idle}>
      <Victory />
    </SessionContext.Provider>
  );
}
