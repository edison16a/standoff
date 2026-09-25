"use client";
import { createContext, useContext } from "react";
import type { BrawlPhone } from "../brawl-phone";

/** The Brawl Battle phone session for this seat. */
export const ControllerContext = createContext<BrawlPhone | null>(null);

export function useController(): BrawlPhone {
  const session = useContext(ControllerContext);
  if (!session) throw new Error("useController must be used inside the Brawl Battle phone.");
  return session;
}
