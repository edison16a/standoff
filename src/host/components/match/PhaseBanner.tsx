import { useHostStore } from "../../host-store";

/**
 * The big word in the middle of the strip: the countdown, "Allez", the
 * referee's call, or why play is paused. Nothing shows while fencing is
 * live so the blades have the stage.
 */
export function PhaseBanner() {
  const hud = useHostStore((state) => state.hud);
  const seats = useHostStore((state) => state.seats);
  if (!hud) return null;

  let title: string | null = null;
  let detail: string | null = null;
  switch (hud.phase) {
    case "enGarde":
      title = hud.countdown && hud.countdown > 0 ? String(hud.countdown) : "Allez";
      detail = "En garde";
      break;
    case "halt":
      title = hud.call ?? "Halt";
      break;
    case "paused": {
      const missing = !seats[1].connected ? 1 : 2;
      title = "Paused";
      detail = `Waiting for player ${missing} to reconnect`;
      break;
    }
    default:
      return null;
  }

  return (
    <div className="banner" role="status" aria-live="polite">
      {detail && <span className="label">{detail}</span>}
      <strong className="banner__title">{title}</strong>
    </div>
  );
}
