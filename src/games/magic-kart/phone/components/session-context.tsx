"use client";
import { createContext, useContext } from "react";
import type { KartPhone } from "../kart-phone";

export const ControllerContext = createContext<KartPhone | null>(null);

export function useController(): KartPhone {
  const session = useContext(ControllerContext);
  if (!session) throw new Error("useController must be used inside the Magic Kart phone screen.");
  return session;
}
