export const COMPLETED_SESSION_STATUS = "completed";

export function sessionStatusLabel(status: string): string {
  if (status === COMPLETED_SESSION_STATUS) return "Finished";
  if (status === "planned") return "Planned";
  return "In progress";
}