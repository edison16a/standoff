"use client";
import { useEffect, useRef, useState } from "react";
import type { CameraKit } from "@/games/kit/camera";
import { playerColor } from "@/games/kit/players";
import { useSession } from "./session-context";

/** How long the guard must stay up to count. */
const GUARD_MS = 500;

interface Progress {
  guard: boolean;
  jab: boolean;
}

/**
 * The boxing step of calibration: each player holds their guard up, then
 * throws one punch. It finishes once everyone has done both, and there is
 * always a way past it for a player the camera struggles with.
 */
export function GuardJabCheck({ kit, done }: { kit: CameraKit; done: () => void }) {
  const session = useSession();
  const [progress, setProgress] = useState<Progress[]>(() => kit.spots.map(() => ({ guard: false, jab: false })));
  const state = useRef(progress);
  const finished = useRef(false);

  useEffect(() => {
    const since: (number | null)[] = kit.spots.map(() => null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    const update = (next: Progress[]) => {
      state.current = next;
      setProgress(next);
      if (!finished.current && next.every((p) => p.guard && p.jab)) {
        finished.current = true;
        // A beat to see the last tick before moving on.
        timer = setTimeout(done, 700);
      }
    };
    const stopFrame = kit.onFrame((frame) => {
      frame.moves.forEach((moves, i) => {
        const p = state.current[i];
        if (!p || p.guard) return;
        if (moves?.guard) since[i] ??= frame.time;
        else since[i] = null;
        if (since[i] !== null && frame.time - since[i]! >= GUARD_MS) {
          session.audio.tick();
          update(state.current.map((q, j) => (j === i ? { ...q, guard: true } : q)));
        }
      });
    });
    const stopMoves = kit.onMove((event) => {
      if (event.type !== "punch") return;
      const p = state.current[event.slot - 1];
      if (!p || !p.guard || p.jab) return;
      session.audio.punches.hit(event.style === "hook" ? "hook" : event.hand === "left" ? "jab" : "cross", event.power);
      update(state.current.map((q, j) => (j === event.slot - 1 ? { ...q, jab: true } : q)));
    });
    return () => {
      // Leaving the screen in that beat must not finish calibration behind the player's back.
      clearTimeout(timer);
      stopFrame();
      stopMoves();
    };
  }, [kit, done, session]);

  return (
    <div className="bx-check">
      {progress.map((p, i) => (
        <div key={i} className="bx-check__player" style={{ borderColor: playerColor(i + 1) }}>
          <span className="bx-check__who" style={{ background: playerColor(i + 1) }}>
            Player {i + 1}
          </span>
          <span className={`bx-check__step${p.guard ? " bx-check__step--done" : " bx-check__step--now"}`}>Guard up</span>
          <span className={`bx-check__step${p.jab ? " bx-check__step--done" : p.guard ? " bx-check__step--now" : ""}`}>Throw a jab</span>
        </div>
      ))}
      <button type="button" className="bx-link" onClick={done}>
        Skip this step
      </button>
    </div>
  );
}
