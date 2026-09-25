"use client";
import { playerColor } from "@/games/kit/players";
import { StepShell } from "@/games/kit/steps/StepShell";
import { CHARACTERS } from "../../roster";
import { Portrait } from "../../ui/Portrait";
import { usePhoneStore } from "../phone-store";
import { FighterStep } from "./FighterStep";
import { useController } from "./session-context";

const STEPS = ["Fighter", "Ready"] as const;
const INDEX = { fighter: 0, ready: 1 } as const;
const TITLES = { fighter: "Pick your fighter", ready: "Ready to fight" } as const;

function ReadyStep({ seat }: { seat: number }) {
  const host = usePhoneStore((s) => s.host);
  const pick = host?.pick;
  if (!pick) return null;
  const busy = host.phase !== "lobby" && host.phase !== "results" && !host.playing;
  const note = busy
    ? "A match is on right now. You join the next one."
    : host.ready
      ? "You are in. The big screen starts the fight."
      : "Tap Ready. Hold your phone sideways to play.";
  return (
    <div className="bb-ready" style={{ "--fighter": playerColor(seat) } as React.CSSProperties}>
      <Portrait character={pick} colour={playerColor(seat)} size={112} className="bb-ready__face" />
      <div className="bb-ready__info">
        <strong className="bb-ready__name">{CHARACTERS[pick].name}</strong>
        <p className={`bb-ready__note ${host.ready ? "bb-ready__note--on" : ""}`}>{note}</p>
      </div>
    </div>
  );
}

/**
 * The phone's setup, one step per page in the kit's frame: pick a
 * fighter, then say ready. The platform already asked for a name.
 */
export function Setup({ seat }: { seat: number }) {
  const session = useController();
  const { step, host, wanted } = usePhoneStore();
  const confirmed = host?.pick ?? null;
  const ready = host?.ready ?? false;

  const footer =
    step === "fighter" ? (
      <button type="button" className="btn btn--primary btn--lg kit-grow" disabled={!wanted || confirmed !== wanted} onClick={() => session.goTo("ready")}>
        Next
      </button>
    ) : (
      <>
        <button type="button" className="btn btn--ghost btn--lg" disabled={ready} onClick={() => session.goTo("fighter")}>
          Back
        </button>
        <button type="button" className={`btn btn--lg kit-grow ${ready ? "btn--ghost" : "btn--primary"}`} disabled={!confirmed} onClick={() => session.setReady(!ready)}>
          {ready ? "Not ready" : "Ready"}
        </button>
      </>
    );

  return (
    <StepShell steps={STEPS} current={INDEX[step]} title={TITLES[step]} footer={footer}>
      {step === "fighter" ? <FighterStep seat={seat} /> : <ReadyStep seat={seat} />}
    </StepShell>
  );
}
