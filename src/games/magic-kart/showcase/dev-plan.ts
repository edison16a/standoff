import type { Plan } from "./shots";

/**
 * A plan passed in the address as `?plan=` JSON, for trying shots
 * without editing `shots.ts`. Development builds only; anywhere else, or
 * when it does not parse, the view's own plan is used.
 */
export function devPlan(): Plan | null {
  if (process.env.NODE_ENV !== "development") return null;
  const raw = new URLSearchParams(window.location.search).get("plan");
  if (!raw) return null;
  try {
    const plan = JSON.parse(raw) as Plan;
    return Array.isArray(plan.shots) && plan.shots.length > 0 ? plan : null;
  } catch {
    return null;
  }
}
