"use client";
import { useState, type ReactNode } from "react";
import type { ItemKind } from "../engine/items";
import { CubeGlyph, ItemIcon } from "./icons";
import { Roulette } from "./Roulette";

/** What an item slot shows: the empty box outline, the spinning roulette, or the power up that landed. */
export function SlotIcon({ item, rolling }: { item: ItemKind | null; rolling: boolean }) {
  if (!item) return <CubeGlyph />;
  return rolling ? <Roulette /> : <ItemIcon item={item} />;
}

/**
 * A span that takes the `motion` class only if `play` was true when it
 * mounted. Keyed on what changed, it plays its CSS animation once as
 * something arrives, never later when the slot merely fills.
 */
export function Arrival({ className, motion, play, children }: { className: string; motion: string; play: boolean; children: ReactNode }) {
  const [once] = useState(play);
  return <span className={once ? `${className} ${motion}` : className}>{children}</span>;
}
