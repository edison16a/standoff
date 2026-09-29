import { describe, expect, it } from "vitest";
import { FinishOrder, finishText, ordinal } from "./finish";

describe("ordinal", () => {
  it("names places the way people say them", () => {
    const places = [1, 2, 3, 4, 10, 11, 12, 13, 21, 22, 23, 101, 111];
    expect(places.map(ordinal)).toEqual(["1st", "2nd", "3rd", "4th", "10th", "11th", "12th", "13th", "21st", "22nd", "23rd", "101st", "111th"]);
  });
});

describe("finishText", () => {
  it("puts the name and place in one line", () => {
    expect(finishText("Edison Law", 1)).toBe("Edison Law got 1st place!");
    expect(finishText("Player 2", 2)).toBe("Player 2 got 2nd place!");
  });
});

describe("FinishOrder", () => {
  it("gives places in the order players finish", () => {
    const order = new FinishOrder();
    expect(order.update([false, false, false])).toEqual([null, null, null]);
    expect(order.update([false, true, false])).toEqual([null, 1, null]);
    expect(order.update([true, true, false])).toEqual([2, 1, null]);
    expect(order.update([true, true, true])).toEqual([2, 1, 3]);
  });

  it("starts over when a new round clears the finishers", () => {
    const order = new FinishOrder();
    order.update([true, false]);
    order.update([true, true]);
    expect(order.update([false, false])).toEqual([null, null]);
    expect(order.update([false, true])).toEqual([null, 1]);
  });

  it("places a tie in one update by list order", () => {
    expect(new FinishOrder().update([true, true])).toEqual([1, 2]);
  });
});
