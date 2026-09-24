"use client";
import { createContext, useContext } from "react";
import type { HostSession } from "../host-session";

/** The one host session for this tab, shared by every host screen. */
export const SessionContext = createContext<HostSession | null>(null);

export function useSession(): HostSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the host app.");
  return session;
}
