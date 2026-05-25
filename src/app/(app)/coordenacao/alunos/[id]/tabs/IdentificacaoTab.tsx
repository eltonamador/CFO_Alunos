"use client";

import { useState } from "react";
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

  const [religion, setReligion] = useState(student.religion ?? "");
  const [hasRestriction, setHasRestriction] = useState(
    student.has_religious_restriction === true ? "true" : student.has_religious_restriction === false ? "false" : ""
  );
  const [birthDate, setBirthDate] = useState(student.birth_date ?? "");

  const age = (() => {
    if (!birthDate) return null;
    const d = new Date(birthDate);
    if (Number.isNaN(d.getTime())) return null;
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years--;
    return years >= 0 && years < 130 ? years : null;
  })();

  const showReligionOther = religion === "Outra";
  const showRestrictionNotes = religion === "Adventista" || hasRestriction === "true";

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
            <div className="flex items-center gap-2">
              <Input
                id="birth_date"
                name="birth_date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                max={TODAY}
                className="flex-1"
              />
              <div className="flex h-10 min-w-[88px] items-center justify-center rounded-md border bg-muted px-3 text-sm font-medium tabular-nums">
                {age !== null ? `${age} anos` : "—"}
              </div>
            </div>
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

      {/* ── Documentos pessoais ── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Documentos pessoais</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="cpf">CPF</Label>
            <MaskedInput
              id="cpf"
              name="cpf"
              mask="cpf"
              defaultValue={student.cpf}
              placeholder="000.000.000-00"
            />
            <FieldHint>Apenas números (11 dígitos).</FieldHint>
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="rg">RG</Label>
            <Input
              id="rg"
              name="rg"
              defaultValue={student.rg ?? ""}
              placeholder="Registro Geral"
            />
          </div>

          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="pis">PIS/PASEP</Label>
            <Input
              id="pis"
              name="pis"
              defaultValue={student.pis ?? ""}
              placeholder="Apenas números"
              inputMode="numeric"
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

      {/* ── Informações complementares (Religião e Restrições) ── */}
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold text-orange-600 dark:text-orange-500">
          Informações complementares (Religião e Restrições)
        </legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="religion">Religião/Crença (Opcional)</Label>
            <Select
              id="religion"
              name="religion"
              value={religion}
              onChange={(e) => setReligion(e.target.value)}
            >
              <option value="">Não informar</option>
              <option value="Católica">Católica</option>
              <option value="Evangélica">Evangélica</option>
              <option value="Adventista">Adventista</option>
              <option value="Espírita">Espírita</option>
              <option value="Umbanda/Candomblé">Umbanda/Candomblé</option>
              <option value="Sem religião">Sem religião</option>
              <option value="Outra">Outra</option>
            </Select>
            <FieldHint>Esta informação é sensível e será acessada restritamente.</FieldHint>
          </div>

          {showReligionOther && (
            <div className="space-y-2">
              <Label htmlFor="religion_other">Qual?</Label>
              <Input
                id="religion_other"
                name="religion_other"
                defaultValue={student.religion_other ?? ""}
                placeholder="Informe sua religião"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="has_religious_restriction">
              Possui restrição ou consideração operacional por motivo religioso?
            </Label>
            <Select
              id="has_religious_restriction"
              name="has_religious_restriction"
              value={hasRestriction}
              onChange={(e) => setHasRestriction(e.target.value)}
            >
              <option value="">Não informar</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
            <FieldHint>
              Ex: Guardar dia específico (Sábado), restrição alimentar, corte de cabelo, etc.
            </FieldHint>
          </div>

          {showRestrictionNotes && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="religious_restriction_notes">
                Observações da restrição (Obrigatório se possuir)
              </Label>
              <Textarea
                id="religious_restriction_notes"
                name="religious_restriction_notes"
                defaultValue={student.religious_restriction_notes ?? ""}
                placeholder="Detalhe as considerações operacionais ou de escala…"
                rows={3}
              />
            </div>
          )}
        </div>
      </fieldset>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Dados de identificação salvos.</Alert>}

      <SubmitButton />
    </form>
  );
}
