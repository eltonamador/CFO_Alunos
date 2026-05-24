"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

// Export the data structure so we can use it in the page/card as well
export type ReportSlug = "ficha-completa" | "pendencias-enxoval" | "saude" | "emergencia";

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

export const REPORT_CONFIGS: Record<ReportSlug, FieldGroup[]> = {
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

export function PdfConfigModal({
  open,
  onOpenChange,
  slug,
  title,
  sensitive,
  onGenerate,
  isGenerating,
}: PdfConfigModalProps) {
  const initialSelection = React.useMemo(() => {
    const groups = REPORT_CONFIGS[slug] || [];
    const selected = new Set<string>();
    groups.forEach((g) => {
      g.fields.forEach((f) => {
        if (f.defaultChecked) selected.add(f.id);
      });
    });
    return selected;
  }, [slug]);

  const groups = REPORT_CONFIGS[slug] || [];

  const [selectedFields, setSelectedFields] = React.useState<Set<string>>(initialSelection);

  // Reset selection when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedFields(initialSelection);
    }
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

  const clearAll = () => {
    setSelectedFields(new Set());
  };

  const handleGenerate = () => {
    onGenerate(Array.from(selectedFields));
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg md:w-full">
          
          <div className="flex flex-col space-y-1.5">
            <DialogPrimitive.Title className="font-display text-lg font-semibold leading-none tracking-tight">
              Configurar PDF: {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-sm text-muted-foreground">
              Selecione quais colunas deseja incluir no relatório final.
            </DialogPrimitive.Description>
          </div>

          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Fechar</span>
          </DialogPrimitive.Close>

          {sensitive && (
            <div className="flex gap-2 rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <p>Este relatório contém dados sensíveis. Mantenha o arquivo sob controle interno conforme a LGPD.</p>
            </div>
          )}

          <div className="flex items-center justify-between border-b pb-2">
            <div className="space-x-2">
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

          <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-6">
            {groups.map((group) => (
              <div key={group.id} className="space-y-3">
                <h4 className="font-medium text-sm border-b pb-1 text-foreground">{group.label}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.fields.map((field) => {
                    const isChecked = selectedFields.has(field.id);
                    return (
                      <label
                        key={field.id}
                        className="flex items-center gap-2 text-sm leading-none cursor-pointer group"
                      >
                        <div className="relative flex h-4 w-4 items-center justify-center rounded border border-primary/50 text-current shadow-sm group-hover:border-primary transition-colors">
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
            ))}
          </div>

          <div className="bg-muted/50 rounded-lg p-3 mt-2 border">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Prévia das colunas</h5>
            <div className="flex flex-wrap gap-1.5">
              {selectedFields.size === 0 ? (
                <span className="text-sm text-destructive">Nenhum campo selecionado. O PDF não será gerado.</span>
              ) : (
                groups.flatMap(g => g.fields)
                  .filter(f => selectedFields.has(f.id))
                  .map(f => (
                    <span key={f.id} className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {f.label}
                    </span>
                  ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <DialogPrimitive.Close asChild>
              <Button type="button" variant="outline" disabled={isGenerating}>
                Cancelar
              </Button>
            </DialogPrimitive.Close>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={selectedFields.size === 0 || isGenerating}
            >
              {isGenerating ? "Gerando..." : "Gerar PDF"}
              {!isGenerating && <FileText className="ml-2 h-4 w-4" />}
            </Button>
          </div>

        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
