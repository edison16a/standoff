/**
 * Test shortcuts for the host's hidden admin panel (three quick taps on the
 * settings gear). A game registers actions while its match is running, such
 * as "Free kick" or "Free throw", and removes them when it unmounts. The
 * panel lists whatever is registered right now.
 */
export interface AdminAction {
  /** Stable id, unique within the game. */
  id: string;
  /** Short button text, for example "Penalty for home". */
  label: string;
  run(): void;
}

type Listener = () => void;

const groups = new Map<string, AdminAction[]>();
const listeners = new Set<Listener>();
let snapshot: readonly AdminAction[] = [];

function publish(): void {
  snapshot = [...groups.values()].flat();
  for (const listener of listeners) listener();
}

/** Registers a group of actions. Call the returned function to remove them. */
export function registerAdminActions(owner: string, actions: AdminAction[]): () => void {
  groups.set(owner, actions);
  publish();
  return () => {
    if (groups.get(owner) !== actions) return;
    groups.delete(owner);
    publish();
  };
}

export function adminActions(): readonly AdminAction[] {
  return snapshot;
}

/** For useSyncExternalStore. */
export function subscribeAdminActions(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
