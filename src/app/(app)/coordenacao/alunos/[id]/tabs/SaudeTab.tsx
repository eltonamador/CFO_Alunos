"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  addStudentWeightAction,
  updateHealthAction,
  updateOperationalSummaryAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import {
  buildWeightSummary,
  sortWeightHistoryForChart,
  type WeightHistoryEntry,
} from "@/modules/student-profile/domain/weightHistory";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import type { HealthRestrictionRow, StudentWeightHistoryRow } from "@/lib/supabase/queries/students";

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

function formatDateBR(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("pt-BR");
}

function formatDateTimeBR(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("pt-BR");
}

function formatWeight(value: number | null | undefined): string {
  if (value == null) return "—";
  return `${Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} kg`;
}

function sourceLabel(source: StudentWeightHistoryRow["source"]): string {
  return source === "coordenacao" ? "Coordenação" : "Aluno";
}

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function WeightEvolutionChart({ entries }: { entries: StudentWeightHistoryRow[] }) {
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const chartEntries = sortWeightHistoryForChart(
    entries.map((entry) => ({
      id: entry.id,
      weight_kg: Number(entry.weight_kg),
      measured_at: entry.measured_at,
      created_at: entry.created_at,
    })) satisfies WeightHistoryEntry[],
  );

  if (chartEntries.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border bg-muted/20 p-5 text-center text-sm text-muted-foreground">
        Nenhum peso registrado até o momento.
      </div>
    );
  }

  const width = 640;
  const height = 220;
  const padding = { top: 22, right: 24, bottom: 34, left: 46 };
  const weights = chartEntries.map((entry) => entry.weight_kg);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = Math.max(max - min, 1);

  const xFor = (index: number) => {
    if (chartEntries.length === 1) return width / 2;
    return padding.left + (index / (chartEntries.length - 1)) * (width - padding.left - padding.right);
  };
  const yFor = (weight: number) =>
    padding.top + ((max - weight) / range) * (height - padding.top - padding.bottom);

  const points = chartEntries.map((entry, index) => ({
    entry,
    x: xFor(index),
    y: yFor(entry.weight_kg),
  }));
  const active = points.find((point) => point.entry.id === activeId) ?? points.at(-1)!;
  const path =
    points.length === 1
      ? ""
      : points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="rounded-md border border-border bg-background p-3">
      <svg
        className="h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Evolução do peso"
      >
        <line
          x1={padding.left}
          y1={height - padding.bottom}
          x2={width - padding.right}
          y2={height - padding.bottom}
          className="stroke-border"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={height - padding.bottom}
          className="stroke-border"
          strokeWidth="1"
        />
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">
          {formatWeight(max)}
        </text>
        <text
          x={padding.left - 8}
          y={height - padding.bottom + 4}
          textAnchor="end"
          className="fill-muted-foreground text-[11px]"
        >
          {formatWeight(min)}
        </text>
        {path && <path d={path} fill="none" className="stroke-primary" strokeWidth="3" strokeLinecap="round" />}
        {points.map((point) => (
          <g
            key={point.entry.id}
            role="button"
            tabIndex={0}
            className="cursor-pointer"
            aria-label={`${formatDateBR(point.entry.measured_at)}: ${formatWeight(point.entry.weight_kg)}`}
            onMouseEnter={() => setActiveId(point.entry.id)}
            onFocus={() => setActiveId(point.entry.id)}
          >
            <circle
              cx={point.x}
              cy={point.y}
              r={active.entry.id === point.entry.id ? 6 : 4.5}
              className="fill-primary stroke-background"
              strokeWidth="2"
            />
          </g>
        ))}
        <g>
          <rect
            x={Math.min(Math.max(active.x - 76, padding.left), width - padding.right - 152)}
            y={Math.max(active.y - 48, 6)}
            width="152"
            height="34"
            rx="6"
            className="fill-card stroke-border"
          />
          <text
            x={Math.min(Math.max(active.x, padding.left + 76), width - padding.right - 76)}
            y={Math.max(active.y - 28, 26)}
            textAnchor="middle"
            className="fill-foreground text-[12px] font-semibold"
          >
            {formatWeight(active.entry.weight_kg)}
          </text>
          <text
            x={Math.min(Math.max(active.x, padding.left + 76), width - padding.right - 76)}
            y={Math.max(active.y - 13, 41)}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {formatDateBR(active.entry.measured_at)}
          </text>
        </g>
      </svg>
    </div>
  );
}

function WeightHistoryCard({
  studentId,
  history,
  canCurate,
  currentUserName,
}: {
  studentId: string;
  history: StudentWeightHistoryRow[];
  canCurate: boolean;
  currentUserName: string;
}) {
  const [state, action] = useFormState<ActionResult | null, FormData>(
    addStudentWeightAction,
    null,
  );
  const summary = buildWeightSummary(
    history.map((entry) => ({
      id: entry.id,
      weight_kg: Number(entry.weight_kg),
      measured_at: entry.measured_at,
      created_at: entry.created_at,
    })),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Histórico de Peso</CardTitle>
            <CardDescription>
              Lançamentos periódicos preservados para acompanhar a evolução ao longo do curso.
            </CardDescription>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[360px]">
            <div className="rounded-md border border-border bg-muted/25 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground">Atual</p>
              <p className="font-display text-base font-semibold">{formatWeight(summary.currentWeightKg)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/25 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground">Última</p>
              <p className="text-sm font-medium">{formatDateBR(summary.lastMeasuredAt)}</p>
            </div>
            <div className="rounded-md border border-border bg-muted/25 px-3 py-2">
              <p className="text-[10px] uppercase text-muted-foreground">Registros</p>
              <p className="font-display text-base font-semibold tabular-nums">{summary.count}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <form action={action} className="grid gap-3 rounded-md border border-border bg-muted/20 p-3 lg:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
          <input type="hidden" name="studentId" value={studentId} />
          <div className="space-y-1.5">
            <Label htmlFor="weight_kg">Peso (kg)</Label>
            <Input id="weight_kg" name="weight_kg" inputMode="decimal" placeholder="Ex: 78,5" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="measured_at">Data da medição</Label>
            {canCurate ? (
              <Input id="measured_at" name="measured_at" type="date" defaultValue={todayInputValue()} />
            ) : (
              <>
                <Input id="measured_at" type="date" value={todayInputValue()} disabled />
                <input type="hidden" name="measured_at" value={todayInputValue()} />
              </>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Responsável</Label>
            <Input value={currentUserName || "Usuário atual"} disabled />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Observação</Label>
            <Input id="notes" name="notes" maxLength={500} placeholder="Opcional" />
          </div>
          <div className="flex items-end">
            <Submit label="Adicionar" />
          </div>
          {state?.ok === false && <Alert variant="destructive" className="lg:col-span-5">{state.error}</Alert>}
          {state?.ok && <Alert variant="success" className="lg:col-span-5">Peso registrado no histórico.</Alert>}
        </form>

        <WeightEvolutionChart entries={history} />

        {history.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nenhum peso registrado até o momento.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Data da medição</th>
                  <th className="px-3 py-2 text-left">Peso</th>
                  <th className="px-3 py-2 text-left">Origem</th>
                  <th className="px-3 py-2 text-left">Responsável</th>
                  <th className="px-3 py-2 text-left">Observação</th>
                  <th className="px-3 py-2 text-left">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr key={entry.id} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-2">{formatDateBR(entry.measured_at)}</td>
                    <td className="px-3 py-2 font-medium">{formatWeight(Number(entry.weight_kg))}</td>
                    <td className="px-3 py-2">{sourceLabel(entry.source)}</td>
                    <td className="px-3 py-2">{entry.created_by_name ?? "—"}</td>
                    <td className="px-3 py-2">{entry.notes ?? "—"}</td>
                    <td className="px-3 py-2">{formatDateTimeBR(entry.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Props {
  studentId: string;
  health: HealthRestrictionRow | null;
  weightHistory: StudentWeightHistoryRow[];
  currentUserName: string;
  /** Se true (Coordenação), exibe formulário para editar o resumo operacional. */
  canCurate?: boolean;
}

export function SaudeTab({ studentId, health, weightHistory, currentUserName, canCurate = false }: Props) {
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

            <div className="grid gap-4 sm:grid-cols-3">
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

      <WeightHistoryCard
        studentId={studentId}
        history={weightHistory}
        canCurate={canCurate}
        currentUserName={currentUserName}
      />

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
