import { describe, expect, it } from "vitest";
import { isQualificationActive, qualificationExpiresOn } from "@/lib/qualification";

const now = new Date("2026-10-28T00:00:00Z");

describe("qualification expiry", () => {
  it("is active within a year of passing with recent sign-in", () => {
    expect(isQualificationActive(true, "2026-01-01T00:00:00Z", "2026-10-01T00:00:00Z", now)).toBe(true);
  });
  it("expires one year after passing", () => {
    expect(isQualificationActive(true, "2025-10-27T00:00:00Z", "2026-10-27T00:00:00Z", now)).toBe(false);
  });
  it("lapses after 6 months without signing in", () => {
    expect(isQualificationActive(true, "2026-03-01T00:00:00Z", "2026-04-01T00:00:00Z", now)).toBe(false);
  });
  it("expiry date is one year after passing", () => {
    expect(qualificationExpiresOn("2026-01-01T00:00:00Z")?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
