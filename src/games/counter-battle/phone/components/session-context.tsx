"use client";
import { createContext, useContext } from "react";
import type { CounterPhone } from "../counter-phone";

/** The Counter Battle session for this phone, shared by its screens. */
export const PhoneContext = createContext<CounterPhone | null>(null);

export function usePhone(): CounterPhone {
  const session = useContext(PhoneContext);
  if (!session) throw new Error("usePhone must be used inside the Counter Battle phone.");
  return session;
}
