"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateHealthAction,
  updateOperationalSummaryAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import type { HealthRestrictionRow } from "@/lib/supabase/queries/students";

type YesNo = "true" | "false" | "";

function HealthBoolField({
  name,
  label,
  detailName,
  detailLabel,
  detailPlaceholder,
  initialHas,
  initialDetail,
}: {
  name: string;
  label: string;
  detailName: string;
  detailLabel: string;
  detailPlaceholder?: string;
  initialHas: boolean | null;
  initialDetail: string | null;
}) {
  const [val, setVal] = React.useState<YesNo>(
    initialHas === true ? "true" : initialHas === false ? "false" : "",
  );
  const showDetail = val === "true";
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/20 p-3">
      <Label htmlFor={name}>{label}</Label>
      <Select
        id={name}
        name={name}
        value={val}
        onChange={(e) => setVal(e.target.value as YesNo)}
      >
        <option value="">—</option>
        <option value="false">Não</option>
        <option value="true">Sim</option>
      </Select>
      {showDetail && (
        <div className="space-y-1.5 pt-1">
          <Label htmlFor={detailName} className="text-xs text-muted-foreground">
            {detailLabel}
          </Label>
          <Textarea
            id={detailName}
            name={detailName}
            defaultValue={initialDetail ?? ""}
            placeholder={detailPlaceholder}
            required
          />
        </div>
      )}
      {!showDetail && (
        <input type="hidden" name={detailName} value="" />
      )}
    </div>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

interface Props {
  studentId: string;
  health: HealthRestrictionRow | null;
  /** Se true (Coordenação), exibe formulário para editar o resumo operacional. */
  canCurate?: boolean;
}

export function SaudeTab({ studentId, health, canCurate = false }: Props) {
  const [healthState, healthAction] = useFormState<ActionResult | null, FormData>(
    updateHealthAction,
    null,
  );
  const [summaryState, summaryAction] = useFormState<ActionResult | null, FormData>(
    updateOperationalSummaryAction,
    null,
  );

  const validationBadge = () => {
    if (!health) return <Badge variant="outline">Sem registro</Badge>;
    if (health.validation_status === "validado") return <Badge variant="success">Validado</Badge>;
    if (health.validation_status === "recusado") return <Badge variant="destructive">Recusado</Badge>;
    return <Badge variant="warning">Aguardando validação</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="sensitive-banner">
        <span className="font-display text-[11px] uppercase tracking-[0.12em]">LGPD</span>
        <span className="font-normal">
          Dados sensíveis — visíveis apenas pela Coordenação e pelo próprio aluno.
        </span>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Dados clínicos</CardTitle>
            <CardDescription>
              Inclui tipo sanguíneo, medidas, restrições físicas e medicação contínua.
            </CardDescription>
          </div>
          {validationBadge()}
        </CardHeader>
        <CardContent>
          <form action={healthAction} className="space-y-4">
            <input type="hidden" name="studentId" value={studentId} />

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="blood_type">Tipo sanguíneo</Label>
                <Select id="blood_type" name="blood_type" defaultValue={health?.blood_type ?? ""}>
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rh_factor">Fator RH</Label>
                <Select id="rh_factor" name="rh_factor" defaultValue={health?.rh_factor ?? ""}>
                  <option value="">—</option>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="altura_cm">Altura (cm)</Label>
                <Input
                  id="altura_cm"
                  name="altura_cm"
                  type="number"
                  min={100}
                  max={230}
                  placeholder="Ex: 175"
                  defaultValue={health?.altura_cm ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso_kg">Peso (kg)</Label>
                <Input
                  id="peso_kg"
                  name="peso_kg"
                  type="number"
                  min={30}
                  max={300}
                  step="0.1"
                  placeholder="Ex: 72.5"
                  defaultValue={health?.peso_kg ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="uses_glasses">Usa óculos / lente?</Label>
                <Select
                  id="uses_glasses"
                  name="uses_glasses"
                  defaultValue={String(health?.uses_glasses ?? false)}
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </Select>
              </div>
            </div>

            <HealthBoolField
              name="has_eye_surgery"
              label="Realizou cirurgia ocular / refrativa?"
              detailName="cirurgia_ocular_obs"
              detailLabel="Qual cirurgia? (tipo, data e observações)"
              detailPlaceholder="Ex.: Lasik em 2022 — olho direito"
              initialHas={
                health?.has_eye_surgery ?? health?.cirurgia_ocular ?? null
              }
              initialDetail={health?.cirurgia_ocular_obs ?? null}
            />

            <HealthBoolField
              name="has_allergies"
              label="Possui alergia?"
              detailName="allergies"
              detailLabel="Quais alergias?"
              detailPlaceholder="Ex.: camarão, dipirona"
              initialHas={health?.has_allergies ?? null}
              initialDetail={health?.allergies ?? null}
            />

            <HealthBoolField
              name="has_continuous_medication"
              label="Usa medicamento contínuo?"
              detailName="continuous_medication"
              detailLabel="Qual medicamento? (nome, dose, frequência)"
              initialHas={health?.has_continuous_medication ?? null}
              initialDetail={health?.continuous_medication ?? null}
            />

            <HealthBoolField
              name="has_chronic_disease"
              label="Possui doença crônica relevante?"
              detailName="chronic_disease"
              detailLabel="Qual doença? (diagnóstico)"
              initialHas={health?.has_chronic_disease ?? null}
              initialDetail={health?.chronic_disease ?? null}
            />

            <HealthBoolField
              name="has_physical_restriction"
              label="Possui restrição física?"
              detailName="physical_restriction"
              detailLabel="Qual restrição física?"
              initialHas={health?.has_physical_restriction ?? null}
              initialDetail={health?.physical_restriction ?? null}
            />

            <HealthBoolField
              name="has_dietary_restriction"
              label="Possui restrição alimentar?"
              detailName="dietary_restriction"
              detailLabel="Qual restrição alimentar?"
              initialHas={health?.has_dietary_restriction ?? null}
              initialDetail={health?.dietary_restriction ?? null}
            />
            <div className="space-y-2">
              <Label htmlFor="medical_notes">Observação médica</Label>
              <Textarea id="medical_notes" name="medical_notes" defaultValue={health?.medical_notes ?? ""} />
            </div>

            {healthState?.ok === false && <Alert variant="destructive">{healthState.error}</Alert>}
            {healthState?.ok && (
              <Alert variant="success">
                Dados salvos. Aguardando validação da Coordenação.
              </Alert>
            )}

            <Submit label="Salvar dados clínicos" />
          </form>
        </CardContent>
      </Card>

      {canCurate && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo operacional (visível ao Instrutor)</CardTitle>
            <CardDescription>
              Texto curto e operacional. NÃO inclua diagnóstico. Será o único campo de saúde
              exposto ao Instrutor no card rápido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={summaryAction} className="space-y-3">
              <input type="hidden" name="studentId" value={studentId} />
              <Textarea
                name="operational_summary"
                defaultValue={health?.operational_summary ?? ""}
                maxLength={300}
                placeholder='Ex.: "Sem mergulho", "Sem corrida prolongada"'
              />
              {summaryState?.ok === false && <Alert variant="destructive">{summaryState.error}</Alert>}
              {summaryState?.ok && <Alert variant="success">Resumo atualizado.</Alert>}
              <Submit label="Salvar resumo operacional" />
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
