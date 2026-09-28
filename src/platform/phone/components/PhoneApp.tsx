"use client";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { GitHubButton } from "@/components/ui/GitHubButton";
import { HomeLink } from "@/components/ui/HomeLink";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { loadGame } from "@/games/catalog";
import type { PhoneGame } from "@/platform/games/game-api";
import { motionNeedsTap } from "../permissions";
import { PhoneRoom } from "../phone-room";
import { showPlayPath } from "../play-path";
import { ErrorScreen } from "./ErrorScreen";
import { NameClash } from "./NameClash";
import { NameScreen } from "./NameScreen";

/**
 * The page a phone opens from the QR code, for every game: name, join,
 * then the game's own phone screen under the same header bar. A new code
 * is a new room from the name screen on, whatever this tab showed before.
 * With `name` (the /play address) it goes straight back into that
 * player's seat instead.
 */
export function PhoneApp({ code, name = null }: { code: string; name?: string | null }) {
  // The same code typed again keeps the same page, so a fresh key starts that room over.
  const [attempt, setAttempt] = useState(0);
  return <RoomScreen key={`${code}:${name}:${attempt}`} code={code} resumeAs={name} onRetry={() => setAttempt((n) => n + 1)} />;
}

function RoomScreen({ code, resumeAs, onRetry }: { code: string; resumeAs: string | null; onRetry(): void }) {
  // Browser only (see PhoneEntry), so the room can be made up front.
  const [room] = useState(() => new PhoneRoom(code, resumeAs));
  // iOS only grants motion inside a tap, so there a reload asks for one first.
  const [tapFirst] = useState(() => resumeAs !== null && motionNeedsTap());
  const { stage, error, name, seat, game: gameId, status, hostAway, clash } = useStore(room.store);
  const [game, setGame] = useState<PhoneGame | null>(null);

  useEffect(() => {
    if (!tapFirst) room.resume();
    return () => room.dispose();
  }, [room, tapFirst]);

  // Seated: the address becomes this player's own, so a reload lands back here.
  useEffect(() => {
    if (stage === "playing" && seat && name) showPlayPath(code, name);
  }, [code, stage, seat, name]);

  // Seated: load this room's game and let it take over the screen.
  useEffect(() => {
    const api = room.api;
    if (!api || !gameId) return;
    let made: PhoneGame | null = null;
    let alive = true;
    // A download that fails, or a game this build does not know, would otherwise say Loading forever.
    void (loadGame(gameId) ?? Promise.reject(new Error(`Unknown game ${gameId}`)))
      .then((mod) => {
        if (!alive) return;
        made = mod.createPhone(api);
        setGame(made);
      })
      .catch(() => alive && room.fail("load"));
    return () => {
      alive = false;
      made?.dispose();
    };
  }, [room, gameId]);

  // A first join that falls back to the stream is briefly "reconnecting", which is no news while joining.
  const offline = (stage === "playing" && (status !== "open" || hostAway)) || (stage === "joining" && status === "unreachable");
  const lost = offline && !hostAway;
  const retry = clash ?? (tapFirst && stage === "name" ? { reason: "resume" as const, name: resumeAs ?? "" } : null);

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
      {offline && (
        <div className="phone__notice phone__notice--action" role="status">
          <span>{hostAway ? "The host is reconnecting." : "Reconnecting to the game."}</span>
          {lost && (
            <button type="button" className="btn btn--primary" onClick={() => room.reconnect()}>
              Reconnect
            </button>
          )}
        </div>
      )}
      <main className="phone__body">
        {stage === "name" && !retry && <NameScreen code={code} onJoin={(chosen) => room.join(chosen)} />}
        {stage === "name" && retry && (
          <NameClash key={retry.reason} code={code} reason={retry.reason} name={retry.name} onJoin={(chosen, back) => room.join(chosen, back)} />
        )}
        {stage === "joining" && <p className="muted phone__waiting">Joining room {code}</p>}
        {stage === "error" && error && <ErrorScreen error={error} code={code} onRetry={onRetry} />}
        {stage === "playing" && (game ? <game.Screen /> : <p className="muted phone__waiting">Loading</p>)}
      </main>
    </div>
  );
}
