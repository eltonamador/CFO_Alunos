/**
 * Máscaras e validadores reutilizáveis para formulários do CFO Alunos.
 * Funções puras — usadas tanto no client (MaskedInput) quanto no server
 * (normalização antes de persistir no Supabase).
 */

export type MaskKind = "phone" | "cpf" | "cep" | "uf" | "plate" | "voter" | "rg";

export function digitsOnly(v: string | null | undefined): string {
  if (v == null) return "";
  return String(v).replace(/\D+/g, "");
}

export function lettersDigits(v: string | null | undefined): string {
  if (v == null) return "";
  return String(v).replace(/[^A-Za-z0-9]/g, "");
}

// ─────────────────────────────────────────────────────────────────────
// Telefone BR — (XX) XXXX-XXXX (fixo) ou (XX) 9XXXX-XXXX (celular)
// ─────────────────────────────────────────────────────────────────────
export function maskPhone(value: string | null | undefined): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function isValidPhone(value: string | null | undefined): boolean {
  const d = digitsOnly(value);
  return d.length === 10 || d.length === 11;
}

// ─────────────────────────────────────────────────────────────────────
// CPF — XXX.XXX.XXX-XX (sem validar dígito verificador — opcional)
// ─────────────────────────────────────────────────────────────────────
export function maskCPF(value: string | null | undefined): string {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isValidCPF(value: string | null | undefined): boolean {
  const d = digitsOnly(value);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  // Cálculo de DV
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(d[i]) * (10 - i);
  let dv1 = (sum * 10) % 11;
  if (dv1 === 10) dv1 = 0;
  if (dv1 !== Number(d[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(d[i]) * (11 - i);
  let dv2 = (sum * 10) % 11;
  if (dv2 === 10) dv2 = 0;
  return dv2 === Number(d[10]);
}

// ─────────────────────────────────────────────────────────────────────
// CEP — XXXXX-XXX
// ─────────────────────────────────────────────────────────────────────
export function maskCEP(value: string | null | undefined): string {
  const d = digitsOnly(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isValidCEP(value: string | null | undefined): boolean {
  return digitsOnly(value).length === 8;
}

// ─────────────────────────────────────────────────────────────────────
// UF — 2 letras maiúsculas
// ─────────────────────────────────────────────────────────────────────
const UFS = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG",
  "PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

export function maskUF(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value).replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 2);
}

export function isValidUF(value: string | null | undefined): boolean {
  if (!value) return false;
  return UFS.includes(maskUF(value));
}

// ─────────────────────────────────────────────────────────────────────
// Placa — antiga (AAA-0000) ou Mercosul (AAA-0A00)
// ─────────────────────────────────────────────────────────────────────
export function maskPlate(value: string | null | undefined): string {
  if (value == null) return "";
  const raw = lettersDigits(value).toUpperCase().slice(0, 7);
  if (raw.length <= 3) return raw;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

const PLATE_OLD = /^[A-Z]{3}-?\d{4}$/;
const PLATE_MERCOSUL = /^[A-Z]{3}-?\d[A-Z]\d{2}$/;

export function isValidPlate(value: string | null | undefined): boolean {
  if (!value) return false;
  const v = String(value).toUpperCase().replace(/\s/g, "");
  return PLATE_OLD.test(v) || PLATE_MERCOSUL.test(v);
}

// ─────────────────────────────────────────────────────────────────────
// Título de eleitor — 12 dígitos, sem separador padrão (mantém limpo)
// ─────────────────────────────────────────────────────────────────────
export function maskVoter(value: string | null | undefined): string {
  return digitsOnly(value).slice(0, 12);
}

export function isValidVoter(value: string | null | undefined): boolean {
  return digitsOnly(value).length === 12;
}

// ─────────────────────────────────────────────────────────────────────
// Normalizadores p/ persistência server-side
// ─────────────────────────────────────────────────────────────────────

/** Converte string vazia/whitespace para null. Tudo o resto: trim e mantém. */
export function nullIfEmpty(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v !== "string") return String(v);
  const t = v.trim();
  return t === "" ? null : t;
}

/** Trim + colapso de espaços duplicados internos. */
export function cleanSpaces(v: string | null | undefined): string {
  if (!v) return "";
  return String(v).trim().replace(/\s+/g, " ");
}

/** Normaliza um nome próprio: limpa espaços + capitalização Title Case com partículas pt-BR em minúsculas. */
const NAME_LOWERCASE = new Set([
  "da","de","do","das","dos","e","di","du","das","del","della","della","von","van","la",
]);
export function normalizeName(v: string | null | undefined): string {
  const cleaned = cleanSpaces(v).toLocaleLowerCase("pt-BR");
  if (!cleaned) return "";
  return cleaned
    .split(" ")
    .map((part, idx) => {
      if (idx > 0 && NAME_LOWERCASE.has(part)) return part;
      return part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1);
    })
    .join(" ");
}

export function hasAtLeastTwoWords(v: string | null | undefined): boolean {
  if (!v) return false;
  return cleanSpaces(v).split(" ").filter((w) => w.length >= 2).length >= 2;
}

// ─────────────────────────────────────────────────────────────────────
// Dispatcher
// ─────────────────────────────────────────────────────────────────────
export function applyMask(kind: MaskKind, value: string | null | undefined): string {
  switch (kind) {
    case "phone": return maskPhone(value);
    case "cpf": return maskCPF(value);
    case "cep": return maskCEP(value);
    case "uf": return maskUF(value);
    case "plate": return maskPlate(value);
    case "voter": return maskVoter(value);
    case "rg": return lettersDigits(value).toUpperCase().slice(0, 14);
  }
}
