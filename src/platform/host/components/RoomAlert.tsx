"use client";
import { useHostStore, type RoomProblem } from "../host-store";
import { useHostRoom } from "./host-context";
import { RegenerateButton } from "./RegenerateButton";

const TEXT: Record<RoomProblem, { title: string; body: string }> = {
  lost: {
    title: "This room was lost",
    body: "The server that held it is gone. Make a new room, and phones that can still hear this one move over. The rest scan the new code.",
  },
  unreachable: {
    title: "Phones can't reach this room",
    body: "New phones may get Room not found. Make a new room, and the players already in move over with it.",
  },
  ending: {
    title: "This room is about to close",
    body: "Its server is going away. Make a new room now, and the players move over with it.",
  },
  "not-made": {
    title: "Could not make a new room",
    body: "Check the connection and try again.",
  },
};

/**
 * Takes over the big screen when the room is broken and players are in
 * it, so the host never sits showing a dead code. One press makes a new
 * room and moves everyone who can still hear the old one.
 */
export function RoomAlert() {
  const host = useHostRoom();
  const health = useHostStore((state) => state.health);
  const problem = useHostStore((state) => state.problem);
  // A room that is gone, or going, has nothing to keep.
  const gone = useHostStore((state) => state.roomGone || state.problem === "ending");
  if (health !== "lost" || !problem) return null;
  const { title, body } = TEXT[problem];
  return (
    <div className="room-alert" role="alertdialog" aria-labelledby="room-alert-title">
      <div className="room-alert__card">
        <h2 id="room-alert-title" className="room-alert__title">
          {title}
        </h2>
        <p className="room-alert__body">{body}</p>
        <RegenerateButton className="btn btn--primary btn--lg btn--block" />
        {gone ? (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => host.leave()}>
            Back to the games
          </button>
        ) : (
          <button type="button" className="btn btn--ghost btn--block" onClick={() => host.keepRoom()}>
            Keep this room
          </button>
        )}
      </div>
    </div>
  );
}
