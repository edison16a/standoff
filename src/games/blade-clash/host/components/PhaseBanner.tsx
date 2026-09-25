import { useFencingStore } from "../host-store";

/**
 * The big word in the middle of the strip: the countdown, "Allez", the
 * referee's call, or "Paused". Nothing while fencing is live, so the
 * blades have the stage.
 */
export function PhaseBanner() {
  const hud = useFencingStore((state) => state.hud);
  const names = useFencingStore((state) => state.names);
  if (!hud) return null;
  let title: string | null = null;
  if (hud.phase === "enGarde") title = hud.countdown && hud.countdown > 0 ? String(hud.countdown) : "Allez";
  if (hud.phase === "halt") title = hud.scorer ? `Touch, ${names[hud.scorer]}` : (hud.call ?? "Halt");
  if (hud.phase === "paused") title = "Paused";
  if (!title) return null;
  return (
    <div className="banner" role="status" aria-live="polite">
      {title}
    </div>
  );
}
