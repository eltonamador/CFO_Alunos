/* eslint-disable @typescript-eslint/no-explicit-any */
import { ShieldAlert } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { formatStudentLabel } from "@/modules/operational-duty/infrastructure/queries";
import { registerDutyImpedimentAction } from "@/modules/operational-duty/presentation/actions";

export const metadata = { title: "Impedimentos - Coordenacao" };

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default async function CoordenacaoImpedimentosPage() {
  await requireRole("coordenacao");
  const supabase = createServerClientUntyped();

  try {
    const [{ data: students }, { data: impediments }] = await Promise.all([
      supabase
        .from("students")
        .select("id, war_name, student_number")
        .eq("situation", "matriculado")
        .is("deleted_at", null)
        .order("student_number"),
      supabase
        .from("duty_impediments")
        .select("id, student_id, impediment_type, starts_on, ends_on, reason, operational_note, active")
        .order("starts_on", { ascending: false })
        .limit(30),
    ]);

    const studentsById = new Map((students ?? []).map((student: any) => [student.id, student]));

    return (
      <div className="space-y-6">
        <header className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Escala operacional
          </p>
          <h1 className="font-display text-3xl font-bold">Impedimentos</h1>
          <p className="text-sm text-muted-foreground">
            Registre ausencias, dispensas, restricoes operacionais e outros bloqueios temporarios.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Novo impedimento</CardTitle>
            <CardDescription>
              Para restricao medica, use uma observacao operacional LGPD-safe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={registerDutyImpedimentAction} className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Aluno</Label>
                <select name="studentId" className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm" required>
                  <option value="">Selecione</option>
                  {(students ?? []).map((student: any) => (
                    <option key={student.id} value={student.id}>
                      {formatStudentLabel(student)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <select name="impedimentType" className="h-11 w-full rounded-md border border-input bg-card px-3 text-sm" required>
                  <option value="ausencia">Ausencia</option>
                  <option value="dispensa">Dispensa</option>
                  <option value="restricao_medica">Restricao medica</option>
                  <option value="missao_externa">Missao externa</option>
                  <option value="problema_administrativo">Problema administrativo</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startsOn">Data inicial</Label>
                <Input id="startsOn" name="startsOn" type="date" defaultValue={todayKey()} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="endsOn">Data final</Label>
                <Input id="endsOn" name="endsOn" type="date" defaultValue={todayKey()} required />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="reason">Motivo interno</Label>
                <Textarea id="reason" name="reason" required rows={3} />
              </div>
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="operationalNote">Nota operacional para Instrutor</Label>
                <Textarea id="operationalNote" name="operationalNote" rows={2} />
              </div>
              <div className="lg:col-span-2">
                <Button type="submit">
                  <ShieldAlert className="h-4 w-4" />
                  Registrar impedimento
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Registros recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(impediments ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum impedimento registrado.</p>
            ) : (
              (impediments ?? []).map((item: any) => (
                <div key={item.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{formatStudentLabel(studentsById.get(item.student_id) ?? {})}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.impediment_type.replace(/_/g, " ")} - {item.starts_on} a {item.ends_on}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-semibold">
                      {item.active ? "ativo" : "inativo"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm">{item.reason}</p>
                  {item.operational_note && (
                    <p className="mt-1 text-xs text-muted-foreground">Instrutor: {item.operational_note}</p>
                  )}
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
            {error instanceof Error ? error.message : "Aplique a migration 0022 para habilitar impedimentos."}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
}
