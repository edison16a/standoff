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
    greet: vi.fn(),
  };
  return { lobby, session, desk: new PhoneDesk(lobby, session) };
}

describe("PhoneDesk", () => {
  it("starts a new phone in a freed seat from scratch", () => {
    const { lobby, desk } = setup();
    lobby.connect(1);
    lobby.pick(1, "vale");
    lobby.setReady(1, true);
    desk.left(1);
    desk.joined(1, false);
    expect(lobby.seats[1]).toMatchObject({ connected: true, pick: null, ready: false });
  });

  it("gives a returning phone its pick back", () => {
    const { lobby, desk } = setup();
    lobby.connect(1);
    lobby.pick(1, "vale");
    desk.left(1);
    desk.joined(1, true);
    expect(lobby.seats[1]).toMatchObject({ connected: true, pick: "vale" });
  });

  it("lets a real opponent take over from the computer, back in the lobby", () => {
    const { lobby, session, desk } = setup(true);
    lobby.connect(1);
    lobby.setComputer(true);
    desk.joined(2, false);
    expect(session.backToLobby).toHaveBeenCalled();
    expect(lobby.seats[2]).toMatchObject({ connected: true, computer: false, pick: null });
  });
});
