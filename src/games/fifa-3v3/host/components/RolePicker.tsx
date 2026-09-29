"use client";
import { ROLE_NAMES, ROLE_SHORT, ROLES, type Role } from "../../roles";

/**
 * The host hands out places in the side: three small chips on each
 * player's card. Taking a role someone else on the side has swaps them.
 */
export function RolePicker({ name, role, onPick }: { name: string; role: Role | null; onPick(role: Role): void }) {
  return (
    <span className="fifa-roles" role="group" aria-label={`Role for ${name}`}>
      {ROLES.map((r) => (
        <button key={r} type="button" className="fifa-role" aria-pressed={r === role} aria-label={`${name} plays ${ROLE_NAMES[r]}`} title={ROLE_NAMES[r]} onClick={() => onPick(r)}>
          {ROLE_SHORT[r]}
        </button>
      ))}
    </span>
  );
}
