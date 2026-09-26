"use client";
import { createContext, useContext } from "react";
import type { CounterHost } from "../counter-host";

/** The Counter Battle session for the open room, shared by every host screen. */
export const SessionContext = createContext<CounterHost | null>(null);

export function useSession(): CounterHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Counter Battle host.");
  return session;
}
