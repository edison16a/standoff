"use client";
import { useEffect, useRef, useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { findGame, loadGame } from "@/games/catalog";
import type { HostGame } from "@/platform/games/game-api";
import { useHostStore } from "../host-store";
import { useHostRoom } from "./host-context";
import { JoinPanel } from "./JoinPanel";

/**
 * An open room: the game fills the window, and the platform frames it the
 * same way for every game. The logo top left goes home, the tools sit top
 * right, and the join code waits until the game starts.
 */
export function RoomShell() {
  const host = useHostRoom();
  const room = useHostStore((state) => state.room);
  const status = useHostStore((state) => state.status);
  const rootRef = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<HostGame | null>(null);
  const info = room ? findGame(room.game) : undefined;

  // Keyed on the code and game alone. A reconnect stores a fresh room
  // object for the same room, and the running game must survive that and
  // get its resync event, not be torn down and built again.
  const code = room?.code ?? null;
  const gameId = room?.game ?? null;

  useEffect(() => {
    const api = host.api;
    const loading = code && gameId ? loadGame(gameId) : null;
    if (!api || !loading) return;
    let made: HostGame | null = null;
    let alive = true;
    void loading.then((mod) => {
      if (!alive) return;
      made = mod.createHost(api);
      setGame(made);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [host, code, gameId]);

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  };

  return (
    <div ref={rootRef} className="shell">
      {game && <game.Screen />}
      <div className="shell__brand">
        <HomeLink onClick={() => host.leave()} />
      </div>
      <div className="shell__tools">
        {game?.Tools && <game.Tools />}
        <ThemeToggle />
        <IconButton icon="expand" label="Full screen" onClick={toggleFullscreen} />
        <GitHubButton compact />
      </div>
      {game && <JoinPanel title={info?.title ?? "Standoff"} Extra={game.JoinExtra} placement={game.join} />}
      {status !== "open" && <p className="shell__notice">Reconnecting</p>}
    </div>
  );
}
