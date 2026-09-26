"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { ROOM_CODE_LENGTH, ROOM_CODE_PATTERN } from "@/platform/protocol";
import type { PhoneError } from "../phone-store";

const MESSAGES: Record<PhoneError, string> = {
  "not-found": "Room not found",
  full: "This game is full",
  closed: "The game has ended",
  unavailable: "The server is busy",
  replaced: "Open in another tab",
  load: "The game did not load",
};

/** A room that ended or never existed is not coming back, so reloading it only fails again. */
const GONE = new Set<PhoneError>(["closed", "not-found"]);

interface ErrorScreenProps {
  error: PhoneError;
  /** The room this screen is for. */
  code: string;
  /** Starts this room over from its name screen. */
  onRetry(): void;
}

export function ErrorScreen({ error, code, onRetry }: ErrorScreenProps) {
  if (GONE.has(error)) return <NextRoom title={MESSAGES[error]} current={code} onRetry={onRetry} />;
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

/**
 * The way on to the host's next game from this same tab: scan the new QR
 * code, or type the code printed under it.
 */
function NextRoom({ title, current, onRetry }: { title: string; current: string; onRetry(): void }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const code = typed.trim();
  const valid = ROOM_CODE_PATTERN.test(code);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    // Opening this same page again would change nothing, so the room starts over in place.
    if (code === current) return onRetry();
    // The join page makes a fresh room for the new code, so nothing from this one comes along.
    router.push(`/join/${code}`);
  };

  return (
    <form className="phone-hero" onSubmit={submit}>
      <h1 className="phone-title">{title}</h1>
      <label className="name-field">
        <span className="name-field__label">Scan the new code, or type it here</span>
        <input
          className="name-field__input mono"
          value={typed}
          onChange={(event) => setTyped(event.target.value.toUpperCase())}
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          placeholder="Code"
        />
      </label>
      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={!valid}>
        Join
      </button>
    </form>
  );
}
