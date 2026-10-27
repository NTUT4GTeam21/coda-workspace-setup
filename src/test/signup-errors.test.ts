import { describe, expect, it } from "vitest";
import { signUpErrorMessage } from "@/lib/signup-errors";

describe("signUpErrorMessage", () => {
  it("shows the volunteer code message only for volunteer code errors", () => {
    expect(signUpErrorMessage("Invalid or already used volunteer code")).toContain("volunteer code");
  });
  it("shows the staff code message only for staff code errors", () => {
    expect(signUpErrorMessage("Invalid or already used staff code")).toContain("staff code");
  });
  it("shows a generic message for other errors", () => {
    expect(signUpErrorMessage("Password should be at least 6 characters")).toBe(
      "Something went wrong creating your account. Please try again or contact SADeaf.",
    );
  });
  it("tells the user when the email already has an account", () => {
    expect(signUpErrorMessage("User already registered")).toContain("already exists");
  });
});
