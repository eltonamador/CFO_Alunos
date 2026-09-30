import { redirect } from "next/navigation";
import { getSession, homePathForRole } from "@/modules/identity/presentation/session";
import { canPublishSchedules } from "../domain/access";

export async function requireSchedulePublisher() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canPublishSchedules(session)) redirect(homePathForRole(session.role));
  return session;
}
