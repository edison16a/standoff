"use client";
import { lazy, Suspense } from "react";
import { StepShell } from "@/games/kit/steps/StepShell";
import { ROSTER } from "../../roster";
import { TEAMS } from "../../teams";
import { usePhoneStore } from "../phone-store";
import { PickStep } from "./PickStep";
import { usePhone } from "./session-context";

const Preview = lazy(() => import("./PreviewCanvas"));

const STEPS = ["Star", "Ready"] as const;
const INDEX = { star: 0, ready: 1 } as const;
const TITLES = { star: "Pick your star", ready: "Ready to play" } as const;

function ReadyStep() {
  const host = usePhoneStore((s) => s.host);
  if (!host || !host.pick) return null;
  const star = ROSTER[host.pick];
  const team = host.team !== null ? TEAMS[host.team] : null;
  const matchOn = host.phase !== "lobby" && !host.playing;
  const note = matchOn
    ? "A match is on right now. You play in the next one."
    : !host.ready
      ? "Tap Ready. The host puts players on teams on the big screen."
      : team
        ? `You are on ${team.name}. The match starts from the big screen.`
        : "You are in. The host is picking the teams.";
  return (
    <div className="fifa-ready" style={{ "--kit": star.look.kit.shirt, "--team": team?.color ?? "#94a3b8" } as React.CSSProperties}>
      <div className="fifa-ready__stage">
        <Suspense fallback={null}>
          <Preview character={host.pick} />
        </Suspense>
      </div>
      <div className="fifa-ready__side">
        <div className="fifa-ready__card">
          <strong>{star.name}</strong>
          <span>Number {star.number}</span>
        </div>
        <div className={`fifa-ready__team ${team ? "fifa-ready__team--on" : ""}`}>{team ? `${team.name} team` : "No team yet"}</div>
        <p className={`fifa-ready__note ${host.ready ? "fifa-ready__note--on" : ""}`}>{note}</p>
        <p className="fifa-ready__how">Tap Shoot/Pass to pass, hold it to shoot. Slide tackles, or does a skill move on the ball.</p>
      </div>
    </div>
  );
}

/**
 * The phone's setup, one step per page in the kit's frame: pick a star,
 * then say ready. The platform already asked for a name before this.
 */
export function Setup() {
  const phone = usePhone();
  const step = usePhoneStore((s) => s.step);
  const host = usePhoneStore((s) => s.host);
  const confirmed = host?.pick ?? null;
  const ready = host?.ready ?? false;

  const footer =
    step === "star" ? (
      <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!confirmed} onClick={() => phone.goTo("ready")}>
        Next
      </button>
    ) : (
      <>
        <button type="button" className="btn btn--ghost btn--lg" disabled={ready} onClick={() => phone.goTo("star")}>
          Back
        </button>
        <button type="button" className={`btn btn--lg kit-grow ${ready ? "btn--ghost" : "btn--primary"}`} disabled={!confirmed} onClick={() => phone.setReady(!ready)}>
          {ready ? "Not ready" : "Ready"}
        </button>
      </>
    );

  return (
    <StepShell steps={STEPS} current={INDEX[step]} title={TITLES[step]} footer={footer}>
      {step === "star" ? <PickStep /> : <ReadyStep />}
    </StepShell>
  );
}
