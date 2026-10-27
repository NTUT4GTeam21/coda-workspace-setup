import { describe, expect, it } from "vitest";
import { levelFitHint } from "@/lib/level-hint";

describe("levelFitHint", () => {
  it("is empty when recent sessions were about right or there are none", () => {
    expect(levelFitHint([])).toBe("");
    expect(levelFitHint(["about_right"])).toBe("");
  });
  it("names the latest off-level mark", () => {
    expect(levelFitHint(["too_hard", "about_right"])).toBe("Last session marked Too hard");
  });
  it("says last 2 sessions when the two latest marks agree", () => {
    expect(levelFitHint(["too_easy", "too_easy", "about_right"])).toBe("Last 2 sessions marked Too easy");
  });
});
