"use client";
import { createContext, useContext } from "react";
import type { BoxingHost } from "../boxing-host";

/** The Boxing session for the open room, shared by every host screen. */
export const SessionContext = createContext<BoxingHost | null>(null);

export function useSession(): BoxingHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Boxing host.");
  return session;
}
