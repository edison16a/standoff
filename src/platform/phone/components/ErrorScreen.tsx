import { Icon } from "@/components/ui/Icon";
import type { PhoneError } from "../phone-store";

const MESSAGES: Record<PhoneError, string> = {
  "not-found": "Room not found",
  full: "This game is full",
  closed: "The game has ended",
  unavailable: "The server is busy",
  replaced: "Open in another tab",
};

export function ErrorScreen({ error }: { error: PhoneError }) {
  return (
    <section className="phone-hero">
      <h1 className="phone-title">{MESSAGES[error]}</h1>
      <button type="button" className="btn btn--block" onClick={() => location.reload()}>
        <Icon name="refresh" />
        Try again
      </button>
    </section>
  );
}
