"use client";
import { useNbaStore } from "../host-store";

/**
 * Over the replay of the winning basket: a small broadcast style replay
 * bug in the corner and whose view it is, and nothing else. No letterbox
 * bars, so the replay fills the screen, and nothing about skipping: the
 * skip button and the vote live on the phones.
 */
export function ReplayBar() {
  const replay = useNbaStore((s) => s.replay);
  if (!replay) return null;
  return (
    <div className="nba-replay" aria-live="polite">
      <div className="nba-replay__bug">
        <span className="nba-replay__dot" aria-hidden="true" />
        <strong>Replay</strong>
        <span>{replay.view === "scorer" ? `${replay.scorer}'s view` : "The defender's view"}</span>
      </div>
    </div>
  );
}
