"use client";
import { IconButton } from "@/components/ui/IconButton";
import { useFencingStore } from "../host-store";

/** Fencing's own button in the tool bar: the tuning drawer. */
export function Tools() {
  return (
    <IconButton icon="sliders" label="Tuning" onClick={() => useFencingStore.setState((state) => ({ tuningOpen: !state.tuningOpen }))} />
  );
}
