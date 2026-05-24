"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  upsertEquipmentStatusAction,
  validateEquipmentItemAction,
  type ActionResult,
} from "@/modules/equipment-checklist/presentation/actions/equipmentActions";
import type {
  CategoryWithItems,
  EquipmentRequirementRow,
  StudentEquipmentStatusRow,
} from "@/lib/supabase/queries/equipment";

// =====================================================================
// Tipos auxiliares
// =====================================================================
const STATUS_OPTIONS = [
  { value: "pendente_validacao", label: "Pendente", color: "text-muted-foreground" },
  { value: "ok", label: "✔ OK", color: "text-green-600" },
  { value: "comprado", label: "Comprado", color: "text-blue-600" },
  { value: "vai_chegar", label: "Ainda vai chegar", color: "text-yellow-600" },
  { value: "falta_comprar", label: "Falta comprar", color: "text-orange-600" },
  { value: "em_duvida", label: "Em dúvida", color: "text-purple-600" },
  { value: "inadequado", label: "Inadequado", color: "text-red-600" },
  { value: "nao_se_aplica", label: "Não se aplica", color: "text-muted-foreground" },
] as const;

const DONE_STATUSES = new Set(["ok", "nao_se_aplica"]);
const PENDING_STATUSES = new Set([
  "pendente_validacao",
  "falta_comprar",
  "em_duvida",
  "inadequado",
  "vai_chegar",
]);

function isPending(
  req: EquipmentRequirementRow,
  status?: StudentEquipmentStatusRow,
): boolean {
  if (!req.mandatory) return false;
  if (!status) return true;
  if (DONE_STATUSES.has(status.status)) {
    return status.validation_status !== "validado" && status.status === "comprado";
  }
  return PENDING_STATUSES.has(status.status);
}

// =====================================================================
// Barra de progresso
// =====================================================================
function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total === 0 ? 100 : Math.round((done / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{done} de {total} itens obrigatórios concluídos</span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// =====================================================================
// Item individual
// =====================================================================
function SubmitItemButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
    >
      {pending ? "…" : "Salvar"}
    </button>
  );
}

function SubmitValidateButton({ label, name, value }: { label: string; name: string; value: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      className="rounded border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
    >
      {pending ? "…" : label}
    </button>
  );
}

function EquipmentItem({
  req,
  studentId,
  status,
  canValidate,
}: {
  req: EquipmentRequirementRow;
  studentId: string;
  status?: StudentEquipmentStatusRow;
  canValidate: boolean;
}) {
  const [statusState, statusAction] = useFormState<ActionResult | null, FormData>(
    upsertEquipmentStatusAction,
    null,
  );
  const [validState, validAction] = useFormState<ActionResult | null, FormData>(
    validateEquipmentItemAction,
    null,
  );

  const currentStatus = status?.status ?? "pendente_validacao";
  const validationStatus = status?.validation_status;
  const statusId = status?.id;

  const [selectedStatus, setSelectedStatus] = React.useState(currentStatus);
  const showNotesField = selectedStatus === "em_duvida";

  const pending = isPending(req, status);

  return (
    <li className={`rounded-lg border p-3 ${pending ? "border-orange-200 bg-orange-50/30 dark:border-orange-900/40 dark:bg-orange-950/20" : "border-border bg-card"}`}>
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <span
          className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
            currentStatus === "ok" || currentStatus === "nao_se_aplica"
              ? validationStatus === "validado"
                ? "bg-green-500"
                : "bg-blue-400"
              : pending
              ? "bg-orange-400"
              : "bg-muted-foreground"
          }`}
        />
        <div className="min-w-0 flex-1 space-y-2">
          {/* Item name + qty */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{req.name}</span>
            <span className="text-xs text-muted-foreground">
              {req.quantity} {req.unit}
            </span>
            {!req.mandatory && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                opcional
              </span>
            )}
            {validationStatus === "validado" && (
              <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                validado ✔
              </span>
            )}
            {validationStatus === "reprovado" && (
              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                reprovado ✗
              </span>
            )}
          </div>

          {req.notes && (
            <p className="text-xs text-muted-foreground">{req.notes}</p>
          )}

          {/* Status form */}
          <form action={statusAction} className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="studentId" value={studentId} />
              <input type="hidden" name="requirementId" value={req.id} />
              <select
                name="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as typeof currentStatus)}
                className="rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <SubmitItemButton />
              {statusState?.ok === false && (
                <span className="text-xs text-destructive">{statusState.error}</span>
              )}
            </div>

            {showNotesField && (
              <textarea
                name="studentNotes"
                defaultValue={status?.student_notes ?? ""}
                placeholder="Descreva sua dúvida sobre este item..."
                rows={2}
                className="w-full rounded border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </form>

          {/* Dúvida registrada — visível para a Coordenação */}
          {canValidate && currentStatus === "em_duvida" && status?.student_notes && (
            <div className="rounded bg-purple-50 px-2 py-1.5 text-xs text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">
              <span className="font-medium">Dúvida do aluno: </span>
              {status.student_notes}
            </div>
          )}

          {/* Validar / Reprovar (coord only, quando item tem status informado) */}
          {canValidate && statusId && (
            <form action={validAction} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="statusId" value={statusId} />
              <input type="hidden" name="studentId" value={studentId} />
              <SubmitValidateButton label="Validar" name="action" value="validar" />
              <SubmitValidateButton label="Reprovar" name="action" value="reprovar" />
              {validState?.ok === false && (
                <span className="text-xs text-destructive">{validState.error}</span>
              )}
            </form>
          )}
        </div>
      </div>
    </li>
  );
}

// =====================================================================
// Agrupamento por seção e por fase (quarentena vs enxoval)
// =====================================================================
type SectionGroup = {
  sectionOrdinal: number;
  sectionName: string;
  groups: CategoryWithItems[];
};

type PhaseGroup = "quarentena" | "enxoval";

/** Filtra requirements de cada CategoryWithItems pela fase. */
function filterByPhase(
  checklist: CategoryWithItems[],
  phaseGroup: PhaseGroup,
): CategoryWithItems[] {
  return checklist
    .map((g) => ({
      ...g,
      requirements: g.requirements.filter((r) =>
        phaseGroup === "quarentena"
          ? r.phase === "quarentena"
          : r.phase === "inicio" || r.phase === "posterior",
      ),
    }))
    .filter((g) => g.requirements.length > 0);
}

function buildSections(checklist: CategoryWithItems[]): SectionGroup[] {
  const map = new Map<number, SectionGroup>();
  for (const group of checklist) {
    const ord = group.category.section_ordinal ?? 0;
    const name = group.category.section_name ?? "Outros";
    if (!map.has(ord)) map.set(ord, { sectionOrdinal: ord, sectionName: name, groups: [] });
    map.get(ord)!.groups.push(group);
  }
  return Array.from(map.values()).sort((a, b) => a.sectionOrdinal - b.sectionOrdinal);
}

// =====================================================================
// Grupo de categoria
// =====================================================================
function CategoryGroup({
  group,
  studentId,
  studentSex,
  canValidate,
}: {
  group: CategoryWithItems;
  studentId: string;
  studentSex: "M" | "F" | null;
  canValidate: boolean;
}) {
  const [open, setOpen] = React.useState(group.category.ordinal <= 2);

  // Filtra por sexo
  const visibleReqs = group.requirements.filter((r) => {
    if (r.applicability === "todos" || r.applicability === "condicional") return true;
    if (studentSex === "M" && r.applicability === "masculino") return true;
    if (studentSex === "F" && r.applicability === "feminino") return true;
    return false;
  });

  if (visibleReqs.length === 0) return null;

  const pendingCount = visibleReqs.filter((r) =>
    isPending(r, group.statuses[r.id]),
  ).length;

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-left transition-colors hover:bg-accent/50"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{group.category.name}</span>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {visibleReqs.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
            </span>
          )}
          {pendingCount === 0 && (
            <span className="text-xs text-green-600">✔ completo</span>
          )}
          <svg
            className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <ul className="space-y-2 border-t p-4">
          {visibleReqs.map((req) => (
            <EquipmentItem
              key={req.id}
              req={req}
              studentId={studentId}
              status={group.statuses[req.id]}
              canValidate={canValidate}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

// =====================================================================
// Bloco de fase (Quarentena / Enxoval do Curso)
// =====================================================================
function SectionCategories({
  sections,
  studentId,
  studentSex,
  canValidate,
}: {
  sections: SectionGroup[];
  studentId: string;
  studentSex: "M" | "F" | null;
  canValidate: boolean;
}) {
  if (sections.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhum item disponível nesta seção.
      </p>
    );
  }
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <div key={section.sectionOrdinal} className="space-y-2">
          <div className="flex items-center gap-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
              {section.sectionOrdinal}. {section.sectionName}
            </h4>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-2">
            {section.groups.map((group) => (
              <CategoryGroup
                key={group.category.id}
                group={group}
                studentId={studentId}
                studentSex={studentSex}
                canValidate={canValidate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function PhaseSection({
  title,
  description,
  accent,
  sections,
  studentId,
  studentSex,
  canValidate,
}: {
  title: string;
  description: string;
  accent: "primary" | "muted";
  sections: SectionGroup[];
  studentId: string;
  studentSex: "M" | "F" | null;
  canValidate: boolean;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-3">
        <h2
          className={`text-base font-semibold font-display uppercase tracking-wide whitespace-nowrap ${
            accent === "primary" ? "text-primary" : "text-muted-foreground"
          }`}
        >
          {title}
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>
      <p className="text-xs text-muted-foreground">{description}</p>
      <SectionCategories
        sections={sections}
        studentId={studentId}
        studentSex={studentSex}
        canValidate={canValidate}
      />
    </section>
  );
}

// =====================================================================
// Tab principal exportada
// =====================================================================
export function MateriaisTab({
  studentId,
  studentSex,
  checklist,
  canValidate,
}: {
  studentId: string;
  studentSex: "M" | "F" | null;
  checklist: CategoryWithItems[];
  canValidate?: boolean;
}) {
  // Calcula progresso geral
  const allReqs = checklist.flatMap((g) =>
    g.requirements.filter((r) => {
      if (r.applicability === "todos" || r.applicability === "condicional") return true;
      if (studentSex === "M" && r.applicability === "masculino") return true;
      if (studentSex === "F" && r.applicability === "feminino") return true;
      return false;
    }).filter((r) => r.mandatory),
  );

  const doneReqs = allReqs.filter((r) => {
    const s = checklist.find((g) => g.statuses[r.id])?.statuses[r.id];
    return s && !isPending(r, s);
  });

  if (checklist.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <p className="text-muted-foreground">
          Catálogo de materiais ainda não disponível. Contate a Coordenação.
        </p>
      </div>
    );
  }

  const quarentenaList = filterByPhase(checklist, "quarentena");
  const enxovalList    = filterByPhase(checklist, "enxoval");
  const quarentenaSections = buildSections(quarentenaList);
  const enxovalSections    = buildSections(enxovalList);

  return (
    <div className="space-y-4">
      {/* Progresso agregado */}
      <div className="rounded-lg border bg-card p-4">
        <ProgressBar done={doneReqs.length} total={allReqs.length} />
      </div>

      {/* ── QUARENTENA ─────────────────────────────────────────────── */}
      <PhaseSection
        title="Quarentena"
        description="Itens necessários antes do início do curso — providencie com antecedência."
        accent="primary"
        sections={quarentenaSections}
        studentId={studentId}
        studentSex={studentSex}
        canValidate={canValidate ?? false}
      />

      {/* ── ENXOVAL DO CURSO ───────────────────────────────────────── */}
      <PhaseSection
        title="Enxoval do Curso"
        description="Itens adquiridos conforme cronograma e disciplinas do curso."
        accent="muted"
        sections={enxovalSections}
        studentId={studentId}
        studentSex={studentSex}
        canValidate={canValidate ?? false}
      />

      <p className="text-xs text-muted-foreground">
        * Itens marcados como &quot;OK&quot; ou &quot;Não se aplica&quot; e validados pela Coordenação não contam como pendência.
      </p>
    </div>
  );
}
