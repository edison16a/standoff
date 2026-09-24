"use client";
import { createContext, useContext } from "react";
import type { FruitPhone } from "../fruit-phone";

export const PhoneContext = createContext<FruitPhone | null>(null);

export function usePhone(): FruitPhone {
  const session = useContext(PhoneContext);
  if (!session) throw new Error("usePhone must be used inside the fruit phone.");
  return session;
}
