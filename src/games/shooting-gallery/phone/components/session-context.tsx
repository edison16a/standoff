"use client";
import { createContext, useContext, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import type { AimSnapshot } from "@/games/kit/aim/phone-aim";
import type { GalleryPhone, PhoneState } from "../gallery-phone";

/** The gallery session on this phone. */
export const PhoneContext = createContext<GalleryPhone | null>(null);

export function usePhone(): GalleryPhone {
  const session = useContext(PhoneContext);
  if (!session) throw new Error("usePhone must be used inside the shooting gallery phone.");
  return session;
}

export function usePhoneState<T>(select: (state: PhoneState) => T): T {
  return useStore(usePhone().store, select);
}

/** The aim kit's live view of this phone: sensors or touch, calibrated or not. */
export function useAimSnapshot(): AimSnapshot {
  const { aim } = usePhone();
  return useSyncExternalStore(aim.subscribe, aim.getSnapshot, aim.getSnapshot);
}
