"use client";
import { createContext, useContext } from "react";
import type { FencingPhone } from "../fencing-phone";

export const ControllerContext = createContext<FencingPhone | null>(null);

export function useController(): FencingPhone {
  const session = useContext(ControllerContext);
  if (!session) throw new Error("useController must be used inside the controller app.");
  return session;
}
