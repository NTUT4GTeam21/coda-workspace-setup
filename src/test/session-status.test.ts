import { expect, it } from "vitest";
import { canContinueSession, COMPLETED_SESSION_STATUS, sessionStatusLabel } from "@/lib/session-status";

it("finishes sessions with the database's completed value", () => {
  expect(COMPLETED_SESSION_STATUS).toBe("completed");
  expect(sessionStatusLabel("completed")).toBe("Finished");
});

it("does not let volunteers continue another volunteer's ongoing session", () => {
  expect(canContinueSession("volunteer-a", "volunteer-b", false)).toBe(false);
  expect(canContinueSession("volunteer-a", "volunteer-a", false)).toBe(true);
});

it("allows programme staff to access sessions assigned to volunteers", () => {
  expect(canContinueSession("volunteer-a", "staff-user", true)).toBe(true);
  expect(canContinueSession("volunteer-a", undefined, true)).toBe(false);
});

it("removes the old volunteer's continuation access after a staff transfer", () => {
  expect(canContinueSession("volunteer-b", "volunteer-a", false)).toBe(false);
  expect(canContinueSession("volunteer-b", "volunteer-b", false)).toBe(true);
});