"use client";
import { createContext, useContext } from "react";
import type { FifaPhone } from "../fifa-phone";

export const PhoneContext = createContext<FifaPhone | null>(null);

export function usePhone(): FifaPhone {
  const phone = useContext(PhoneContext);
  if (!phone) throw new Error("Soccer 3v3's phone screens need their session.");
  return phone;
}
