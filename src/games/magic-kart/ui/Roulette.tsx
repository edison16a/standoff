"use client";
import { useEffect, useState } from "react";
import { ITEM_KINDS } from "../engine/items";
import { ItemIcon } from "./icons";

/**
 * Cycles through every power up while the roulette spins, on the big
 * screen and on the phone alike, so the prize stays a surprise until it
 * lands.
 */
export function Roulette() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setI((n) => (n + 1) % ITEM_KINDS.length), 90);
    return () => clearInterval(timer);
  }, []);
  return <ItemIcon item={ITEM_KINDS[i]!} />;
}
