import { POINTS_TO_WIN } from "@/games/blade-clash/engine/rules";
import { useBladeStore } from "../host-store";

/**
 * The big word across the middle of the split: the countdown, "Fight" or
 * "Paused". Nothing while the fight is on, so the blades have the screen.
 * Points and the winning slash have their own moment (PointMoment). The
 * countdown also says how the fight is won, since it is not by health.
 */
export function PhaseBanner() {
  const hud = useBladeStore((state) => state.hud);
  if (!hud) return null;
  let title: string | null = null;
  if (hud.phase === "countdown") title = hud.countdown && hud.countdown > 0 ? String(hud.countdown) : "Fight";
  if (hud.phase === "paused") title = "Paused";
  if (!title) return null;
  return (
    <>
      <div key={title} className="banner" role="status" aria-live="polite">
        {title}
      </div>
      {hud.phase === "countdown" && <span className="banner-rule">First to {POINTS_TO_WIN} points</span>}
    </>
  );
}
