"use client";
import { createContext, useContext } from "react";
import type { FifaHost } from "../fifa-host";

export const SessionContext = createContext<FifaHost | null>(null);

export function useSession(): FifaHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("FIFA 3v3's host screens need their session.");
  return session;
}
