export type SchedulePublishingProfile = {
  active: boolean;
  role: string;
  canPublishSchedules?: boolean;
};

export function canPublishSchedules(profile: SchedulePublishingProfile | null | undefined): boolean {
  return (
    !!profile?.active &&
    (profile.role === "coordenacao" ||
      (profile.role === "aluno" && profile.canPublishSchedules === true))
  );
}

export function isSchedulePublishingPath(path: string): boolean {
  return path === "/coordenacao/escalas" || path.startsWith("/coordenacao/escalas/");
}
