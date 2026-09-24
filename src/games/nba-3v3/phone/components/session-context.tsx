"use client";
import { createContext, useContext } from "react";
import type { NbaPhone } from "../nba-phone";

/** The NBA 3v3 phone session for this seat. */
export const ControllerContext = createContext<NbaPhone | null>(null);

export function useController(): NbaPhone {
  const session = useContext(ControllerContext);
  if (!session) throw new Error("useController must be used inside the NBA 3v3 phone.");
  return session;
}
