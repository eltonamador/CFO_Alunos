import { requireInternshipManager } from "@/modules/internship-management/presentation/access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { WeeklyPlanningForm } from "@/modules/internship-management/presentation/WeeklyPlanningForm";
export const dynamic = "force-dynamic";
export const metadata = { title: "Montar semana de estágio — Coordenação" };
export default async function WeeklyPlanningPage() {
  await requireInternshipManager();
  const db = createSupabaseServerClient();
  const { data: course } = await db
    .from("courses")
    .select("id")
    .eq("code", "CFO-2026")
    .maybeSingle();
  const { data: group } = course
    ? await db
        .from("classes")
        .select("id")
        .eq("course_id", course.id)
        .eq("name", "CFO 2026.1")
        .maybeSingle()
    : { data: null };
  const { data: program } = group
    ? await db
        .from("internship_programs")
        .select("id,starts_on,ends_on,status")
        .eq("class_id", group.id)
        .eq("course_phase", "CFO I")
        .maybeSingle()
    : { data: null };
  if (!program || program.status !== "publicado")
    return <p>Publique o programa de estágio antes de montar a semana.</p>;
  const [sites, templates] = await Promise.all([
    db
      .from("internship_sites")
      .select("id,name")
      .eq("program_id", program.id)
      .eq("site_type", "gbm")
      .eq("active", true)
      .order("code"),
    db
      .from("internship_shift_templates")
      .select("code,name,start_weekdays")
      .eq("program_id", program.id)
      .eq("active", true)
      .order("code"),
  ]);
  if (sites.error || templates.error)
    return <p>Não foi possível consultar os serviços. Atualize a página.</p>;
  return (
    <div className="space-y-5">
      <a href="/coordenacao/estagio" className="text-sm text-primary underline">
        Voltar ao estágio
      </a>
      <h1 className="font-display text-2xl font-semibold">Montar semana de estágio</h1>
      <p className="text-muted-foreground">
        Escolha os serviços, gere a sugestão e publique após conferir. O descanso mínimo de 24h é
        verificado entre os serviços.
      </p>
      <WeeklyPlanningForm
        initialPeriod="semana"
        program={program}
        sites={sites.data}
        templates={templates.data}
      />
    </div>
  );
}
