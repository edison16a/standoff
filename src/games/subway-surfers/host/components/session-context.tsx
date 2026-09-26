"use client";
import { createContext, useContext } from "react";
import type { SurfSession } from "../session";

/** The Subway Runner session for the open room, shared by every host screen. */
export const SessionContext = createContext<SurfSession | null>(null);

export function useSession(): SurfSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Subway Runner host.");
  return session;
}
