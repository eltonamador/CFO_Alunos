"use client";

import * as React from "react";

/**
 * Renderiza diff "antes/depois" de pendências de cadastro/saúde de forma
 * humana — nada de JSON bruto, nada de chaves de banco, valores
 * formatados em pt-BR com unidades e a coluna "Situação" para apoiar
 * a decisão da Coordenação.
 */

// ─────────────────────────────────────────────────────────────────────
// Catálogo de rótulos amigáveis (saúde + cadastro)
// ─────────────────────────────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  // Saúde
  blood_type: "Tipo sanguíneo",
  rh_factor: "Fator RH",
  altura_cm: "Altura",
  peso_kg: "Peso",
  cirurgia_ocular: "Cirurgia ocular",
  cirurgia_ocular_obs: "Observação cirurgia ocular",
  allergies: "Alergias",
  continuous_medication: "Medicamento contínuo",
  chronic_disease: "Doença crônica",
  physical_restriction: "Restrição física",
  dietary_restriction: "Restrição alimentar",
  uses_glasses: "Usa óculos",
  medical_notes: "Observações médicas",
  operational_summary: "Resumo operacional",

  // Identificação / pessoal
  full_name: "Nome completo",
  war_name: "Nome de guerra",
  sex: "Sexo",
  birth_date: "Data de nascimento",
  nationality: "Nacionalidade",
  naturality_state: "UF de nascimento",
  naturality_city: "Município de nascimento",
  marital_status: "Estado civil",
  education_level: "Escolaridade",
  graduation_type: "Tipo de graduação",
  graduation_name: "Nome da graduação",
  professional_experience: "Experiência profissional",
  father_name: "Nome do pai",
  mother_name: "Nome da mãe",

  // Documentos pessoais
  cpf: "CPF",
  rg: "RG",
  pis: "PIS",
  voter_id: "Título de eleitor",
  voter_zone: "Zona eleitoral",
  voter_section: "Seção eleitoral",
  enrollment_id: "Matrícula",
  presentation_date: "Data de apresentação",

  // Contato
  whatsapp: "WhatsApp",
  phone_secondary: "Telefone secundário",
  email_personal: "E-mail pessoal",
  email_institutional: "E-mail institucional",
  notes: "Observações",

  // Endereço
  street: "Rua",
  district: "Bairro",
  city: "Cidade",
  state: "UF",
  zip: "CEP",
  landmark: "Ponto de referência",
  origin_in_amapa: "Origem no Amapá",
  from_other_state: "Vem de outro estado",
  origin_state: "Estado de origem",
  origin_city: "Cidade de origem",

  // Logística
  has_fixed_residence_macapa: "Residência fixa em Macapá",
  course_address: "Endereço durante o curso",
  has_family_in_ap: "Família no Amapá",
  local_contact: "Contato local",

  // Veículo / CNH
  has_vehicle: "Possui veículo",
  vehicle_type: "Tipo de veículo",
  plate: "Placa",
  has_cnh: "Possui CNH",
  cnh_category: "Categoria CNH",
  cnh_valid_until: "Validade CNH",
  cnh_attached: "CNH anexada",
};

// Unidades fixas por campo (acopladas ao valor formatado)
const UNITS: Record<string, string> = {
  altura_cm: "cm",
  peso_kg: "kg",
};

// Chaves de auditoria/internas que NUNCA aparecem para a coordenação
const HIDDEN_KEYS = new Set([
  "id",
  "student_id",
  "class_id",
  "created_at",
  "updated_at",
  "created_by",
  "updated_by",
  "deleted_at",
  "validation_status",
  "validated_by",
  "validated_at",
  "last_updated_at",
]);

function labelFor(key: string): string {
  return FIELD_LABELS[key] ?? key.replace(/_/g, " ");
}

// ─────────────────────────────────────────────────────────────────────
// Formatação humana de valores
// ─────────────────────────────────────────────────────────────────────
const NOT_INFORMED = "Não informado";

function isEmpty(v: unknown): boolean {
  return (
    v === null ||
    v === undefined ||
    v === "" ||
    (typeof v === "string" && v.trim() === "")
  );
}

function formatNumber(n: number): string {
  // pt-BR: vírgula como separador decimal
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function formatValue(key: string, v: unknown): string {
  if (isEmpty(v)) return NOT_INFORMED;

  // Booleanos → Sim/Não
  if (typeof v === "boolean") return v ? "Sim" : "Não";

  // Strings booleanas vindas de form ('true'/'false')
  if (v === "true") return "Sim";
  if (v === "false") return "Não";

  // Números → com unidade quando aplicável
  if (typeof v === "number") {
    const unit = UNITS[key];
    return unit ? `${formatNumber(v)} ${unit}` : formatNumber(v);
  }

  if (typeof v === "string") {
    // Sexo
    if (key === "sex") {
      if (v === "M") return "Masculino";
      if (v === "F") return "Feminino";
    }

    // Datas ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [y, m, d] = v.split("-");
      return `${d}/${m}/${y}`;
    }

    // Datetimes ISO
    if (/^\d{4}-\d{2}-\d{2}T/.test(v)) {
      try {
        return new Date(v).toLocaleString("pt-BR");
      } catch {
        return v;
      }
    }

    // Numéricos que vieram como string (ex: "31.7") com unidade conhecida
    if (UNITS[key] && /^-?\d+(\.\d+)?$/.test(v)) {
      return `${formatNumber(Number(v))} ${UNITS[key]}`;
    }

    return v;
  }

  // Fallback seguro — nunca mostra JSON cru.
  return String(v);
}

// ─────────────────────────────────────────────────────────────────────
// Classificação de situação (Adicionado/Alterado/Removido/Sem alteração)
// ─────────────────────────────────────────────────────────────────────
type Situation = "added" | "changed" | "removed" | "unchanged" | "missing";

function classifyChange(before: unknown, after: unknown): Situation {
  const beforeEmpty = isEmpty(before);
  const afterEmpty = isEmpty(after);
  if (beforeEmpty && afterEmpty) return "missing";
  if (beforeEmpty && !afterEmpty) return "added";
  if (!beforeEmpty && afterEmpty) return "removed";
  // Comparação pelo valor formatado para evitar falsos positivos
  // (ex: number 1 vs string "1" → mesma representação humana)
  return JSON.stringify(before) === JSON.stringify(after) ? "unchanged" : "changed";
}

const SITUATION_META: Record<
  Situation,
  { label: string; className: string; rowClass: string }
> = {
  added: {
    label: "Preenchido",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
    rowClass: "bg-emerald-50/40 dark:bg-emerald-950/10",
  },
  changed: {
    label: "Alterado",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
    rowClass: "bg-amber-50/40 dark:bg-amber-950/10",
  },
  removed: {
    label: "Removido",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200",
    rowClass: "bg-red-50/40 dark:bg-red-950/10",
  },
  unchanged: {
    label: "Sem alteração",
    className: "bg-muted text-muted-foreground",
    rowClass: "",
  },
  missing: {
    label: "Não informado",
    className: "bg-muted text-muted-foreground",
    rowClass: "",
  },
};

// ─────────────────────────────────────────────────────────────────────
// Componente
// ─────────────────────────────────────────────────────────────────────
interface Props {
  previous: unknown;
  next: unknown;
  /**
   * Contexto da pendência (vindo de pending_changes.context).
   * Se for "health", exibe aviso discreto de LGPD.
   */
  context?: string;
}

export function DiffTable({ previous, next, context }: Props) {
  const prevObj = (previous && typeof previous === "object" ? previous : {}) as Record<string, unknown>;
  const nextObj = (next && typeof next === "object" ? next : {}) as Record<string, unknown>;

  const allKeys = Array.from(new Set([...Object.keys(prevObj), ...Object.keys(nextObj)]))
    .filter((k) => !HIDDEN_KEYS.has(k))
    .sort((a, b) => labelFor(a).localeCompare(labelFor(b), "pt-BR"));

  // Pré-classifica e filtra: ocultar campos que não foram informados nem antes nem depois
  // (não trazem nenhum valor de decisão para a Coordenação)
  const rows = allKeys
    .map((key) => {
      const before = prevObj[key];
      const after = nextObj[key];
      const situation = classifyChange(before, after);
      return {
        key,
        label: labelFor(key),
        beforeText: formatValue(key, before),
        afterText: formatValue(key, after),
        situation,
      };
    })
    .filter((r) => r.situation !== "missing");

  // Contagens para o sumário
  const counts = rows.reduce(
    (acc, r) => {
      acc.total += 1;
      if (r.situation === "added" || r.situation === "changed" || r.situation === "removed") {
        acc.touched += 1;
      }
      return acc;
    },
    { total: 0, touched: 0 },
  );

  const isHealth = context === "health";

  if (rows.length === 0) {
    return (
      <div className="rounded-md border bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">
        <p className="font-medium">Nenhum dado foi preenchido pelo aluno.</p>
        <p className="mt-1">Necessita conferência da Coordenação antes de validar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Sumário acima da tabela */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">{counts.touched}</span> alteração
          {counts.touched === 1 ? "" : "ões"} ·{" "}
          <span className="font-semibold text-foreground">{counts.total}</span> campo
          {counts.total === 1 ? "" : "s"} no envio
        </span>
        {isHealth && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">
            🔒 Dados sensíveis · LGPD
          </span>
        )}
      </div>

      {/* Tabela responsiva */}
      <div className="overflow-x-auto rounded-md border bg-background">
        <table className="w-full text-xs">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="px-3 py-2 font-semibold">Campo</th>
              <th className="px-3 py-2 font-semibold">Valor anterior</th>
              <th className="px-3 py-2 font-semibold">Novo valor</th>
              <th className="px-3 py-2 font-semibold text-right">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => {
              const meta = SITUATION_META[r.situation];
              const beforeIsEmpty = r.beforeText === NOT_INFORMED;
              const afterIsEmpty = r.afterText === NOT_INFORMED;
              return (
                <tr key={r.key} className={meta.rowClass}>
                  <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">
                    {r.label}
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      beforeIsEmpty
                        ? "italic text-muted-foreground"
                        : r.situation === "changed" || r.situation === "removed"
                        ? "text-red-700 line-through decoration-red-300/60 dark:text-red-300"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r.beforeText}
                  </td>
                  <td
                    className={`px-3 py-2 ${
                      afterIsEmpty
                        ? "italic text-muted-foreground"
                        : r.situation === "added" || r.situation === "changed"
                        ? "font-semibold text-emerald-700 dark:text-emerald-300"
                        : "text-muted-foreground"
                    }`}
                  >
                    {r.afterText}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
