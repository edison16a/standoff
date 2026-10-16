"use client";
import type { ReplayAngle } from "../../render/camera/replay-shots";
import { useFootballStore } from "../host-store";

/** What the shot is called on the bug. */
const ANGLE_NAME: Record<ReplayAngle, string> = {
  trace: "The pass",
  run: "The run",
};

/**
 * Over the touchdown replay: a small replay bug at the top with the
 * angle on screen, and nothing else. No bars, no stat card, so the play
 * fills the screen, and nothing about skipping: the skip button and the
 * vote live on the phones.
 */
export function ReplayOverlay() {
  const card = useFootballStore((s) => s.replayCard);
  if (!card) return null;
  return (
    <div className="fb-replay" aria-live="polite">
      <span className="fb-replay__dot" aria-hidden="true" />
      <strong>Replay</strong>
      <span className="fb-replay__angle">{ANGLE_NAME[card.angle]}</span>
    </div>
  );
}
