"use client";
import { createContext, useContext } from "react";
import type { BladeHost } from "../blade-host";

/** The Blade Clash session for the open room, shared by every host screen. */
export const SessionContext = createContext<BladeHost | null>(null);

export function useSession(): BladeHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Blade Clash host.");
  return session;
}
