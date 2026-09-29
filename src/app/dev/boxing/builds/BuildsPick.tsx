"use client";
import { useEffect } from "react";
import type { BoxingHost } from "@/games/boxing/host/boxing-host";
import { PickScreen } from "@/games/boxing/host/components/PickScreen";
import { SessionContext } from "@/games/boxing/host/components/session-context";
import { useBoxingStore } from "@/games/boxing/host/host-store";
import "@/games/boxing/styles/host.css";
import "@/games/boxing/styles/pick.css";

/** Clicks move the pick and lock it in, as the real session does, without a camera. */
const session = {
  names: () => ["Edison", useBoxingStore.getState().players === 2 ? "Maya" : "Computer"],
  choose(id: 0 | 1, index: number) {
    const picks = [...useBoxingStore.getState().picks] as [number, number];
    picks[id] = index;
    useBoxingStore.setState({ picks });
  },
  lock(id: 0 | 1) {
    const locked = [...useBoxingStore.getState().locked] as [boolean, boolean];
    locked[id] = true;
    useBoxingStore.setState({ locked });
  },
} as unknown as BoxingHost;

/** Boxing's build choice on its own, without a camera. `players` is 1 or 2. Development only. */
export function BuildsPick({ players }: { players: 1 | 2 }) {
  const ready = useBoxingStore((state) => state.screen === "pick");
  useEffect(() => {
    useBoxingStore.setState({ screen: "pick", players, picks: [0, players === 2 ? 1 : 2], locked: [false, false], holding: [0.4, 0] });
  }, [players]);
  if (!ready) return null;
  return (
    <SessionContext.Provider value={session}>
      <div className="bx-stage" style={{ background: "radial-gradient(circle at 50% 40%, #1d2238, #07070c)" }}>
        <div className="bx-stage__shade" />
        <PickScreen />
      </div>
    </SessionContext.Provider>
  );
}
