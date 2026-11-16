export const COMPLETED_SESSION_STATUS = "completed";

/** UI only: the database independently enforces session ownership. */
export function canContinueSession(
  volunteerId: string,
  userId: string | undefined,
  isAdmin = false,
): boolean {
  return Boolean(userId) && (isAdmin || volunteerId === userId);
}

/** Volunteer-facing label for a session's database status. */
export function sessionStatusLabel(status: string): string {
  if (status === COMPLETED_SESSION_STATUS) return "Finished";
  if (status === "planned") return "Planned";
  return "In progress";
}
