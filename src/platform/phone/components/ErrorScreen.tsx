"use client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { PhoneError } from "../phone-store";
import { JoinForm } from "./JoinForm";

const MESSAGES: Record<PhoneError, string> = {
  "not-found": "Room not found",
  full: "This game is full",
  closed: "The game has ended",
  unavailable: "The server is busy",
  replaced: "Open in another tab",
  load: "The game did not load",
  lost: "The room was lost",
};

/** A room that ended, was lost or never existed is not coming back, so reloading it only fails again. */
const GONE = new Set<PhoneError>(["closed", "not-found", "lost"]);

interface ErrorScreenProps {
  error: PhoneError;
  /** The room this screen is for. */
  code: string;
  /** Starts this room over from its name screen. */
  onRetry(): void;
}

export function ErrorScreen({ error, code, onRetry }: ErrorScreenProps) {
  if (GONE.has(error)) return <NextRoom title={MESSAGES[error]} lost={error === "lost"} current={code} onRetry={onRetry} />;
  return (
    <section className="phone-hero">
      <h1 className="phone-title">{MESSAGES[error]}</h1>
      <button type="button" className="btn btn--block" onClick={() => location.reload()}>
        <Icon name="refresh" />
        {/* The page is at the player's own address by now, so a reload takes the seat back. */}
        {error === "replaced" ? "Reconnect" : "Try again"}
      </button>
    </section>
  );
}

/**
 * When the host ends the game, leaves or loses the room, every phone lands
 * here: join the host's next game from this same tab by typing its code or
 * scanning it.
 */
function NextRoom({ title, lost, current, onRetry }: { title: string; lost: boolean; current: string; onRetry(): void }) {
  const router = useRouter();

  const go = (code: string) => {
    // Opening this same page again would change nothing, so the room starts over in place.
    if (code === current) return onRetry();
    // The join page makes a fresh room for the new code, so nothing from this one comes along.
    router.push(`/join/${code}`);
  };

  return (
    <section className="phone-hero phone-hero--join">
      <span className="label">{title}</span>
      <h1 className="phone-title">{lost ? "Join the new room" : "Join a new game"}</h1>
      <p className="muted phone-hero__lead">
        {lost ? "The big screen will show a new code. Type it here, or scan its QR code." : "Type the code on the big screen, or scan its QR code."}
      </p>
      <JoinForm onCode={go} />
    </section>
  );
}
