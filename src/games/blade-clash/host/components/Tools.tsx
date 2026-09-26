"use client";
import { IconButton } from "@/components/ui/IconButton";
import { useBladeStore } from "../host-store";

/** Blade Clash's own button in the tool bar: the tuning drawer. */
export function Tools() {
  return (
    <IconButton icon="sliders" label="Tuning" onClick={() => useBladeStore.setState((state) => ({ tuningOpen: !state.tuningOpen }))} />
  );
}
