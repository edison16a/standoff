"use client";
import { createContext, useContext } from "react";
import type { BladePhone } from "../blade-phone";

export const ControllerContext = createContext<BladePhone | null>(null);

export function useController(): BladePhone {
  const session = useContext(ControllerContext);
  if (!session) throw new Error("useController must be used inside the controller app.");
  return session;
}
