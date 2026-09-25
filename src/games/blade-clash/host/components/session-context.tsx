"use client";
import { createContext, useContext } from "react";
import type { FencingHost } from "../fencing-host";

/** The fencing session for the open room, shared by every fencing host screen. */
export const SessionContext = createContext<FencingHost | null>(null);

export function useSession(): FencingHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the fencing host.");
  return session;
}
