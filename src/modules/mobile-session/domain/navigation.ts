import { isInternshipManagementPath } from "@/modules/internship-management/domain/access";
import { isSchedulePublishingPath } from "@/modules/schedule-repository/domain/access";

export interface NavigationIdentity {
  userId: string;
  role: "aluno" | "coordenacao" | "secretaria" | "instrutor";
  canManageInternship?: boolean;
  canPublishSchedules?: boolean;
}

export interface NavigationSnapshot {
  version: 1;
  owner: string;
  href: string;
  scrollY: number;
  savedAt: number;
}

export const NAVIGATION_MAX_AGE = 12 * 60 * 60 * 1000;

export function navigationOwner(identity: NavigationIdentity): string {
  return `${identity.userId}:${identity.role}:${!!identity.canManageInternship}:${!!identity.canPublishSchedules}`;
}

/** Navigation metadata only. Never retain free text, credentials or form values. */
export function restorableHref(href: string, identity: NavigationIdentity): string | null {
  if (!href.startsWith("/") || href.startsWith("//") || /[\\\s]/.test(href) || href.length > 2048)
    return null;
  const url = new URL(href, "https://cfo.invalid");
  const path = url.pathname;
  if (url.origin !== "https://cfo.invalid" || /%|\/\//.test(path)) return null;
  const home = `/${identity.role}`;
  const allowed =
    path === home ||
    path.startsWith(`${home}/`) ||
    path === "/qts" ||
    path === "/escalas/calendario" ||
    (identity.role === "aluno" &&
      identity.canManageInternship &&
      isInternshipManagementPath(path)) ||
    (identity.role === "aluno" && identity.canPublishSchedules && isSchedulePublishingPath(path));
  if (!allowed) return null;
  const params = new URLSearchParams();
  for (const key of [
    "tab",
    "data",
    "inicio",
    "fim",
    "mes",
    "ano",
    "page",
    "fase",
    "status",
    "filtro",
    "fila",
  ]) {
    const value = url.searchParams.get(key);
    if (value && /^[a-zA-Z0-9_-]{1,40}$/.test(value)) params.set(key, value);
  }
  params.sort();
  return `${path}${params.size ? `?${params}` : ""}`;
}

export function parseNavigationSnapshot(
  raw: string | null,
  identity: NavigationIdentity,
  now = Date.now(),
): NavigationSnapshot | null {
  try {
    const value = JSON.parse(raw ?? "null") as NavigationSnapshot | null;
    if (
      !value ||
      value.version !== 1 ||
      value.owner !== navigationOwner(identity) ||
      typeof value.href !== "string" ||
      restorableHref(value.href, identity) !== value.href ||
      !Number.isFinite(value.savedAt) ||
      now - value.savedAt > NAVIGATION_MAX_AGE ||
      value.savedAt > now + 60_000 ||
      !Number.isFinite(value.scrollY) ||
      value.scrollY < 0 ||
      value.scrollY > 1_000_000
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
