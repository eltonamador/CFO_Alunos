import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { evaluationDate } from "@/modules/internship-management/domain/evaluation";
import { internshipUniformLabel } from "@/modules/internship-management/domain/uniforms";
const schema = z
  .object({
    id: z.string(),
    studentId: z.string(),
    studentNumber: z.number().nullable(),
    warName: z.string().nullable(),
    role: z.string(),
    location: z.string(),
    uniformCode: z.string(),
    startsAt: z.string(),
    endsAt: z.string(),
  })
  .array();
export async function UpcomingPermanence({ studentId }: { studentId?: string | null }) {
  const result = await createSupabaseServerClient().rpc("permanence_dashboard_schedule");
  const parsed = schema.safeParse(result.data);
  if (result.error || !parsed.success)
    return (
      <p className="rounded border p-4 text-sm">Não foi possível carregar a permanência agora.</p>
    );
  if (!parsed.data.length) return null;
  return (
    <section className="space-y-3 rounded-xl border bg-card p-4">
      <header>
        <p className="section-eyebrow">Próximos 7 dias</p>
        <h2 className="text-xl font-bold">Escala de permanência</h2>
      </header>
      <ul>
        {parsed.data.map((r) => (
          <li
            className={`border-t py-3 text-sm ${r.studentId === studentId ? "bg-primary/5" : ""}`}
            key={r.id}
          >
            <p className="font-semibold">
              {r.role} · {r.studentNumber} · {r.warName}
              {r.studentId === studentId ? " · Você" : ""}
            </p>
            <p>
              {evaluationDate(r.startsAt)} a {evaluationDate(r.endsAt)} · {r.location}
            </p>
            <p>{internshipUniformLabel(r.uniformCode)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
