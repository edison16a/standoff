"use client";
import { useEffect, useState } from "react";
import type { FeedbackEvent } from "@/games/blade-clash/protocol";
import { useControllerStore } from "../controller-store";

/** How long each word stays up. */
const SHOW_MS = 700;

const WORDS: Record<FeedbackEvent, string> = { landed: "Hit", hurt: "Ouch", clash: "Clash" };

/**
 * A word over the sword picture for a moment when something happens to
 * it: a hit landed, a hit taken, or a clash. The buzz says it too, on
 * phones that can buzz.
 */
export function HitFlash() {
  const flash = useControllerStore((state) => state.flash);
  // The flash whose time is up, so the word hides without clearing the store.
  const [expired, setExpired] = useState<number | null>(null);

  useEffect(() => {
    if (!flash) return;
    const timer = setTimeout(() => setExpired(flash.at), SHOW_MS);
    return () => clearTimeout(timer);
  }, [flash]);

  if (!flash || expired === flash.at) return null;
  return (
    <span key={flash.at} className={`hit-flash hit-flash--${flash.event}`} role="status">
      {WORDS[flash.event]}
    </span>
  );
}
