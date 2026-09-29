import { meterAim, meterPower } from "../engine/kick";

export type HostMeter = "aim" | "power" | null;

/** The phone's own run of the kick meters: the stage it is drawing, since when on its clock, and the aim it locked. */
export interface LocalMeter {
  stage: "aim" | "power" | "done";
  since: number;
  aim: number | null;
}

/**
 * Keeps the phone's meters in step with the host's without ever
 * restarting one under the player's thumb. Only a change in the host's
 * stage counts: a new kick starts the aim meter, and the host moving to
 * power on its own (the aim meter ran out) starts the power meter here
 * too. A late state that still says aim after the player tapped changes
 * nothing, since it is no change.
 */
export function followMeter(local: LocalMeter | null, before: HostMeter, now: HostMeter, at: number): LocalMeter | null {
  if (now === null) return null;
  if (now === before) return local;
  if (now === "aim") return { stage: "aim", since: at, aim: null };
  if (local?.stage === "aim" || local === null) return { stage: "power", since: at, aim: local?.aim ?? null };
  return local;
}

/**
 * A tap on the kick button: the reading on the meter being drawn, which
 * goes to the host, and the next meter, which starts at once here.
 */
export function tapMeter(local: LocalMeter | null, at: number): { value: number; next: LocalMeter } | null {
  if (!local || local.stage === "done") return null;
  const t = (at - local.since) / 1000;
  if (local.stage === "aim") {
    const value = meterAim(t);
    return { value, next: { stage: "power", since: at, aim: value } };
  }
  return { value: meterPower(t), next: { ...local, stage: "done" } };
}
