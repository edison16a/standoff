"use client";
import { createContext, useContext } from "react";
import type { FootballPhone } from "../football-phone";

export const PhoneContext = createContext<FootballPhone | null>(null);

export function usePhone(): FootballPhone {
  const phone = useContext(PhoneContext);
  if (!phone) throw new Error("Football 3v3's phone screens need their session.");
  return phone;
}
