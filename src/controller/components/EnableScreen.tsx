"use client";
import { useState } from "react";
import { StandoffMark } from "@/components/ui/Brand";
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
    <section className="phone-hero">
      <span className="phone-hero__mark">
        <StandoffMark />
      </span>
      <span className="label">Room {code}</span>
      <button type="button" className="btn btn--primary btn--lg btn--block" onClick={enable} disabled={busy}>
        Tap to play
      </button>
    </section>
  );
}
