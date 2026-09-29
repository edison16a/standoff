"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useStore } from "zustand";
import { Loader, Spinner } from "@/components/ui/Loader";
import { loadGame } from "@/games/catalog";
import type { PhoneGame } from "@/platform/games/game-api";
import { motionNeedsTap } from "../permissions";
import { PhoneRoom } from "../phone-room";
import { showPlayPath } from "../play-path";
import { forgetMove, moveInto } from "../room-move";
import { ErrorScreen } from "./ErrorScreen";
import { NameClash } from "./NameClash";
import { NameScreen } from "./NameScreen";
import { PhoneBar } from "./PhoneBar";

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
  const router = useRouter();
  // Browser only (see PhoneEntry), so the room can be made up front.
  const [room] = useState(() => new PhoneRoom(code, resumeAs));
  // iOS only grants motion inside a tap, so there a reload asks for one first.
  const [tapFirst] = useState(() => resumeAs !== null && motionNeedsTap());
  const { stage, error, name, seat, game: gameId, status, hostAway, movedTo, clash } = useStore(room.store);
  const [game, setGame] = useState<PhoneGame | null>(null);
  // Read once, so a moved phone never flashes the name screen before its join starts.
  const [moving] = useState(() => moveInto(code) !== null);

  // The host remade its lobby: this phone joins the new room, skipping the
  // name screen. Otherwise a /play address takes back its seat. Joining
  // again after a development remount is safe, since dispose only closes the socket.
  useEffect(() => {
    const move = moveInto(code);
    if (move) void room.join(move.name);
    else if (!tapFirst) room.resume();
    return () => room.dispose();
  }, [room, code, tapFirst]);
  useEffect(() => {
    if (stage === "playing") forgetMove(code);
  }, [stage, code]);
  useEffect(() => {
    if (movedTo) router.replace(`/join/${movedTo}`);
  }, [movedTo, router]);

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
      {/* Once the game has ended the old seat means nothing, so its name goes too. */}
      <PhoneBar>{seat && stage !== "error" && <span className={`pill ${seat === 1 ? "pill--accent" : ""}`}>{name}</span>}</PhoneBar>
      {offline && (
        <div className="phone__notice phone__notice--action" role="status">
          <span>
            <Spinner /> {hostAway ? "The host is reconnecting." : "Reconnecting to the game."}
          </span>
          {lost && (
            <button type="button" className="btn btn--primary" onClick={() => room.reconnect()}>
              Reconnect
            </button>
          )}
        </div>
      )}
      <main className="phone__body">
        {stage === "name" && moving && <Loader label="Moving to the new room" />}
        {stage === "name" && !moving && !retry && <NameScreen code={code} onJoin={(chosen) => room.join(chosen)} />}
        {stage === "name" && !moving && retry && (
          <NameClash key={retry.reason} code={code} reason={retry.reason} name={retry.name} onJoin={(chosen, back) => room.join(chosen, back)} />
        )}
        {stage === "joining" && <Loader label={movedTo ? "Moving to the new room" : `Joining room ${code}`} />}
        {stage === "error" && error && <ErrorScreen error={error} code={code} onRetry={onRetry} />}
        {stage === "playing" && (game ? <game.Screen /> : <Loader label="Loading the game" />)}
      </main>
    </div>
  );
}
