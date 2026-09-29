"use client";
import { createContext, useContext } from "react";
import type { CounterHost } from "../counter-host";

/** The Paintball Battle session for the open room, shared by every host screen. */
export const SessionContext = createContext<CounterHost | null>(null);

export function useSession(): CounterHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Paintball Battle host.");
  return session;
}
