"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { updateStudentAdminAction } from "@/modules/student-profile/presentation/actions/studentActions";
import type {
  StudentDetailRow,
  StudentContactRow,
  StudentAddressRow,
  StudentCanga,
  StudentListRow,
} from "@/lib/supabase/queries/students";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{value ?? "—"}</dd>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Salvando..." : "Salvar"}
    </Button>
  );
}

interface Props {
  student: StudentDetailRow;
  contact: StudentContactRow | null;
  address: StudentAddressRow | null;
  canga: StudentCanga | null;
  allStudents: StudentListRow[];
  sessionRole: string;
}

export function ResumoTab({
  student,
  contact,
  address,
  canga,
  allStudents,
  sessionRole,
}: Props) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [state, formAction] = useFormState(updateStudentAdminAction, null);

  const canEditAdmin = sessionRole === "coordenacao";

  React.useEffect(() => {
    if (state?.ok) {
      setIsEditing(false);
    }
  }, [state]);

  // Filtra outros alunos para a lista de cangas
  const cangaOptions = React.useMemo(() => {
    return (allStudents ?? [])
      .filter((s) => s.id !== student.id)
      .sort((a, b) => (a.student_number ?? 99) - (b.student_number ?? 99));
  }, [allStudents, student.id]);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="md:col-span-2 lg:col-span-1">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Identificação</CardTitle>
          {canEditAdmin && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="text-xs text-primary hover:text-primary/80"
            >
              Editar admin
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="studentId" value={student.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Nome completo</Label>
                  <p className="py-2 text-sm font-medium text-muted-foreground bg-muted/20 px-2 rounded">
                    {student.full_name}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Nome de guerra</Label>
                  <p className="py-2 text-sm font-medium text-muted-foreground bg-muted/20 px-2 rounded">
                    {student.war_name}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="studentNumber">Número</Label>
                  <Input
                    id="studentNumber"
                    name="studentNumber"
                    type="number"
                    defaultValue={student.student_number ?? ""}
                    min={1}
                    max={100}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pelotao">Fase do CFO</Label>
                  <Select id="pelotao" name="pelotao" defaultValue={student.pelotao ?? "CFO I"}>
                    <option value="CFO I">CFO I</option>
                    <option value="CFO II">CFO II</option>
                    <option value="CFO III">CFO III</option>
                  </Select>
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="cangaStudentId">Canga</Label>
                  <Select id="cangaStudentId" name="cangaStudentId" defaultValue={canga?.canga_id ?? ""}>
                    <option value="">Nenhum canga atribuído</option>
                    {cangaOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.student_number ? String(s.student_number).padStart(2, "0") : "—"} — {s.war_name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {state?.ok === false && (
                <Alert variant="destructive" className="mt-2 text-xs py-2 px-3">
                  {state.error}
                </Alert>
              )}

              <div className="flex gap-2 pt-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(false)}
                >
                  Cancelar
                </Button>
                <SubmitButton />
              </div>
            </form>
          ) : (
            <dl className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Field label="Nome completo" value={student.full_name} />
              </div>
              <Field label="Nome de guerra" value={student.war_name} />
              <Field label="Número" value={student.student_number ? String(student.student_number).padStart(2, "0") : null} />
              <Field label="Sexo" value={student.sex === "M" ? "Masculino" : student.sex === "F" ? "Feminino" : null} />
              <Field label="Data de nasc." value={student.birth_date} />
              <Field label="Fase do CFO" value={student.pelotao} />
              <Field
                label="Canga"
                value={
                  canga
                    ? `(${canga.canga_number ? String(canga.canga_number).padStart(2, "0") : "—"}) ${canga.canga_war_name}`
                    : "Não atribuído"
                }
              />
              <Field label="Matrícula" value={student.enrollment_id} />
              <Field label="Situação" value={student.situation} />
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Contato (principal)</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="WhatsApp" value={contact?.whatsapp} />
            <Field label="Telefone sec." value={contact?.phone_secondary} />
            <Field label="E-mail" value={contact?.email_personal} />
            <Field label="E-mail inst." value={contact?.email_institutional} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Endereço</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="Rua" value={address?.street} />
            <Field label="Bairro" value={address?.district} />
            <Field label="Cidade" value={address?.city} />
            <Field label="UF" value={address?.state} />
            <Field label="CEP" value={address?.zip} />
            <Field label="Vem de outro estado?" value={address?.from_other_state ? "Sim" : "Não"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Documentos pessoais</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3">
            <Field label="CPF" value={student.cpf} />
            <Field label="RG" value={student.rg} />
            <Field label="PIS" value={student.pis} />
            <Field label="Título eleitoral" value={student.voter_id} />
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
