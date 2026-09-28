"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { Loader, Spinner } from "@/components/ui/Loader";
import { loadGame } from "@/games/catalog";
import type { PhoneGame } from "@/platform/games/game-api";
import { PhoneRoom } from "../phone-room";
import { forgetMove, moveInto } from "../room-move";
import { ErrorScreen } from "./ErrorScreen";
import { NameScreen } from "./NameScreen";
import { PhoneBar } from "./PhoneBar";

/**
 * The page a phone opens from the QR code, for every game: name, join,
 * then the game's own phone screen under the same header bar. A new code
 * is a new room from the name screen on, whatever this tab showed before.
 */
export function PhoneApp({ code }: { code: string }) {
  // The same code typed again keeps the same page, so a fresh key starts that room over.
  const [attempt, setAttempt] = useState(0);
  return <RoomScreen key={`${code}:${attempt}`} code={code} onRetry={() => setAttempt((n) => n + 1)} />;
}

function RoomScreen({ code, onRetry }: { code: string; onRetry(): void }) {
  const router = useRouter();
  // Browser only (see PhoneEntry), so the room can be made up front.
  const [room] = useState(() => new PhoneRoom(code));
  const { stage, error, name, seat, game: gameId, status, hostAway, movedTo } = useStore(room.store);
  const [game, setGame] = useState<PhoneGame | null>(null);

  // The host remade its lobby: this phone joins the new room, skipping the name screen.
  // Joining again after a development remount is safe, since dispose only closes the socket.
  useEffect(() => {
    const move = moveInto(code);
    if (move) void room.join(move.name);
    return () => room.dispose();
  }, [room, code]);
  useEffect(() => {
    if (stage === "playing") forgetMove(code);
  }, [stage, code]);
  useEffect(() => {
    if (movedTo) router.replace(`/join/${movedTo}`);
  }, [movedTo, router]);

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

  return (
    <div className="phone">
      <PhoneBar>{seat && <span className={`pill ${seat === 1 ? "pill--accent" : ""}`}>{name}</span>}</PhoneBar>
      {offline && (
        <p className="phone__notice">
          <Spinner /> {hostAway ? "The host is reconnecting." : "Reconnecting to the game."}
        </p>
      )}
      <main className="phone__body">
        {stage === "name" && <NameScreen code={code} onJoin={(chosen) => room.join(chosen)} />}
        {stage === "joining" && <Loader label={movedTo ? "Moving to the new room" : `Joining room ${code}`} />}
        {stage === "error" && error && <ErrorScreen error={error} code={code} onRetry={onRetry} />}
        {stage === "playing" && (game ? <game.Screen /> : <Loader label="Loading the game" />)}
      </main>
    </div>
  );
}
