"use client";
import { Icon } from "@/components/ui/Icon";
import { playerColor } from "@/games/kit/players";
import { useSession } from "./session-context";
import { useSurvivalStore } from "../host-store";

/** Achievements popping up on the right, with who earned them. */
export function Toasts() {
  const session = useSession();
  const toasts = useSurvivalStore((s) => s.toasts);
  const seats = useSurvivalStore((s) => s.hud.seats);
  if (toasts.length === 0) return null;
  return (
    <ol className="zs-toasts" aria-live="polite">
      {toasts.map((toast) => {
        const name = toast.seat ? (seats.find((s) => s.seat === toast.seat)?.name ?? session.players.find((p) => p.seat === toast.seat)?.name) : "Team";
        return (
          <li key={toast.id} className="zs-toast" style={{ ["--seat" as string]: toast.seat ? playerColor(toast.seat) : "#ffd24a" }}>
            <span className="zs-toast__icon">
              <Icon name="trophy" size={22} />
            </span>
            <span className="zs-toast__body">
              <strong>{toast.title}</strong>
              <span>
                {name}: {toast.text}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
