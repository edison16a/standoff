"use client";
import { createContext, useContext } from "react";
import type { ControllerSession } from "../controller-session";

export const ControllerContext = createContext<ControllerSession | null>(null);

export function useController(): ControllerSession {
  const session = useContext(ControllerContext);
  if (!session) throw new Error("useController must be used inside the controller app.");
  return session;
}
