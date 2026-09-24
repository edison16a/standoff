"use client";
import { createContext, useContext } from "react";
import type { FruitHost } from "../fruit-host";

/** The fruit session for the open room, shared by every host screen. */
export const SessionContext = createContext<FruitHost | null>(null);

export function useSession(): FruitHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("useSession must be used inside the fruit host.");
  return session;
}
