"use client";
import { useState, type FormEvent } from "react";
import { StandoffMark } from "@/components/ui/Brand";
import { cleanName, loadName, NAME_MAX } from "@/platform/profile";

/**
 * The first phone screen: what should we call you? Skip joins as the
 * seat number instead. Either button is also the one tap that lets the
 * browser start sound, read motion on iOS and keep the screen awake, so
 * it all happens here.
 */
export function NameScreen({ code, onJoin }: { code: string; onJoin(name: string | null): Promise<void> }) {
  const [name, setName] = useState(loadName);
  const [busy, setBusy] = useState(false);
  const clean = cleanName(name);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!clean) return;
    setBusy(true);
    await onJoin(clean);
  };

  return (
    <form className="phone-hero phone-hero--form" onSubmit={submit}>
      <span className="phone-hero__mark">
        <StandoffMark />
      </span>
      <span className="label">Room {code}</span>
      <label className="name-field">
        <span className="name-field__label">Your name</span>
        <input
          className="name-field__input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={NAME_MAX}
          autoComplete="nickname"
          enterKeyHint="go"
          placeholder="Name"
          autoFocus
        />
      </label>
      <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={busy || !clean}>
        Join
      </button>
      <button
        type="button"
        className="btn btn--ghost btn--block"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void onJoin(null);
        }}
      >
        Skip
      </button>
    </form>
  );
}
