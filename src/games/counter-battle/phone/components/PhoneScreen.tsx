"use client";
import { usePhoneStore } from "../phone-store";
import { Controller } from "./Controller";
import { ResultCard } from "./ResultCard";
import { Setup } from "./Setup";

/**
 * Counter Battle on the phone: the setup pages, then the gun while this
 * player is in the match, then their result. A player who joins mid match
 * sets up and waits for the next one; one whose phone reloaded aims again
 * and drops straight back in.
 */
export function PhoneScreen({ seat }: { seat: number }) {
  const host = usePhoneStore((s) => s.host);
  const calibrated = usePhoneStore((s) => s.calibrated);
  const fighting = host?.playing && host.phase === "match" && calibrated;
  const done = host?.playing && host.phase === "results";
  return (
    <div className={`cb-phone ${fighting ? "cb-phone--play" : ""}`}>
      {fighting ? <Controller host={host} seat={seat} /> : done ? <ResultCard host={host} seat={seat} /> : <Setup seat={seat} />}
    </div>
  );
}
