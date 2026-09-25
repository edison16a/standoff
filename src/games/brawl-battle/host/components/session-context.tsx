"use client";
import { createContext, useContext } from "react";
import type { BrawlHost } from "../brawl-host";

/** The Brawl Battle session for the open room, shared by every host screen. */
export const SessionContext = createContext<BrawlHost | null>(null);

export function useSession(): BrawlHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Brawl Battle host.");
  return session;
}
