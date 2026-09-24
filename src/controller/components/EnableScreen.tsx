"use client";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useController } from "./session-context";

/**
 * The first phone screen. One tap does everything a browser only allows
 * after a tap: motion access on iOS, sound, and keeping the screen awake.
 */
export function EnableScreen({ code }: { code: string }) {
  const session = useController();
  const [busy, setBusy] = useState(false);

  const enable = async () => {
    setBusy(true);
    await session.enable();
    setBusy(false);
  };

  return (
    <section className="phone-card phone-card--center">
      <span className="phone-card__badge">
        <Icon name="phone" size={26} />
      </span>
      <span className="label">Room {code}</span>
      <h1 className="phone-title">Your phone is the sword</h1>
      <p className="muted">
        Standoff reads your phone&apos;s motion to swing, jab and parry. Nothing is installed and nothing leaves your
        network.
      </p>
      <button type="button" className="btn btn--primary btn--lg btn--block" onClick={enable} disabled={busy}>
        {busy ? "Enabling" : "Tap to enable motion and sound"}
      </button>
    </section>
  );
}
