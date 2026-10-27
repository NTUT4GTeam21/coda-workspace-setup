/** Maps sign-up errors to role-accurate messages. Code errors only appear when the code is the problem. */
export function signUpErrorMessage(message: string): string {
  if (/invalid or already used volunteer code/i.test(message))
    return "That volunteer code isn't valid or has already been used. Ask SADeaf for your code.";
  if (/invalid or already used staff code/i.test(message))
    return "That staff code isn't valid or has already been used. Ask SADeaf for your code.";
  if (/already registered|already been registered/i.test(message))
    return "An account with this email already exists. Try signing in instead.";
  return "Something went wrong creating your account. Please try again or contact SADeaf.";
}
