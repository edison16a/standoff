import { describe, expect, it, vi } from "vitest";
import { Lobby } from "./lobby";
import type { MatchDriver } from "./match-driver";
import { PhoneDesk } from "./phone-desk";

function setup(inMatch = false) {
  const lobby = new Lobby();
  const session = {
    driver: () => (inMatch ? ({} as MatchDriver) : null),
    backToLobby: vi.fn(),
    seatsChanged: vi.fn(),
    lobbyChanged: vi.fn(),
    calibrating: vi.fn(),
    hold: vi.fn(),
  };
  return { lobby, session, desk: new PhoneDesk(lobby, session) };
}

describe("PhoneDesk", () => {
  it("starts a new phone in a freed seat from scratch", () => {
    const { lobby, desk } = setup();
    lobby.connect(1);
    lobby.pick(1, "star");
    lobby.setReady(1, true);
    desk.left(1);
    desk.joined(1, false);
    expect(lobby.seats[1]).toMatchObject({ connected: true, pick: null, ready: false });
  });

  it("gives a returning phone its pick back", () => {
    const { lobby, desk } = setup();
    lobby.connect(1);
    lobby.pick(1, "star");
    desk.left(1);
    desk.joined(1, true);
    expect(lobby.seats[1]).toMatchObject({ connected: true, pick: "star" });
  });

  it("lets a real opponent take over from the computer, back in the lobby", () => {
    const { lobby, session, desk } = setup(true);
    lobby.connect(1);
    lobby.setComputer(true);
    desk.joined(2, false);
    expect(session.backToLobby).toHaveBeenCalled();
    expect(lobby.seats[2]).toMatchObject({ connected: true, computer: false, pick: null });
  });

  it("shows each phone's calibration target, and forgets it once done or gone", () => {
    const { session, desk } = setup();
    desk.message(1, { kind: "calibrate", step: "top-left" });
    expect(session.calibrating).toHaveBeenLastCalledWith(1, "top-left");
    desk.message(1, { kind: "calibrate", step: "done" });
    expect(session.calibrating).toHaveBeenLastCalledWith(1, null);
    desk.message(2, { kind: "calibrate", step: "center" });
    desk.left(2);
    expect(session.calibrating).toHaveBeenLastCalledWith(2, null);
  });

  it("moves the waiting fighter's sword with the phone before the match", () => {
    const { session, desk } = setup();
    const hold = { yaw: 0.3, pitch: 0.2, roll: 0, reach: 0.5 };
    desk.message(1, { kind: "motion", ...hold, move: 0 });
    expect(session.hold).toHaveBeenCalledWith(1, expect.objectContaining(hold));
  });

  it("goes back to the menu when a phone asks", () => {
    const { session, desk } = setup(true);
    desk.message(2, { kind: "menu" });
    expect(session.backToLobby).toHaveBeenCalled();
  });
});
