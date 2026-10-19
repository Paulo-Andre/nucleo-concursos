import { describe, expect, it } from "vitest";
import { brazilStudyDayKey } from "./brazilStudyDay";

describe("datas de estudo no Brasil", () => {
  it("não considera o novo dia UTC como novo dia brasileiro", () => {
    expect(brazilStudyDayKey(new Date("2026-10-20T00:30:00.000Z"))).toBe("2026-10-19");
    expect(brazilStudyDayKey(new Date("2026-10-20T03:30:00.000Z"))).toBe("2026-10-20");
  });
});
