import { STAGE_COUNT } from "../engine/stages";

/**
 * A hidden way to start a run at any stage, for testing bosses and the
 * late game without playing the whole route: open the host page with
 * ?zstage=10 on the address. Anything else starts at stage 1.
 */
export function debugStage(): number {
  if (typeof window === "undefined") return 1;
  const raw = new URLSearchParams(window.location.search).get("zstage");
  const stage = Number(raw);
  return Number.isInteger(stage) && stage >= 1 && stage <= STAGE_COUNT ? stage : 1;
}

/**
 * With ?zdebug on the address, hands an object to browser tests on
 * window, so a test can read where the zombies are and aim at them.
 */
export function exposeForTests(name: string, value: unknown): void {
  if (typeof window === "undefined" || !new URLSearchParams(window.location.search).has("zdebug")) return;
  (window as unknown as Record<string, unknown>)[name] = value;
}
