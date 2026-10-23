import { expect, it } from "vitest";
import { COMPLETED_SESSION_STATUS, sessionStatusLabel } from "@/lib/session-status";

it("finishes sessions with the database's completed value", () => {
  expect(COMPLETED_SESSION_STATUS).toBe("completed");
  expect(sessionStatusLabel("completed")).toBe("Finished");
});