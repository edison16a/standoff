"use client";
import { useEffect, useRef, useState } from "react";
import type { CameraKit } from "@/games/kit/camera";
import { playerColor } from "@/games/kit/players";

/**
 * The live check at the end of calibration: every player jumps once and
 * sees their cube hop when the camera reads it. It moves on by itself a
 * moment after the last one lands.
 */
export function JumpCheck({ kit, onJump, done }: { kit: CameraKit; onJump: () => void; done: () => void }) {
  const [jumped, setJumped] = useState<boolean[]>(() => kit.spots.map(() => false));
  const [hops, setHops] = useState<number[]>(() => kit.spots.map(() => 0));
  const callbacks = useRef({ onJump, done });
  useEffect(() => {
    callbacks.current = { onJump, done };
  }, [onJump, done]);

  useEffect(
    () =>
      kit.onMove((event) => {
        if (event.type !== "jump") return;
        callbacks.current.onJump();
        setHops((list) => list.map((n, i) => (i === event.slot - 1 ? n + 1 : n)));
        setJumped((list) => list.map((seen, i) => seen || i === event.slot - 1));
      }),
    [kit],
  );

  const all = jumped.every(Boolean);
  useEffect(() => {
    if (!all) return;
    const timer = setTimeout(() => callbacks.current.done(), 900);
    return () => clearTimeout(timer);
  }, [all]);

  return (
    <div className="cg-jumpcheck">
      {kit.spots.map((spot, i) => (
        <div key={spot.slot} className={`cg-jumpcheck__player${jumped[i] ? " cg-jumpcheck__player--ok" : ""}`} style={{ borderColor: playerColor(spot.slot) }}>
          <span key={hops[i]} className="cg-jumpcheck__cube" style={{ background: playerColor(spot.slot) }} aria-hidden="true" />
          <span className="cg-jumpcheck__label">{jumped[i] ? "Got it" : `Player ${spot.slot}, jump`}</span>
        </div>
      ))}
      <button type="button" className="cg-button cg-button--quiet" onClick={() => callbacks.current.done()}>
        Skip
      </button>
    </div>
  );
}
