"use client";
import { createContext, useContext } from "react";
import type { CubeSession } from "../session";

export const SessionContext = createContext<CubeSession | null>(null);

export function useSession(): CubeSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error("Cube Game components need the session");
  return session;
}
