import { Icon } from "@/components/ui/Icon";
import type { ControllerError } from "../controller-store";

const MESSAGES: Record<ControllerError, string> = {
  "not-found": "Room not found",
  full: "This game is full",
  closed: "The game has ended",
  unavailable: "The server is busy",
  insecure: "Open the https link from the QR code",
  denied: "Allow motion access, then try again",
  replaced: "Open in another tab",
};

export function ErrorScreen({ error }: { error: ControllerError }) {
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
