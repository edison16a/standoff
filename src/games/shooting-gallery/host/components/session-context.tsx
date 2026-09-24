"use client";
import { createContext, useContext } from "react";
import { useStore } from "zustand";
import type { GalleryHost } from "../gallery-host";
import type { HostState } from "../host-store";

/** The gallery session for the open room, shared by every host screen. */
export const GalleryContext = createContext<GalleryHost | null>(null);

export function useGallery(): GalleryHost {
  const session = useContext(GalleryContext);
  if (!session) throw new Error("useGallery must be used inside the shooting gallery host.");
  return session;
}

/** Reads a slice of the session's HUD state and re-renders when it changes. */
export function useHud<T>(select: (state: HostState) => T): T {
  return useStore(useGallery().store, select);
}
