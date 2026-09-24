"use client";
import { createContext, useContext } from "react";
import type { KartHost } from "../kart-host";

/** The Magic Kart session for the open room, shared by every host screen. */
export const SessionContext = createContext<KartHost | null>(null);

export function useSession(): KartHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the Magic Kart host.");
  return session;
}
