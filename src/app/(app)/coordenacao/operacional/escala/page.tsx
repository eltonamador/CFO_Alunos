/* eslint-disable @typescript-eslint/no-explicit-any */
import { CalendarDays, Repeat2 } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { formatStudentLabel } from "@/modules/operational-duty/infrastructure/queries";
import {
  generateDutyRosterAction,
  manuallyReplaceDutyAssignmentAction,
} from "@/modules/operational-duty/presentation/actions";

export const metadata = { title: "Escala Operacional - Coordenacao" };

function dateKey(offset = 0) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export default async function CoordenacaoEscalaPage() {
  await requireRole("coordenacao");
  const supabase = createServerClientUntyped();

  try {
    const [{ data: latestRoster }, { data: students }] = await Promise.all([
      supabase
        .from("duty_rosters")
        .select("id, period_start, period_end, status")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("students")
        .select("id, war_name, student_number, situation")
        .eq("situation", "matriculado")
        .is("deleted_at", null)
        .order("student_number"),
    ]);

    const { data: rawAssignments } = latestRoster
      ? await supabase
          .from("duty_assignments")
          .select("id, duty_date, role_id, student_id, status, assignment_source")
          .eq("roster_id", latestRoster.id)
          .in("status", ["prevista", "confirmada"])
          .order("duty_date")
      : { data: [] };

    const roleIds = [...new Set((rawAssignments ?? []).map((item: any) => item.role_id))];
    const studentIds = [...new Set((rawAssignments ?? []).map((item: any) => item.student_id))];
    const [{ data: roles }, { data: assignedStudents }] = await Promise.all([
      roleIds.length
        ? supabase.from("duty_roles").select("id, name, sort_order").in("id", roleIds)
        : Promise.resolve({ data: [] }),
      studentIds.length
        ? supabase.from("students").select("id, war_name, student_number").in("id", studentIds)
        : Promise.resolve({ data: [] }),
    ]);

    const rolesById = new Map((roles ?? []).map((role: any) => [role.id, role]));
    const studentsById = new Map((assignedStudents ?? []).map((student: any) => [student.id, student]));
    const assignments = (rawAssignments ?? [])
      .map((assignment: any) => ({
        ...assignment,
        role: rolesById.get(assignment.role_id),
        student: studentsById.get(assignment.student_id),
      }))
      .sort((a: any, b: any) => a.duty_date.localeCompare(b.duty_date) || (a.role?.sort_order ?? 99) - (b.role?.sort_order ?? 99));

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Escala com justica automatica
          </p>
          <h1 className="font-display text-3xl font-bold">Escala Operacional</h1>
          <p className="text-sm text-muted-foreground">
            Gere a escala por periodo e ajuste trocas manuais com justificativa.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Gerar escala</CardTitle>
            <CardDescription>
              O gerador usa alunos reais, impedimentos ativos e historico de atribuicoes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={generateDutyRosterAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Inicio</Label>
                <Input id="startDate" name="startDate" type="date" defaultValue={dateKey(0)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endDate">Fim</Label>
                <Input id="endDate" name="endDate" type="date" defaultValue={dateKey(6)} />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  <CalendarDays className="h-4 w-4" />
                  Gerar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {latestRoster
                ? `Escala ${latestRoster.period_start} a ${latestRoster.period_end}`
                : "Nenhuma escala gerada"}
            </CardTitle>
            <CardDescription>
              Trocas manuais exigem justificativa e ficam registradas no historico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">Gere uma escala para visualizar as atribuicoes.</p>
            ) : (
              assignments.map((assignment: any) => (
                <div key={assignment.id} className="grid gap-3 rounded-lg border p-3 lg:grid-cols-[100px_180px_1fr_320px]">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Data</p>
                    <p className="font-semibold">{assignment.duty_date}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Funcao</p>
                    <p className="font-semibold">{assignment.role?.name ?? "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Aluno atual</p>
                    <p className="font-display text-base font-bold">{formatStudentLabel(assignment.student ?? {})}</p>
                  </div>
                  <form action={manuallyReplaceDutyAssignmentAction} className="space-y-2">
                    <input type="hidden" name="assignmentId" value={assignment.id} />
                    <select
                      name="newStudentId"
                      className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm"
                      required
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Substituir por...
                      </option>
                      {(students ?? []).map((student: any) => (
                        <option key={student.id} value={student.id}>
                          {formatStudentLabel(student)}
                        </option>
                      ))}
                    </select>
                    <Textarea name="reason" placeholder="Justificativa obrigatoria" required rows={2} />
                    <Button type="submit" size="sm" variant="secondary" className="w-full">
                      <Repeat2 className="h-4 w-4" />
                      Registrar troca
                    </Button>
                  </form>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Modulo operacional pendente de banco</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : "Aplique a migration 0022 para habilitar a escala."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
}
