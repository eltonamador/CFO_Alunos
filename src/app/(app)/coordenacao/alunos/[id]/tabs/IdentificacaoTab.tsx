"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateIdentificationAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MaskedInput } from "@/components/ui/MaskedInput";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { FieldHint } from "@/components/ui/FieldHint";
import type { StudentDetailRow, StudentContactRow } from "@/lib/supabase/queries/students";

const TODAY = new Date().toISOString().slice(0, 10);

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar identificação"}
    </Button>
  );
}

export function IdentificacaoTab({
  studentId,
  student,
  contact,
}: {
  studentId: string;
  student: StudentDetailRow;
  contact: StudentContactRow | null;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    updateIdentificationAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="studentId" value={studentId} />

      {/* ── Dados pessoais ── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Dados pessoais</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sex">Sexo</Label>
            <Select id="sex" name="sex" defaultValue={student.sex ?? ""}>
              <option value="">Não informado</option>
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birth_date">Data de nascimento</Label>
            <Input
              id="birth_date"
              name="birth_date"
              type="date"
              defaultValue={student.birth_date ?? ""}
              max={TODAY}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nationality">Nacionalidade</Label>
            <Input
              id="nationality"
              name="nationality"
              defaultValue={student.nationality ?? "Brasileira"}
              placeholder="Ex: Brasileira"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="marital_status">Estado civil</Label>
            <Select
              id="marital_status"
              name="marital_status"
              defaultValue={student.marital_status ?? ""}
            >
              <option value="">Não informado</option>
              <option value="Solteiro">Solteiro(a)</option>
              <option value="Casado">Casado(a)</option>
              <option value="União estável">União estável</option>
              <option value="Divorciado">Divorciado(a)</option>
              <option value="Separado">Separado(a)</option>
              <option value="Viúvo">Viúvo(a)</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="naturality_state">Naturalidade — UF</Label>
            <MaskedInput
              id="naturality_state"
              name="naturality_state"
              mask="uf"
              defaultValue={student.naturality_state}
              placeholder="AP"
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="naturality_city">Município de nascimento</Label>
            <Input
              id="naturality_city"
              name="naturality_city"
              defaultValue={student.naturality_city ?? ""}
              placeholder="Ex: Macapá"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="father_name">Nome do pai</Label>
            <Input
              id="father_name"
              name="father_name"
              defaultValue={student.father_name ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mother_name">Nome da mãe</Label>
            <Input
              id="mother_name"
              name="mother_name"
              defaultValue={student.mother_name ?? ""}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="email_personal">E-mail pessoal</Label>
            <Input
              id="email_personal"
              name="email_personal"
              type="email"
              defaultValue={contact?.email_personal ?? ""}
              placeholder="exemplo@email.com"
            />
          </div>
        </div>
      </fieldset>

      {/* ── Formação acadêmica ── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Formação acadêmica</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="education_level">Escolaridade</Label>
            <Select
              id="education_level"
              name="education_level"
              defaultValue={student.education_level ?? ""}
            >
              <option value="">Não informado</option>
              <option value="Ensino Médio">Ensino Médio</option>
              <option value="Graduação">Graduação</option>
              <option value="Pós-graduação">Pós-graduação (lato sensu)</option>
              <option value="Mestrado">Mestrado</option>
              <option value="Doutorado">Doutorado</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="graduation_type">Tipo de graduação</Label>
            <Select
              id="graduation_type"
              name="graduation_type"
              defaultValue={student.graduation_type ?? ""}
            >
              <option value="">Não informado</option>
              <option value="Bacharel">Bacharel</option>
              <option value="Licenciatura">Licenciatura</option>
              <option value="Tecnólogo">Tecnólogo</option>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="graduation_name">Nome da graduação</Label>
            <Input
              id="graduation_name"
              name="graduation_name"
              defaultValue={student.graduation_name ?? ""}
              placeholder="Ex: Direito, Administração, Engenharia Civil…"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="professional_experience">Experiência profissional</Label>
            <Textarea
              id="professional_experience"
              name="professional_experience"
              defaultValue={student.professional_experience ?? ""}
              placeholder="Descreva suas experiências profissionais anteriores, cargos ocupados, tempo de serviço, etc."
              rows={3}
            />
          </div>
        </div>
      </fieldset>

      {/* ── Dados eleitorais ── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Dados eleitorais</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="voter_zone">Zona eleitoral</Label>
            <Input
              id="voter_zone"
              name="voter_zone"
              defaultValue={student.voter_zone ?? ""}
              placeholder="001"
              inputMode="numeric"
              maxLength={4}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="voter_section">Seção eleitoral</Label>
            <Input
              id="voter_section"
              name="voter_section"
              defaultValue={student.voter_section ?? ""}
              placeholder="0001"
              inputMode="numeric"
              maxLength={5}
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="voter_id">Título de eleitor</Label>
            <MaskedInput
              id="voter_id"
              name="voter_id"
              mask="voter"
              defaultValue={student.voter_id}
              placeholder="000000000000"
            />
            <FieldHint>12 dígitos.</FieldHint>
          </div>
        </div>
      </fieldset>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Dados de identificação salvos.</Alert>}

      <SubmitButton />
    </form>
  );
}
