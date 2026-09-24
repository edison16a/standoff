"use client";
import { createContext, useContext } from "react";
import type { HostRoom } from "../host-room";

/** The one platform host for this tab, shared by the home screen and the room. */
export const HostContext = createContext<HostRoom | null>(null);

export function useHostRoom(): HostRoom {
  const host = useContext(HostContext);
  if (!host) throw new Error("useHostRoom must be used inside the host app.");
  return host;
}
