import type { Nets, PanelId } from "./physics/net";
import type { MatchState } from "./types";

/** Where one sheet of a goal's net is dented, and how far out of the goal (engine/physics/net.ts). */
export interface NetDent {
  u: number;
  v: number;
  depth: number;
}

/** Both goals' nets as the renderer draws them: the left goal's, then the right's. */
export type NetsView = [Record<PanelId, NetDent>, Record<PanelId, NetDent>];

const IDS: readonly PanelId[] = ["back", "left", "right", "roof"];

function goalView(goal: Nets[number]): Record<PanelId, NetDent> {
  const out = {} as Record<PanelId, NetDent>;
  for (const id of IDS) out[id] = { u: goal[id].u, v: goal[id].v, depth: goal[id].depth };
  return out;
}

export function netsView(state: MatchState): NetsView {
  return [goalView(state.nets[0]), goalView(state.nets[1])];
}

/** Part way between two, for slow motion replays: the dent moves and deepens smoothly. */
export function blendNets(a: NetsView, b: NetsView, t: number): NetsView {
  const mix = (x: number, y: number) => x + (y - x) * t;
  const goal = (g: 0 | 1) => {
    const out = {} as Record<PanelId, NetDent>;
    for (const id of IDS) out[id] = { u: mix(a[g][id].u, b[g][id].u), v: mix(a[g][id].v, b[g][id].v), depth: mix(a[g][id].depth, b[g][id].depth) };
    return out;
  };
  return [goal(0), goal(1)];
}
