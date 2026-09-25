"use client";
import { lazy, Suspense } from "react";
import { StepShell } from "@/games/kit/steps/StepShell";
import { CHARACTERS, TEAMS } from "../../roster";
import { useControllerStore } from "../controller-store";
import { useController } from "./session-context";
import { StarStep } from "./StarStep";

const Preview = lazy(() => import("./PreviewCanvas"));

const STEPS = ["Star", "Ready"] as const;
const INDEX = { star: 0, ready: 1 } as const;
const TITLES = { star: "Pick your star", ready: "Ready to play" } as const;

function ReadyStep() {
  const host = useControllerStore((s) => s.host);
  if (!host?.pick) return null;
  const c = CHARACTERS[host.pick];
  const team = host.team;
  const gameOn = host.phase !== "lobby" && !host.playing;
  const note = gameOn
    ? "A game is on right now. You join the next one."
    : host.ready
      ? "You are in. The big screen picks the teams and starts the game."
      : "Tap Ready. Teams are picked on the big screen.";
  return (
    <div className="nba-ready" style={{ "--team": team === null ? "#64748b" : TEAMS[team].color } as React.CSSProperties}>
      <div className="nba-ready__stage">
        <Suspense fallback={null}>
          <Preview character={host.pick} team={team} />
        </Suspense>
      </div>
      <div className="nba-ready__info">
        <strong className="nba-ready__name">{c.name}</strong>
        <span className="nba-ready__team">{team === null ? "No team yet" : `Team ${TEAMS[team].name}`}</span>
        <p className={`nba-ready__note ${host.ready ? "nba-ready__note--on" : ""}`}>{note}</p>
      </div>
    </div>
  );
}

/**
 * The phone's setup, one step per page in the kit's frame: pick a star,
 * then say ready. The platform already asked for a name before this.
 */
export function Setup() {
  const session = useController();
  const { step, host, wanted } = useControllerStore();
  const confirmed = host?.pick ?? null;
  const ready = host?.ready ?? false;

  const footer =
    step === "star" ? (
      <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!confirmed || confirmed !== wanted} onClick={() => session.goTo("ready")}>
        Next
      </button>
    ) : (
      <>
        <button type="button" className="btn btn--ghost btn--lg" disabled={ready} onClick={() => session.goTo("star")}>
          Back
        </button>
        <button type="button" className={`btn btn--lg kit-grow ${ready ? "btn--ghost" : "btn--primary"}`} disabled={!confirmed} onClick={() => session.setReady(!ready)}>
          {ready ? "Not ready" : "Ready"}
        </button>
      </>
    );

  return (
    <StepShell steps={STEPS} current={INDEX[step]} title={TITLES[step]} footer={footer}>
      {step === "star" ? <StarStep /> : <ReadyStep />}
    </StepShell>
  );
}
