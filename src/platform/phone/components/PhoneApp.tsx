"use client";
import { useEffect, useState } from "react";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { loadGame } from "@/games/catalog";
import type { PhoneGame } from "@/platform/games/game-api";
import { PhoneRoom } from "../phone-room";
import { usePhoneStore } from "../phone-store";
import { ErrorScreen } from "./ErrorScreen";
import { NameScreen } from "./NameScreen";

/**
 * The page a phone opens from the QR code, for every game: name, join,
 * then the game's own phone screen under the same header bar.
 */
export function PhoneApp({ code }: { code: string }) {
  // Browser only (see PhoneEntry), so the room can be made up front.
  const [room] = useState(() => new PhoneRoom(code));
  const { stage, error, name, seat, game: gameId, status, hostAway } = usePhoneStore();
  const [game, setGame] = useState<PhoneGame | null>(null);

  useEffect(() => () => room.dispose(), [room]);

  // Seated: load this room's game and let it take over the screen.
  useEffect(() => {
    const api = room.api;
    const loading = gameId ? loadGame(gameId) : null;
    if (!api || !loading) return;
    let made: PhoneGame | null = null;
    let alive = true;
    void loading.then((mod) => {
      if (!alive) return;
      made = mod.createPhone(api);
      setGame(made);
    });
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [room, gameId]);

  const offline = stage === "playing" && (status !== "open" || hostAway);

  return (
    <div className="phone">
      <header className="phone__bar">
        <HomeLink />
        <div className="phone__bar-actions">
          {seat && <span className={`pill ${seat === 1 ? "pill--accent" : ""}`}>{name}</span>}
          <ThemeToggle />
          <GitHubButton compact />
        </div>
      </header>
      {offline && <p className="phone__notice">{hostAway ? "The host is reconnecting." : "Reconnecting to the game."}</p>}
      <main className="phone__body">
        {stage === "name" && <NameScreen code={code} onJoin={(chosen) => room.join(chosen)} />}
        {stage === "joining" && <p className="muted phone__waiting">Joining room {code}</p>}
        {stage === "error" && error && <ErrorScreen error={error} />}
        {stage === "playing" && (game ? <game.Screen /> : <p className="muted phone__waiting">Loading</p>)}
      </main>
    </div>
  );
}
