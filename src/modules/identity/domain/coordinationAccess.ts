const NO_LOGIN_REGISTRATIONS = new Set(["1160680", "1113666"]);

export function canLinkCoordinationLogin(registration: string): boolean {
  return !NO_LOGIN_REGISTRATIONS.has(registration);
}
