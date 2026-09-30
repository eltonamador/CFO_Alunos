export type InternshipAccessProfile = {
  active: boolean;
  role: string;
  canManageInternship?: boolean;
};
export function canManageInternship(profile: InternshipAccessProfile | null | undefined): boolean {
  return (
    !!profile?.active &&
    (profile.role === "coordenacao" ||
      (profile.role === "aluno" && profile.canManageInternship === true))
  );
}
export function isInternshipManagementPath(path: string): boolean {
  return path === "/coordenacao/estagio" || path.startsWith("/coordenacao/estagio/");
}
