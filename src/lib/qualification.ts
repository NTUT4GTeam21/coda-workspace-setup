const DAY = 24 * 60 * 60 * 1000;
export const QUALIFICATION_DAYS = 365;
export const INACTIVITY_DAYS = 182; // about 6 months, matching the database's 6-month rule

/** Mirrors the database rule: qualification lasts a year from passing and lapses after ~6 months without signing in. UI only. */
export function isQualificationActive(
  qualified: boolean,
  passedAt: string | null,
  lastLoginAt: string | null,
  now: Date = new Date(),
): boolean {
  if (!qualified || !passedAt) return false;
  const t = now.getTime();
  if (t - new Date(passedAt).getTime() >= QUALIFICATION_DAYS * DAY) return false;
  if (lastLoginAt && t - new Date(lastLoginAt).getTime() >= INACTIVITY_DAYS * DAY) return false;
  return true;
}

export function qualificationExpiresOn(passedAt: string | null): Date | null {
  return passedAt ? new Date(new Date(passedAt).getTime() + QUALIFICATION_DAYS * DAY) : null;
}
