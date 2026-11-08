/** Maps sign-up errors to role-accurate messages. Code errors only appear when the code is the problem. */
export function signUpErrorMessage(message: string): string {
  if (/database error saving new user/i.test(message))
    return "That code doesn't match the account type you chose. Use VOLUNTEER for Volunteer, or ADMIN for Programme Staff.";
  if (/email.*rate.?limit|rate.?limit.*email|over_email_send_rate_limit|too many.*(?:sign.?ups|emails)|email.*too many/i.test(message))
    return "Too many sign-ups in a short time. Please try again in an hour.";
  if (/weak.?password|password.*(?:weak|easy to guess|leaked|compromised|common|at least|too short)|(?:weak|leaked|compromised).*password/i.test(message))
    return "Please choose a stronger password (at least 8 characters, not a common one).";
  if (/invalid or already used volunteer code/i.test(message))
    return "That volunteer code isn't valid or has already been used. Ask SADeaf for your code.";
  if (/invalid or already used staff code/i.test(message))
    return "That staff code isn't valid or has already been used. Ask SADeaf for your code.";
  if (/already registered|already been registered/i.test(message))
    return "An account with this email already exists. Try signing in instead.";
  return "Something went wrong creating your account. Please try again or contact SADeaf.";
}
