"use client";
import { Icon } from "@/components/ui/Icon";
import { useFencingStore } from "../host-store";
import { useSession } from "./session-context";

/**
 * On the join card while one person waits: play the computer instead. A
 * friend who scans the code later still takes its place.
 */
export function SoloButton() {
  const session = useSession();
  const computer = useFencingStore((state) => state.seats[1].computer || state.seats[2].computer);
  return (
    <button type="button" className="join__extra" onClick={() => session.setSolo(!computer)}>
      <Icon name={computer ? "close" : "cpu"} />
      {computer ? "No computer" : "Play solo"}
    </button>
  );
}
