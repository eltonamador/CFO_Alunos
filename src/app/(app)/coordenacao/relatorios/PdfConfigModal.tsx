"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ShieldAlert, FileText, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  FICHA_FIELDS,
  FICHA_GROUPS,
  FICHA_PRESETS,
  evaluateSelection,
  type FichaGroupId,
  type SelectionStatus,
} from "@/lib/reports/ficha-personalizada-catalog";

// Export the data structure so we can use it in the page/card as well
export type ReportSlug =
  | "ficha-completa"
  | "ficha-personalizada"
  | "pendencias-enxoval"
  | "saude"
  | "emergencia";

export interface FieldOption {
  id: string;
  label: string;
  defaultChecked?: boolean;
}

export interface FieldGroup {
  id: string;
  label: string;
  fields: FieldOption[];
}

// Catálogos dos relatórios "fixos" (não-personalizados). A Ficha Personalizada
// usa um catálogo próprio com presets e indicador de A4 — tratada como caso
// especial no modal abaixo.
export const REPORT_CONFIGS: Record<Exclude<ReportSlug, "ficha-personalizada">, FieldGroup[]> = {
  "ficha-completa": [
    {
      id: "identificacao",
      label: "Identificação",
      fields: [
        { id: "fc_numero", label: "Número", defaultChecked: true },
        { id: "fc_nome_guerra", label: "Nome de Guerra", defaultChecked: true },
        { id: "fc_nome_completo", label: "Nome Completo" },
        { id: "fc_cpf", label: "CPF", defaultChecked: true },
        { id: "fc_rg", label: "RG", defaultChecked: true },
        { id: "fc_nasc", label: "Nascimento" },
        { id: "fc_fase", label: "Fase do CFO", defaultChecked: true },
        { id: "fc_sexo", label: "Sexo" },
      ],
    },
    {
      id: "contato",
      label: "Contato",
      fields: [
        { id: "fc_whatsapp", label: "WhatsApp", defaultChecked: true },
        { id: "fc_email", label: "E-mail" },
      ],
    },
    {
      id: "endereco",
      label: "Endereço/Origem",
      fields: [
        { id: "fc_cidade", label: "Cidade", defaultChecked: true },
        { id: "fc_estado", label: "Estado", defaultChecked: true },
      ],
    },
    {
      id: "emergencia",
      label: "Emergência",
      fields: [{ id: "fc_emergencia", label: "Contatos de Emergência" }],
    },
    {
      id: "saude",
      label: "Saúde",
      fields: [{ id: "fc_saude_resumo", label: "Resumo de Saúde (Alergias, etc)" }],
    },
    {
      id: "logistica",
      label: "Logística",
      fields: [{ id: "fc_logistica", label: "Moradia / Endereço local" }],
    },
    {
      id: "veiculo",
      label: "Veículo/CNH",
      fields: [
        { id: "fc_cnh", label: "Categoria CNH" },
        { id: "fc_veiculo", label: "Veículo (Placa/Modelo)" },
      ],
    },
    {
      id: "materiais",
      label: "Materiais",
      fields: [{ id: "fc_materiais_pendentes", label: "Resumo de Pendências" }],
    },
    {
      id: "documentos",
      label: "Documentos",
      fields: [{ id: "fc_documentos_pendentes", label: "Documentos Pendentes" }],
    },
  ],
  "pendencias-enxoval": [
    {
      id: "aluno",
      label: "Dados do Aluno",
      fields: [
        { id: "pe_numero", label: "Número", defaultChecked: true },
        { id: "pe_nome_guerra", label: "Nome de Guerra", defaultChecked: true },
        { id: "pe_sexo", label: "Sexo", defaultChecked: true },
      ],
    },
    {
      id: "item",
      label: "Detalhes do Item",
      fields: [
        { id: "pe_item", label: "Item", defaultChecked: true },
        { id: "pe_qtd", label: "Quantidade", defaultChecked: true },
        { id: "pe_status", label: "Status", defaultChecked: true },
        { id: "pe_validacao", label: "Validação da Coordenação", defaultChecked: true },
      ],
    },
  ],
  saude: [
    {
      id: "aluno",
      label: "Dados do Aluno",
      fields: [
        { id: "sa_numero", label: "Número", defaultChecked: true },
        { id: "sa_nome", label: "Nome (Guerra / Completo)", defaultChecked: true },
      ],
    },
    {
      id: "medico",
      label: "Dados Médicos",
      fields: [
        { id: "sa_sangue", label: "Tipo Sanguíneo / Fator RH", defaultChecked: true },
        { id: "sa_oculos", label: "Usa óculos" },
        { id: "sa_alergias", label: "Alergias", defaultChecked: true },
        { id: "sa_medicacao", label: "Medicação contínua", defaultChecked: true },
        { id: "sa_restricao_fisica", label: "Restrição Física/Doença", defaultChecked: true },
        { id: "sa_restricao_alimentar", label: "Restrição Alimentar" },
        { id: "sa_cirurgia_ocular", label: "Cirurgia Ocular" },
        { id: "sa_observacoes", label: "Resumo Operacional / Observações", defaultChecked: true },
        { id: "sa_validacao", label: "Status de Validação", defaultChecked: true },
      ],
    },
  ],
  emergencia: [
    {
      id: "aluno",
      label: "Dados do Aluno",
      fields: [
        { id: "em_numero", label: "Número", defaultChecked: true },
        { id: "em_nome_guerra", label: "Nome de Guerra", defaultChecked: true },
      ],
    },
    {
      id: "contato1",
      label: "Contato Prioridade 1",
      fields: [
        { id: "em_c1_nome", label: "Contato 1 (Nome)", defaultChecked: true },
        { id: "em_c1_parentesco", label: "Parentesco 1", defaultChecked: true },
        { id: "em_c1_telefone", label: "Telefone/WhatsApp 1", defaultChecked: true },
        { id: "em_c1_endereco", label: "Endereço 1", defaultChecked: true },
      ],
    },
    {
      id: "contato2",
      label: "Contato Prioridade 2",
      fields: [
        { id: "em_c2_nome", label: "Contato 2 (Nome)", defaultChecked: true },
        { id: "em_c2_parentesco", label: "Parentesco 2", defaultChecked: true },
        { id: "em_c2_telefone", label: "Telefone/WhatsApp 2", defaultChecked: true },
        { id: "em_c2_endereco", label: "Endereço 2", defaultChecked: true },
      ],
    },
  ],
};

interface PdfConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: ReportSlug;
  title: string;
  sensitive?: boolean;
  onGenerate: (selectedFields: string[]) => void;
  isGenerating?: boolean;
}

export function PdfConfigModal(props: PdfConfigModalProps) {
  if (props.slug === "ficha-personalizada") {
    return <FichaPersonalizadaModal {...props} />;
  }
  return <FixedReportModal {...props} />;
}

// =====================================================================
// Modal genérico (relatórios fixos: ficha-completa, saúde etc.)
// =====================================================================
function FixedReportModal({
  open,
  onOpenChange,
  slug,
  title,
  sensitive,
  onGenerate,
  isGenerating,
}: PdfConfigModalProps) {
  const groups = REPORT_CONFIGS[slug as Exclude<ReportSlug, "ficha-personalizada">] || [];

  const initialSelection = React.useMemo(() => {
    const selected = new Set<string>();
    groups.forEach((g) => {
      g.fields.forEach((f) => {
        if (f.defaultChecked) selected.add(f.id);
      });
    });
    return selected;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(initialSelection);

  React.useEffect(() => {
    if (open) setSelectedFields(initialSelection);
  }, [open, initialSelection]);

  const toggleField = (id: string) => {
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const all = new Set<string>();
    groups.forEach((g) => g.fields.forEach((f) => all.add(f.id)));
    setSelectedFields(all);
  };
  const clearAll = () => setSelectedFields(new Set());
  const handleGenerate = () => onGenerate(Array.from(selectedFields));

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      sensitive={sensitive}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <DialogPrimitive.Close asChild>
            <Button type="button" variant="outline" disabled={isGenerating} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogPrimitive.Close>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={selectedFields.size === 0 || isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? "Gerando..." : "Gerar PDF"}
            {!isGenerating && <FileText className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAll}>
            Selecionar todos
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            Limpar seleção
          </Button>
        </div>
        <div className="text-sm text-muted-foreground font-medium">
          <span className="text-foreground">{selectedFields.size}</span> campos selecionados
        </div>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <FieldGroupBlock
            key={group.id}
            groupLabel={group.label}
            fields={group.fields.map((f) => ({ id: f.id, label: f.label }))}
            selected={selectedFields}
            onToggle={toggleField}
          />
        ))}
      </div>

      <PreviewChips
        labelsById={Object.fromEntries(groups.flatMap((g) => g.fields).map((f) => [f.id, f.label]))}
        selected={selectedFields}
      />
    </ModalShell>
  );
}

// =====================================================================
// Modal — Ficha Personalizada (catálogo de 11 abas + indicador A4)
// =====================================================================
function FichaPersonalizadaModal({
  open,
  onOpenChange,
  title,
  sensitive,
  onGenerate,
  isGenerating,
}: PdfConfigModalProps) {
  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(new Set());
  const [activePreset, setActivePreset] = React.useState<string>("basicos");

  // Carrega o preset inicial ao abrir
  React.useEffect(() => {
    if (open) {
      const preset = FICHA_PRESETS.find((p) => p.id === "basicos");
      if (preset) {
        setSelectedFields(new Set(preset.fieldIds));
        setActivePreset("basicos");
      }
    }
  }, [open]);

  const evaluation = React.useMemo(
    () => evaluateSelection(Array.from(selectedFields)),
    [selectedFields],
  );

  const fieldsByGroup = React.useMemo(() => {
    const map = new Map<FichaGroupId, typeof FICHA_FIELDS>();
    FICHA_GROUPS.forEach((g) => map.set(g.id, []));
    FICHA_FIELDS.forEach((f) => map.get(f.groupId)?.push(f));
    return map;
  }, []);

  const toggleField = (id: string) => {
    setActivePreset("personalizado");
    setSelectedFields((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroup = (groupId: FichaGroupId) => {
    setActivePreset("personalizado");
    const groupFieldIds = (fieldsByGroup.get(groupId) ?? []).map((f) => f.id);
    setSelectedFields((prev) => {
      const next = new Set(prev);
      const allSelected = groupFieldIds.every((id) => next.has(id));
      if (allSelected) groupFieldIds.forEach((id) => next.delete(id));
      else groupFieldIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const applyPreset = (presetId: string) => {
    if (presetId === "personalizado") {
      setActivePreset("personalizado");
      return;
    }
    const preset = FICHA_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setSelectedFields(new Set(preset.fieldIds));
  };

  const clearAll = () => {
    setActivePreset("personalizado");
    setSelectedFields(new Set());
  };

  const blockGenerate =
    evaluation.status === "excesso" || evaluation.status === "vazio" || isGenerating;

  const handleGenerate = () => {
    if (blockGenerate) return;
    onGenerate(Array.from(selectedFields));
  };

  return (
    <ModalShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      sensitive={sensitive}
      maxWidthClass="max-w-3xl"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <DialogPrimitive.Close asChild>
            <Button type="button" variant="outline" disabled={isGenerating} className="w-full sm:w-auto">
              Cancelar
            </Button>
          </DialogPrimitive.Close>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={blockGenerate}
            className="w-full sm:w-auto"
          >
            {isGenerating ? "Gerando..." : "Gerar PDF"}
            {!isGenerating && <FileText className="ml-2 h-4 w-4" />}
          </Button>
        </div>
      }
    >
      {/* Presets */}
      <div className="space-y-2 border-b pb-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Presets
        </div>
        <div className="flex flex-wrap gap-2">
          {FICHA_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              title={preset.description}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                activePreset === preset.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:border-primary hover:text-primary",
              )}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => applyPreset("personalizado")}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activePreset === "personalizado"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:border-primary hover:text-primary",
            )}
          >
            Personalizado
          </button>
        </div>
      </div>

      {/* Indicador de fit A4 */}
      <SelectionStatusBar evaluation={evaluation} />

      {/* Cabeçalho de ações */}
      <div className="flex flex-col gap-2 border-b pb-2 sm:flex-row sm:items-center sm:justify-between">
        <Button type="button" variant="outline" size="sm" onClick={clearAll} className="w-full sm:w-auto">
          Limpar seleção
        </Button>
        <div className="text-sm text-muted-foreground font-medium">
          <span className="text-foreground">{evaluation.count}</span> campos ·{" "}
          <span className="text-foreground">{evaluation.totalMinPx}</span>/
          {evaluation.usablePx} pt
        </div>
      </div>

      {/* Grupos (abas) */}
      <div className="space-y-5">
        {FICHA_GROUPS.map((group) => {
          const fields = fieldsByGroup.get(group.id) ?? [];
          const selectedInGroup = fields.filter((f) => selectedFields.has(f.id)).length;
          const allSelected = fields.length > 0 && selectedInGroup === fields.length;
          return (
            <div key={group.id} className="space-y-2">
              <div className="flex items-center justify-between border-b pb-1">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary"
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded border",
                      allSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : selectedInGroup > 0
                          ? "border-primary bg-primary/20"
                          : "border-border",
                    )}
                  >
                    {allSelected && <CheckCircle2 className="h-3 w-3" />}
                  </span>
                  {group.label}
                </button>
                <span className="text-xs text-muted-foreground">
                  {selectedInGroup}/{fields.length}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 pl-1">
                {fields.map((field) => {
                  const isChecked = selectedFields.has(field.id);
                  return (
                    <label
                      key={field.id}
                      className="flex items-center gap-2 text-sm leading-none cursor-pointer group"
                    >
                      <div className="relative flex h-4 w-4 items-center justify-center rounded border border-primary/50 shadow-sm group-hover:border-primary transition-colors">
                        <input
                          type="checkbox"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          checked={isChecked}
                          onChange={() => toggleField(field.id)}
                        />
                        {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                      </div>
                      <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                        {field.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <PreviewChips
        labelsById={Object.fromEntries(FICHA_FIELDS.map((f) => [f.id, f.label]))}
        selected={selectedFields}
      />
    </ModalShell>
  );
}

// =====================================================================
// Subcomponentes compartilhados
// =====================================================================

function ModalShell({
  open,
  onOpenChange,
  title,
  sensitive,
  maxWidthClass = "max-w-2xl",
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  sensitive?: boolean;
  maxWidthClass?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 flex w-[calc(100%-1rem)] max-h-[95dvh] translate-x-[-50%] translate-y-[-50%] flex-col border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:max-h-[90dvh] sm:w-full sm:rounded-lg",
            maxWidthClass,
          )}
        >
          <div className="relative shrink-0 border-b px-4 py-4 sm:px-6">
            <DialogPrimitive.Title className="pr-8 font-display text-base font-semibold leading-tight tracking-tight sm:text-lg">
              Configurar PDF: {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="mt-1 pr-8 text-xs text-muted-foreground sm:text-sm">
              Selecione quais colunas deseja incluir no relatório final.
            </DialogPrimitive.Description>
            <DialogPrimitive.Close className="absolute right-3 top-3 rounded-sm p-1 opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
              <X className="h-5 w-5" />
              <span className="sr-only">Fechar</span>
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
            {sensitive && (
              <div className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-950 sm:text-sm dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Este relatório contém dados sensíveis. Mantenha o arquivo sob controle interno
                  conforme a LGPD.
                </p>
              </div>
            )}

            {children}
          </div>

          {footer && (
            <div className="shrink-0 border-t bg-background px-4 py-3 sm:px-6">{footer}</div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function FieldGroupBlock({
  groupLabel,
  fields,
  selected,
  onToggle,
}: {
  groupLabel: string;
  fields: { id: string; label: string }[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      <h4 className="font-medium text-sm border-b pb-1 text-foreground">{groupLabel}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((field) => {
          const isChecked = selected.has(field.id);
          return (
            <label
              key={field.id}
              className="flex items-center gap-2 text-sm leading-none cursor-pointer group"
            >
              <div className="relative flex h-4 w-4 items-center justify-center rounded border border-primary/50 shadow-sm group-hover:border-primary transition-colors">
                <input
                  type="checkbox"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  checked={isChecked}
                  onChange={() => onToggle(field.id)}
                />
                {isChecked && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
              </div>
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {field.label}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function PreviewChips({
  labelsById,
  selected,
}: {
  labelsById: Record<string, string>;
  selected: Set<string>;
}) {
  return (
    <div className="bg-muted/50 rounded-lg p-3 mt-2 border">
      <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
        Prévia das colunas
      </h5>
      <div className="flex flex-wrap gap-1.5">
        {selected.size === 0 ? (
          <span className="text-sm text-destructive">
            Nenhum campo selecionado. O PDF não será gerado.
          </span>
        ) : (
          Array.from(selected)
            .filter((id) => labelsById[id])
            .map((id) => (
              <span
                key={id}
                className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
              >
                {labelsById[id]}
              </span>
            ))
        )}
      </div>
    </div>
  );
}

const STATUS_STYLE: Record<
  SelectionStatus,
  { bar: string; text: string; label: string; icon: React.ReactNode }
> = {
  vazio: {
    bar: "bg-gray-400",
    text: "text-gray-700 bg-gray-50 border-gray-300 dark:bg-gray-900/30 dark:text-gray-200 dark:border-gray-700",
    label: "Sem seleção",
    icon: <Info className="h-4 w-4" />,
  },
  ideal: {
    bar: "bg-emerald-500",
    text: "text-emerald-800 bg-emerald-50 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-200 dark:border-emerald-700",
    label: "Ideal para A4",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  limite: {
    bar: "bg-amber-500",
    text: "text-amber-900 bg-amber-50 border-amber-300 dark:bg-amber-950/30 dark:text-amber-200 dark:border-amber-700",
    label: "No limite",
    icon: <Info className="h-4 w-4" />,
  },
  excesso: {
    bar: "bg-red-500",
    text: "text-red-900 bg-red-50 border-red-300 dark:bg-red-950/30 dark:text-red-200 dark:border-red-700",
    label: "Excesso de campos",
    icon: <AlertTriangle className="h-4 w-4" />,
  },
};

function SelectionStatusBar({
  evaluation,
}: {
  evaluation: ReturnType<typeof evaluateSelection>;
}) {
  const style = STATUS_STYLE[evaluation.status];
  const pct = Math.min(100, evaluation.occupancyPct);
  // Quando há excesso, a barra preenche 100% e fica vermelha; mostra também
  // overflow textualmente.
  return (
    <div className={cn("space-y-2 rounded-lg border px-3 py-2 text-xs", style.text)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 font-semibold">
          {style.icon}
          <span>{style.label}</span>
        </div>
        <span className="font-mono">
          {evaluation.occupancyPct}% de aproveitamento
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-black/30">
        <div className={cn("h-full transition-all", style.bar)} style={{ width: `${pct}%` }} />
      </div>
      <p className="leading-relaxed">{evaluation.message}</p>
    </div>
  );
}
