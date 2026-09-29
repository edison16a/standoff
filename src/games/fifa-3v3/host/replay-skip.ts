/**
 * Skipping a replay needs everyone. Each player in the match who is on
 * their phone gets a say; any button on the phone is their vote, and
 * the replay ends early only once all of them have pressed. A player who
 * drops out stops counting, so one missing phone never holds it up.
 */
export class SkipVotes {
  private voters = new Set<number>();
  private agreed = new Set<number>();

  /** A new replay: these seats get a vote, and nobody has used it yet. */
  start(seats: Iterable<number>): void {
    this.voters = new Set(seats);
    this.agreed = new Set();
  }

  /** A seat pressed a button. Returns true when that makes it unanimous. */
  vote(seat: number): boolean {
    if (!this.voters.has(seat)) return false;
    this.agreed.add(seat);
    return this.unanimous();
  }

  /** A phone left or came back mid replay. Returns true when the ones left have all agreed. */
  setPresent(seat: number, present: boolean): boolean {
    if (present) return false;
    this.voters.delete(seat);
    this.agreed.delete(seat);
    return this.unanimous();
  }

  has(seat: number): boolean {
    return this.agreed.has(seat);
  }

  /** Every voter, in seat order, and whether they have pressed. */
  list(): { seat: number; agreed: boolean }[] {
    return [...this.voters].sort((a, b) => a - b).map((seat) => ({ seat, agreed: this.agreed.has(seat) }));
  }

  get count(): number {
    return this.agreed.size;
  }

  get total(): number {
    return this.voters.size;
  }

  clear(): void {
    this.voters.clear();
    this.agreed.clear();
  }

  private unanimous(): boolean {
    return this.voters.size > 0 && this.agreed.size >= this.voters.size;
  }
}
