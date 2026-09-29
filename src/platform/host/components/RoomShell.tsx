"use client";
import { SettingsButton } from "@/platform/settings/SettingsButton";
import { useEffect, useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { FullscreenButton } from "@/components/ui/FullscreenButton";
import { Icon } from "@/components/ui/Icon";
import { Loader, Spinner } from "@/components/ui/Loader";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { findGame, loadGame } from "@/games/catalog";
import type { GameModule, HostGame } from "@/platform/games/game-api";
import { useHostStore } from "../host-store";
import { useHostRoom } from "./host-context";
import { JoinPanel } from "./JoinPanel";
import { RoomAlert } from "./RoomAlert";

/** A game whose code fails to download gets one more try after this long. */
export const LOAD_RETRY_MS = 1500;

/** Loads a game's code, trying once more if the first download fails. */
export function loadWithRetry(id: string, wait = LOAD_RETRY_MS): Promise<GameModule> {
  const load = () => loadGame(id) ?? Promise.reject(new Error(`Unknown game ${id}`));
  return load().catch(() => new Promise<void>((resolve) => setTimeout(resolve, wait)).then(load));
}

/**
 * An open room: the game fills the window, and the platform frames it the
 * same way for every game. The logo top left goes home, the tools sit top
 * right, and the join code waits until the game starts. A lost room takes
 * over the screen with a way to make a new one (see RoomAlert).
 */
export function RoomShell() {
  const host = useHostRoom();
  const room = useHostStore((state) => state.room);
  const status = useHostStore((state) => state.status);
  const health = useHostStore((state) => state.health);
  const [game, setGame] = useState<HostGame | null>(null);
  const [failed, setFailed] = useState(false);
  const info = room ? findGame(room.game) : undefined;

  // Keyed on the code and game alone. A reconnect stores a fresh room
  // object for the same room, and the running game must survive that and
  // get its resync event, not be torn down and built again.
  const code = room?.code ?? null;
  const gameId = room?.game ?? null;

  useEffect(() => {
    const api = host.api;
    if (!api || !code || !gameId) return;
    let made: HostGame | null = null;
    let alive = true;
    loadWithRetry(gameId)
      .then((mod) => {
        if (!alive) return;
        made = mod.createHost(api);
        setGame(made);
        // A hidden code has nothing to check until the game shows it.
        useHostStore.setState({ joinHidden: made.join === "hidden" });
      })
      // Without this the screen said Opening forever, with no code to scan.
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [host, code, gameId]);

  const title = info?.title ?? "the game";
  return (
    <div className="shell">
      {game ? (
        <game.Screen />
      ) : failed ? (
        <div className="shell__failed" role="alert">
          <p>Could not load {title}.</p>
          {/* The room comes back after the reload, phones and all. */}
          <button type="button" className="btn btn--primary" onClick={() => location.reload()}>
            <Icon name="refresh" />
            Reload
          </button>
        </div>
      ) : (
        <Loader label={`Opening ${title}`} className="shell__loader" />
      )}
      <div className="shell__brand">
        <HomeLink onClick={() => host.leave()} />
      </div>
      <div className="shell__tools">
        {game?.Tools && <game.Tools />}
        <SettingsButton />
        <ThemeToggle />
        <FullscreenButton />
        <GitHubButton compact />
      </div>
      {game && <JoinPanel title={info?.title ?? "Standoff"} Extra={game.JoinExtra} placement={game.join} />}
      <Notice status={status} fixing={health === "fixing"} />
      <RoomAlert />
    </div>
  );
}

function Notice({ status, fixing }: { status: string; fixing: boolean }) {
  const text = fixing ? "Making a new room" : status === "unreachable" ? "Can't reach the game server" : status !== "open" ? "Reconnecting" : null;
  if (!text) return null;
  return (
    <p className="shell__notice" role="status">
      <Spinner /> {text}
    </p>
  );
}
