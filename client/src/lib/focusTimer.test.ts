import { describe, expect, it } from "vitest";
import { focusRemainingSeconds, focusTimeLabel } from "./focusTimer";

describe("cronômetro de concentração", () => {
  it("mantém a contagem legível e sem valores negativos", () => {
    expect(focusTimeLabel(1510)).toBe("25:10");
    expect(focusTimeLabel(-100)).toBe("00:00");
    expect(focusRemainingSeconds(151000, 150200)).toBe(1);
    expect(focusRemainingSeconds(150000, 150200)).toBe(0);
  });
});
