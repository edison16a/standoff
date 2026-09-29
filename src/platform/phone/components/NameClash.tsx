"use client";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { cleanName, nameKey, NAME_MAX } from "@/platform/profile";
import type { NameClash as Reason } from "@/platform/protocol";

/** `resume` is a reload on iOS, where only a tap can turn motion back on. */
export type NameClashReason = Reason | "resume";

interface NameClashProps {
  code: string;
  reason: NameClashReason;
  /** The name that clashed, or the player coming back. */
  name: string;
  onJoin(name: string, reconnect: boolean): Promise<void>;
}

function words(reason: NameClashReason, name: string, code: string): { title: string; note: string } {
  switch (reason) {
    case "name-taken":
      return { title: `${name} is taken`, note: "Someone in this game has that name. Pick another one." };
    case "name-away":
      return { title: `Are you ${name}?`, note: `${name} dropped out of this game. Reconnect to carry on as them.` };
    case "no-seat":
      return { title: `Join room ${code}`, note: `${name} is not in this game any more. Join as a new player.` };
    case "resume":
      return { title: `Welcome back, ${name}`, note: "Tap to carry on where you left off." };
  }
}

/**
 * The name screen again, when the name will not do as it is. A name in
 * use asks for another. A name whose player dropped offers Reconnect, so
 * that player gets their seat and score back rather than a new one.
 */
export function NameClash({ code, reason, name, onJoin }: NameClashProps) {
  const [typed, setTyped] = useState(reason === "no-seat" ? name : "");
  const [busy, setBusy] = useState(false);
  const clean = cleanName(typed);
  const comeBack = reason === "name-away" || reason === "resume";
  // Typing the same name again would only clash again.
  const same = reason !== "no-seat" && nameKey(clean) === nameKey(name);
  const { title, note } = words(reason, name, code);

  const go = (chosen: string, reconnect: boolean) => {
    setBusy(true);
    void onJoin(chosen, reconnect);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (clean && !same) go(clean, false);
  };

  return (
    <form className="phone-hero" onSubmit={submit}>
      <h1 className="phone-title">{title}</h1>
      <p className="muted">{note}</p>
      {comeBack && (
        <button type="button" className="btn btn--primary btn--lg btn--block" disabled={busy} onClick={() => go(name, true)}>
          <Icon name="refresh" />
          Reconnect
        </button>
      )}
      {reason !== "resume" && (
        <>
          <label className="name-field">
            <span className="name-field__label">{comeBack ? "Or join as someone new" : "Your name"}</span>
            <input
              className="name-field__input"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              maxLength={NAME_MAX}
              autoComplete="nickname"
              enterKeyHint="go"
              placeholder="Name"
            />
          </label>
          <button type="submit" className={`btn btn--lg btn--block ${comeBack ? "" : "btn--primary"}`} disabled={busy || !clean || same}>
            Join
          </button>
        </>
      )}
    </form>
  );
}
