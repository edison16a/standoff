import { useBladeStore } from "../host-store";

/**
 * The big word across the middle of the split: the countdown, "Fight",
 * the finishing blow or "Paused". Nothing while the fight is on, so the
 * blades have the screen.
 */
export function PhaseBanner() {
  const hud = useBladeStore((state) => state.hud);
  const names = useBladeStore((state) => state.names);
  if (!hud) return null;
  let title: string | null = null;
  if (hud.phase === "countdown") title = hud.countdown && hud.countdown > 0 ? String(hud.countdown) : "Fight";
  if (hud.phase === "finish" && hud.winner) title = `${names[hud.winner]} wins`;
  if (hud.phase === "paused") title = "Paused";
  if (!title) return null;
  return (
    <div key={title} className="banner" role="status" aria-live="polite">
      {title}
    </div>
  );
}
