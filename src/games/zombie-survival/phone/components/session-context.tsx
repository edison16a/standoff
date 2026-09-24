"use client";
import { createContext, useContext } from "react";
import type { SurvivalPhone } from "../survival-phone";

/** The phone session for this player, shared by every phone screen. */
export const PhoneContext = createContext<SurvivalPhone | null>(null);

export function usePhone(): SurvivalPhone {
  const session = useContext(PhoneContext);
  if (!session) throw new Error("usePhone must be used inside the Zombie Survival phone.");
  return session;
}
