"use client";
import { lazy, Suspense } from "react";
import { StepShell } from "@/games/kit/steps/StepShell";
import { ROLE_NAMES } from "../../roles";
import { BUILDS } from "../../builds";
import { TEAMS } from "../../teams";
import { usePhoneStore } from "../phone-store";
import { PickStep } from "./PickStep";
import { usePhone } from "./session-context";

const Preview = lazy(() => import("./PreviewCanvas"));

const STEPS = ["Build", "Ready"] as const;
const INDEX = { build: 0, ready: 1 } as const;
const TITLES = { build: "Pick your build", ready: "Ready to play" } as const;

/** Step two: the build in the side's uniform with the player's own name, the side and role the host gave, and how to play. */
function ReadyStep() {
  const host = usePhoneStore((s) => s.host);
  if (!host || !host.pick) return null;
  const build = BUILDS[host.pick];
  const team = host.team !== null ? TEAMS[host.team] : null;
  const gameOn = host.phase !== "lobby" && !host.playing;
  const note = gameOn
    ? "A game is on right now. You play in the next one."
    : !host.ready
      ? "Tap Ready. The host puts players on teams on the big screen."
      : team
        ? `You are on ${team.name}${host.role ? ` at ${ROLE_NAMES[host.role].toLowerCase()}` : ""}. The game starts from the big screen.`
        : "You are in. The host is picking the teams.";
  return (
    <div className="fb-ready" style={{ "--kit": team?.color ?? "#64748b" } as React.CSSProperties}>
      <div className="fb-ready__stage">
        <Suspense fallback={null}>
          <Preview build={host.pick} team={host.team ?? 0} />
        </Suspense>
      </div>
      <div className="fb-ready__side">
        <div className="fb-ready__card">
          <strong>{host.name || build.name}</strong>
          <span>
            {build.name}, number {build.number}
          </span>
        </div>
        <div className={`fb-ready__team ${team ? "fb-ready__team--on" : ""}`}>{team ? `${team.name}${host.role ? `, ${ROLE_NAMES[host.role]}` : ""}` : "No team yet"}</div>
        <p className={`fb-ready__note ${host.ready ? "fb-ready__note--on" : ""}`}>{note}</p>
        <p className="fb-ready__how">Hold the phone sideways. The QB picks the play, hikes and throws with the right stick. Runners run, dive and juke. The defence rushes, tackles and guards.</p>
      </div>
    </div>
  );
}

/**
 * The phone's setup, one step per page in the kit's frame: pick a build,
 * then say ready. The platform already asked for a name before this.
 */
export function Setup() {
  const phone = usePhone();
  const step = usePhoneStore((s) => s.step);
  const host = usePhoneStore((s) => s.host);
  const confirmed = host?.pick ?? null;
  const ready = host?.ready ?? false;

  const footer =
    step === "build" ? (
      <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!confirmed} onClick={() => phone.goTo("ready")}>
        Next
      </button>
    ) : (
      <>
        <button type="button" className="btn btn--ghost btn--lg" disabled={ready} onClick={() => phone.goTo("build")}>
          Back
        </button>
        <button type="button" className={`btn btn--lg kit-grow ${ready ? "btn--ghost" : "btn--primary"}`} disabled={!confirmed} onClick={() => phone.setReady(!ready)}>
          {ready ? "Not ready" : "Ready"}
        </button>
      </>
    );

  return (
    <StepShell steps={STEPS} current={INDEX[step]} title={TITLES[step]} footer={footer}>
      {step === "build" ? <PickStep /> : <ReadyStep />}
    </StepShell>
  );
}
