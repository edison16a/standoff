"use client";
import { createContext, useContext } from "react";
import type { NbaHost } from "../nba-host";

/** The NBA 3v3 session for the open room, shared by every host screen. */
export const SessionContext = createContext<NbaHost | null>(null);

export function useSession(): NbaHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the NBA 3v3 host.");
  return session;
}
