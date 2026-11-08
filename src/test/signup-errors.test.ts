import { describe, expect, it } from "vitest";
import { signUpErrorMessage } from "@/lib/signup-errors";

describe("signUpErrorMessage", () => {
  it("shows the volunteer code message only for volunteer code errors", () => {
    expect(signUpErrorMessage("Invalid or already used volunteer code")).toContain("volunteer code");
  });
  it("shows the staff code message only for staff code errors", () => {
    expect(signUpErrorMessage("Invalid or already used staff code")).toContain("staff code");
  });
  it("explains masked signup code errors", () => {
    expect(signUpErrorMessage("Database error saving new user")).toBe(
      "That code doesn't match the account type you chose. Use VOLUNTEER for Volunteer, or ADMIN for Programme Staff.",
    );
  });
  it.each(["Email rate limit exceeded", "over_email_send_rate_limit", "Rate limit exceeded for email sending", "Too many signup emails"])("explains email throttling: %s", (error) => {
    expect(signUpErrorMessage(error)).toBe(
      "Too many sign-ups in a short time. Please try again in an hour.",
    );
  });
  it.each([
    "Password is known to be weak and easy to guess, please choose a different one.",
    "weak_password",
    "Password has been leaked",
    "Password should be at least 6 characters",
  ])("explains weak or leaked passwords: %s", (error) => {
    expect(signUpErrorMessage(error)).toBe(
      "Please choose a stronger password (at least 8 characters, not a common one).",
    );
  });
  it("shows a generic message for other errors", () => {
    expect(signUpErrorMessage("Unexpected network failure")).toBe(
      "Something went wrong creating your account. Please try again or contact SADeaf.",
    );
  });
  it("tells the user when the email already has an account", () => {
    expect(signUpErrorMessage("User already registered")).toContain("already exists");
  });
});
