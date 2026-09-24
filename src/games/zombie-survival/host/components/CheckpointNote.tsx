"use client";
import { Icon } from "@/components/ui/Icon";
import { STAGE_COUNT } from "../../engine/stages";
import { useSurvivalStore } from "../host-store";

/**
 * A stage cleared, said small under the top strip: which checkpoint, and
 * the health the team found there. It slides in and fades by itself while
 * the team reloads and moves on, so it never covers the road. Keyed by
 * the note, so each checkpoint starts its animation again.
 */
export function CheckpointNote() {
  const note = useSurvivalStore((s) => s.checkpoint);
  const phase = useSurvivalStore((s) => s.hud.phase);
  if (!note || (phase !== "clear" && phase !== "travel")) return null;
  return (
    <div key={note.id} className="zs-check" role="status">
      <span className="zs-check__icon">
        <Icon name="check" size={18} />
      </span>
      <span className="zs-check__body">
        <span className="zs-check__kicker">
          Checkpoint {note.stage} of {STAGE_COUNT}
        </span>
        <strong>{note.title} cleared</strong>
      </span>
      {note.healed > 0 && <span className="zs-check__heal">+{note.healed} health</span>}
    </div>
  );
}
