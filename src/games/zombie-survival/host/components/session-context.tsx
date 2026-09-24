"use client";
import { createContext, useContext } from "react";
import type { SurvivalHost } from "../survival-host";

/** The Zombie Survival session for the open room, shared by every host screen. */
export const SessionContext = createContext<SurvivalHost | null>(null);

export function useSession(): SurvivalHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Zombie Survival host.");
  return session;
}
