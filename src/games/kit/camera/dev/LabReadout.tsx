"use client";
import { useEffect, useState } from "react";
import { playerColor } from "@/games/kit/players";
import type { MoveEvent, MoveState } from "../engine/gestures/moves";
import type { CameraKit } from "../host/camera-kit";
import { useKitStatus } from "../ui/use-kit";

const LOG_LENGTH = 14;

/** Describes a move in a few words, for the log. */
function say(event: MoveEvent): string {
  switch (event.type) {
    case "punch":
      return `${event.hand} ${event.style} punch, power ${event.power.toFixed(2)}`;
    case "lane":
      return `lane ${event.lane}`;
    case "lean":
      return event.side === 0 ? "upright" : `lean ${event.side < 0 ? "left" : "right"}`;
    case "guard":
      return event.up ? "guard up" : "guard down";
    default:
      return event.type;
  }
}

/**
 * The lab's live readout: every player's move state and a log of moves
 * as they happen. Development only, for trying thresholds by hand.
 */
export function LabReadout({ kit }: { kit: CameraKit }) {
  const status = useKitStatus(kit);
  const [states, setStates] = useState<(MoveState | null)[]>([]);
  const [log, setLog] = useState<{ id: number; slot: number; text: string }[]>([]);

  useEffect(() => {
    const timer = setInterval(() => setStates(Array.from({ length: kit.players }, (_, i) => kit.moves(i + 1))), 100);
    let id = 0;
    const stop = kit.onMove((event) => setLog((old) => [{ id: id++, slot: event.slot, text: say(event) }, ...old].slice(0, LOG_LENGTH)));
    return () => {
      clearInterval(timer);
      stop();
    };
  }, [kit]);

  return (
    <aside className="cam-lab__readout" data-testid="camera-readout">
      <p className="cam-lab__stats">
        {status.fake ? "Test camera" : status.camera.label} | model {status.model.variant} on {status.model.delegate ?? "..."} |{" "}
        {status.fps.toFixed(1)} fps | {status.inferenceMs.toFixed(0)} ms
      </p>
      {states.map((state, i) =>
        state ? (
          <div key={i} className="cam-lab__player" style={{ borderColor: playerColor(i + 1) }} data-slot={i + 1}>
            <strong>Player {i + 1}</strong> {state.present ? "in view" : "away"} {state.calibrated ? "" : "(not calibrated)"}
            <br />
            lane {state.lane} ({state.offset.toFixed(2)}) | {state.jumping ? "JUMP" : "ground"} | {state.ducking ? "DUCK" : "up"} | lean{" "}
            {state.lean} | {state.guard ? "GUARD" : "open"}
            <br />
            rise {state.amounts.rise.toFixed(2)} drop {state.amounts.drop.toFixed(2)} lean {state.amounts.lean.toFixed(2)}
          </div>
        ) : null,
      )}
      <ol className="cam-lab__log" data-testid="camera-log">
        {log.map((entry) => (
          <li key={entry.id} style={{ color: playerColor(entry.slot) }}>
            P{entry.slot} {entry.text}
          </li>
        ))}
      </ol>
    </aside>
  );
}
