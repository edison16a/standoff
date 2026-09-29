"use client";
import { createContext, useContext } from "react";
import type { FootballHost } from "../football-host";

export const SessionContext = createContext<FootballHost | null>(null);

export function useSession(): FootballHost {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Football 3v3's host screens need their session.");
  return session;
}
