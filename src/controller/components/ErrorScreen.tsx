import { Icon } from "@/components/ui/Icon";
import type { ControllerError } from "../controller-store";

const MESSAGES: Record<ControllerError, { title: string; text: string }> = {
  "not-found": { title: "Room not found", text: "The game may have ended. Scan the code on the computer again." },
  full: { title: "This game is full", text: "Two players are already in. Ask the host to start a new game." },
  closed: { title: "The game has ended", text: "The host closed the room. Scan a new code to play again." },
  insecure: {
    title: "Open the secure link",
    text: "Phones only share motion with secure pages. Scan the QR code, which uses the https address.",
  },
  denied: {
    title: "Motion access was refused",
    text: "Allow motion and orientation access for this site in your browser settings, then reload.",
  },
};

export function ErrorScreen({ error }: { error: ControllerError }) {
  const message = MESSAGES[error];
  return (
    <section className="phone-card phone-card--center">
      <span className="phone-card__badge">
        <Icon name="info" size={26} />
      </span>
      <h1 className="phone-title">{message.title}</h1>
      <p className="muted">{message.text}</p>
      <button type="button" className="btn btn--block" onClick={() => location.reload()}>
        <Icon name="refresh" />
        Try again
      </button>
    </section>
  );
}
