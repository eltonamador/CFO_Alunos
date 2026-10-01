import { z } from "zod";
import { calendarDay } from "./rotation";

// Diário de ocorrências: registro pessoal e extraoficial. Nada aqui pontua, avalia ou conta horas.
export const DIARY_NOTICE =
  "Registro pessoal e extraoficial. Não faz parte do PPC, não conta horas e não é avaliação.";
export const COMPETENCE_NOTICE =
  "Atue sempre dentro da sua competência e sob orientação da guarnição.";
export const PRIVACY_HINT = "Evite nome, endereço ou dados de saúde da vítima.";

export const OCCURRENCE_TYPES = [
  { code: "trem_socorro", label: "Trem de socorro" },
  { code: "aph", label: "APH (atendimento pré-hospitalar)" },
  { code: "acidente_transito", label: "Acidente de trânsito" },
  { code: "incendio_residencial", label: "Incêndio em residência" },
  { code: "incendio_urbano", label: "Incêndio urbano" },
  { code: "incendio_vegetacao", label: "Incêndio em vegetação" },
  { code: "incendio_veiculo", label: "Incêndio em veículo" },
  { code: "salvamento_veicular", label: "Salvamento veicular" },
  { code: "salvamento_altura", label: "Salvamento em altura" },
  { code: "salvamento_confinado", label: "Salvamento em espaço confinado" },
  { code: "salvamento_inundacao", label: "Salvamento em inundação ou enchente" },
  { code: "salvamento_aquatico", label: "Salvamento aquático" },
  { code: "busca_salvamento", label: "Busca e salvamento" },
  { code: "animal", label: "Captura ou resgate de animal" },
  { code: "abelhas_marimbondos", label: "Abelhas ou marimbondos" },
  { code: "arvore", label: "Corte ou queda de árvore" },
  { code: "produtos_perigosos", label: "Gás ou produtos perigosos" },
  { code: "prevencao", label: "Prevenção ou evento" },
  { code: "apoio", label: "Apoio a outros órgãos" },
  { code: "outro", label: "Outro" },
] as const;
export const SEVERITIES = [
  { value: "leve", label: "Leve" },
  { value: "moderada", label: "Moderada" },
  { value: "grave", label: "Grave" },
] as const;
export const PARTICIPATIONS = [
  { value: "observei", label: "Observei" },
  { value: "apoiei", label: "Apoiei" },
  { value: "atuei", label: "Atuei" },
] as const;
export const DIARY_VEHICLES = ["USB", "AR", "ABT", "AT"] as const;
export const REACTIONS = [
  { kind: "aplauso", emoji: "👏", label: "Aplaudir" },
  { kind: "aprendi", emoji: "💡", label: "Aprendi com isso" },
] as const;

export type DiaryStatus = "rascunho" | "pessoal" | "compartilhado";
export type ReactionKind = (typeof REACTIONS)[number]["kind"];
export const REACTION_KINDS = REACTIONS.map((r) => r.kind) as [ReactionKind, ...ReactionKind[]];

export const DIARY_ENTRY_COLUMNS =
  "id,student_id,assignment_id,status,occurred_on,summary,occurrence_type,other_type,severity," +
  "occurrence_types,participation,vehicle,vehicles,perception,description,companion_ids,protocol_number,shared_at," +
  "featured_at,hidden_at,hidden_reason,created_at,updated_at";

export type DiaryEntry = {
  id: string;
  student_id: string;
  assignment_id: string | null;
  status: DiaryStatus;
  occurred_on: string;
  summary: string;
  occurrence_type: string | null;
  occurrence_types: string[];
  other_type: string | null;
  severity: string | null;
  participation: string | null;
  vehicle: string | null;
  vehicles: string[];
  perception: string | null;
  description: string | null;
  companion_ids: string[];
  protocol_number: string | null;
  shared_at: string | null;
  featured_at: string | null;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string;
  updated_at: string;
};

export type DiaryShift = {
  assignment_id: string;
  activity_code: string;
  activity_name: string;
  site_name: string;
  starts_at: string;
  ends_at: string;
};

// Campos opcionais nunca bloqueiam: vazio vira nulo e excesso é cortado no limite do banco.
const text = (max: number) =>
  z
    .string()
    .nullish()
    .transform((value) => value?.trim().slice(0, max) || null);
const choice = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .nullish()
    .transform((value) =>
      (values as readonly string[]).includes(value ?? "") ? (value as T[number]) : null,
    );

const diaryInput = z.object({
  id: z.string().uuid().nullish(),
  intent: z.enum(["rascunho", "pessoal", "compartilhado"]),
  assignmentId: z
    .string()
    .nullish()
    .transform((value) => (value && z.string().uuid().safeParse(value).success ? value : null)),
  occurredOn: z
    .string()
    .nullish()
    .transform((value) =>
      value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
        ? value
        : null,
    ),
  summary: z
    .string()
    .nullish()
    .transform((value) => value?.trim().slice(0, 200) ?? ""),
  occurrenceType: choice(OCCURRENCE_TYPES.map((t) => t.code) as [string, ...string[]]),
  occurrenceTypes: z.array(z.string()).nullish(),
  otherType: text(80),
  severity: choice(SEVERITIES.map((s) => s.value) as [string, ...string[]]),
  participation: choice(PARTICIPATIONS.map((p) => p.value) as [string, ...string[]]),
  vehicle: text(60),
  vehicles: z.array(z.string()).nullish(),
  perception: text(2000),
  description: text(4000),
  companionIds: z
    .array(z.string())
    .nullish()
    .transform((ids) =>
      [...new Set(ids ?? [])].filter((id) => z.string().uuid().safeParse(id).success).slice(0, 30),
    ),
  protocolNumber: text(40),
});

export type DiaryEntryRow = {
  status: DiaryStatus;
  assignment_id: string | null;
  occurred_on?: string;
  summary: string;
  occurrence_type: string | null;
  occurrence_types: string[];
  other_type: string | null;
  severity: string | null;
  participation: string | null;
  vehicle: string | null;
  vehicles: string[];
  perception: string | null;
  description: string | null;
  companion_ids: string[];
  protocol_number: string | null;
};

/** Só "o que aconteceu" é exigido, e apenas ao salvar fora do rascunho. */
export function prepareDiaryEntry(
  input: unknown,
): { ok: true; id: string | null; row: DiaryEntryRow } | { ok: false; error: string } {
  const parsed = diaryInput.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "Não foi possível ler o registro. Tente de novo." };
  const value = parsed.data;
  const allowedTypes = new Set<string>(OCCURRENCE_TYPES.map((item) => item.code));
  const occurrenceTypes = [
    ...new Set(value.occurrenceTypes ?? (value.occurrenceType ? [value.occurrenceType] : [])),
  ]
    .filter((type) => allowedTypes.has(type))
    .slice(0, 6);
  const vehicles = [
    ...new Set(
      (value.vehicles ?? (value.vehicle ? [value.vehicle] : []))
        .map((vehicle) => vehicle.trim().slice(0, 60))
        .filter(Boolean),
    ),
  ].slice(0, 6);
  if (value.intent !== "rascunho" && value.summary.length < 3) {
    return { ok: false, error: "Conte em uma frase o que aconteceu." };
  }
  return {
    ok: true,
    id: value.id ?? null,
    row: {
      status: value.intent,
      assignment_id: value.assignmentId,
      ...(value.occurredOn ? { occurred_on: value.occurredOn } : {}),
      summary: value.summary,
      occurrence_type: occurrenceTypes[0] ?? null,
      occurrence_types: occurrenceTypes,
      other_type: occurrenceTypes.includes("outro") ? value.otherType : null,
      severity: value.severity,
      participation: value.participation,
      vehicle: vehicles[0] ?? null,
      vehicles,
      perception: value.perception,
      description: value.description,
      companion_ids: value.companionIds,
      protocol_number: value.protocolNumber,
    },
  };
}

export type DiaryFormValues = {
  assignmentId: string;
  occurredOn: string;
  summary: string;
  occurrenceType: string;
  occurrenceTypes: string[];
  otherType: string;
  severity: string;
  participation: string;
  vehicle: string;
  vehicles: string[];
  perception: string;
  description: string;
  companionIds: string[];
  protocolNumber: string;
};

/** Novo registro já vem com plantão, data e viatura sugeridos; tudo pode ser trocado. */
export function newDiaryForm(shift: DiaryShift | null, now: number): DiaryFormValues {
  return {
    assignmentId: shift?.assignment_id ?? "",
    occurredOn: belemDay(shift ? shift.starts_at : now),
    summary: "",
    occurrenceType: "",
    occurrenceTypes: [],
    otherType: "",
    severity: "",
    participation: "",
    vehicle: shiftVehicle(shift ?? undefined),
    vehicles: shiftVehicle(shift ?? undefined) ? [shiftVehicle(shift ?? undefined)] : [],
    perception: "",
    description: "",
    companionIds: [],
    protocolNumber: "",
  };
}

export function diaryFormFromEntry(entry: DiaryEntry): DiaryFormValues {
  return {
    assignmentId: entry.assignment_id ?? "",
    occurredOn: entry.occurred_on,
    summary: entry.summary,
    occurrenceType: entry.occurrence_type ?? "",
    occurrenceTypes: entry.occurrence_types?.length
      ? entry.occurrence_types
      : entry.occurrence_type
        ? [entry.occurrence_type]
        : [],
    otherType: entry.other_type ?? "",
    severity: entry.severity ?? "",
    participation: entry.participation ?? "",
    vehicle: entry.vehicle ?? "",
    vehicles: entry.vehicles?.length ? entry.vehicles : entry.vehicle ? [entry.vehicle] : [],
    perception: entry.perception ?? "",
    description: entry.description ?? "",
    companionIds: entry.companion_ids,
    protocolNumber: entry.protocol_number ?? "",
  };
}

export function occurrenceTypeLabel(code: string | null, other?: string | null): string | null {
  if (!code) return null;
  if (code === "outro" && other) return other;
  return OCCURRENCE_TYPES.find((t) => t.code === code)?.label ?? code;
}

export function entryTypes(
  entry: Pick<DiaryEntry, "occurrence_type" | "occurrence_types">,
): string[] {
  return entry.occurrence_types?.length
    ? entry.occurrence_types
    : entry.occurrence_type
      ? [entry.occurrence_type]
      : [];
}

export function entryVehicles(entry: Pick<DiaryEntry, "vehicle" | "vehicles">): string[] {
  return entry.vehicles?.length ? entry.vehicles : entry.vehicle ? [entry.vehicle] : [];
}

export function optionLabel(
  options: readonly { value: string; label: string }[],
  value: string | null,
): string | null {
  return options.find((option) => option.value === value)?.label ?? null;
}

export function belemDay(instant: string | number): string {
  return calendarDay(instant, "America/Belem");
}

export function formatDiaryDate(day: string): string {
  const [year, month, date] = day.split("-");
  return `${date}/${month}/${year}`;
}

export function shiftLabel(shift: DiaryShift): string {
  const when = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(shift.starts_at));
  return `${when.replace(",", "")} · ${shift.activity_name} · ${shift.site_name}`;
}

/** Viatura sugerida pelo tipo de vaga do plantão; na praia não há viatura. */
export function shiftVehicle(shift: DiaryShift | undefined): string {
  if (shift?.activity_code === "usb") return "USB";
  if (shift?.activity_code === "ar") return "AR";
  return "";
}

/** Plantões já iniciados, do mais recente para o mais antigo. */
export function startedShifts(shifts: DiaryShift[], now: number): DiaryShift[] {
  return shifts
    .filter((shift) => Date.parse(shift.starts_at) <= now)
    .sort((a, b) => Date.parse(b.starts_at) - Date.parse(a.starts_at));
}

/** Sugere o último plantão iniciado nos últimos sete dias; o cadete pode trocar ou limpar. */
export function suggestedShift(shifts: DiaryShift[], now: number): DiaryShift | null {
  const latest = startedShifts(shifts, now)[0];
  return latest && now - Date.parse(latest.starts_at) <= 7 * 86_400_000 ? latest : null;
}

export type ReactionRow = { entry_id: string; user_id: string; kind: string };
export type ReactionSummary = {
  counts: Record<ReactionKind, number>;
  mine: ReactionKind[];
  total: number;
};

export function summarizeReactions(
  rows: ReactionRow[],
  userId: string,
): Map<string, ReactionSummary> {
  const byEntry = new Map<string, ReactionSummary>();
  for (const row of rows) {
    if (!(REACTION_KINDS as string[]).includes(row.kind)) continue;
    const kind = row.kind as ReactionKind;
    const summary = byEntry.get(row.entry_id) ?? {
      counts: { aplauso: 0, aprendi: 0 },
      mine: [],
      total: 0,
    };
    summary.counts[kind] += 1;
    summary.total += 1;
    if (row.user_id === userId) summary.mine.push(kind);
    byEntry.set(row.entry_id, summary);
  }
  return byEntry;
}

type CountedEntry = Pick<DiaryEntry, "id" | "status" | "occurrence_type"> &
  Partial<Pick<DiaryEntry, "occurrence_types">>;

export function diaryStats(entries: CountedEntry[]) {
  const saved = entries.filter((entry) => entry.status !== "rascunho");
  return {
    saved: saved.length,
    drafts: entries.length - saved.length,
    shared: saved.filter((entry) => entry.status === "compartilhado").length,
    types: new Set(
      saved.flatMap((entry) =>
        entry.occurrence_types?.length
          ? entry.occurrence_types
          : entry.occurrence_type
            ? [entry.occurrence_type]
            : [],
      ),
    ).size,
  };
}

export type DiaryBadge = { code: string; label: string; hint: string; earned: boolean };

// Cada marco usa uma categoria explícita; tipos genéricos antigos não presumem um resgate específico.
const FIRST_OCCURRENCE_BADGES = [
  { type: "aph", code: "primeiro_aph", label: "Primeiro APH" },
  { type: "trem_socorro", code: "primeiro_trem_socorro", label: "Meu primeiro trem de socorro" },
  {
    type: "incendio_residencial",
    code: "primeiro_incendio_residencial",
    label: "Meu primeiro incêndio em residência",
  },
  {
    type: "salvamento_veicular",
    code: "primeiro_salvamento_veicular",
    label: "Meu primeiro salvamento veicular",
  },
  {
    type: "salvamento_aquatico",
    code: "primeiro_salvamento_aquatico",
    label: "Primeiro salvamento aquático",
  },
  {
    type: "salvamento_altura",
    code: "primeiro_salvamento_altura",
    label: "Meu primeiro salvamento em altura",
  },
  {
    type: "salvamento_confinado",
    code: "primeiro_salvamento_confinado",
    label: "Meu primeiro salvamento em espaço confinado",
  },
  {
    type: "salvamento_inundacao",
    code: "primeiro_salvamento_inundacao",
    label: "Meu primeiro salvamento em inundação",
  },
  {
    type: "busca_salvamento",
    code: "primeira_busca_salvamento",
    label: "Minha primeira busca e salvamento",
  },
  { type: "animal", code: "primeiro_resgate_animal", label: "Meu primeiro resgate de animal" },
  {
    type: "incendio_vegetacao",
    code: "primeiro_incendio_vegetacao",
    label: "Meu primeiro incêndio em vegetação",
  },
  {
    type: "incendio_veiculo",
    code: "primeiro_incendio_veiculo",
    label: "Meu primeiro incêndio em veículo",
  },
] satisfies { type: (typeof OCCURRENCE_TYPES)[number]["code"]; code: string; label: string }[];

/** Marcos simbólicos, sem pontos: servem só de incentivo. */
export function diaryBadges(
  entries: CountedEntry[],
  reactionTotals: ReadonlyMap<string, number> = new Map(),
): DiaryBadge[] {
  const saved = entries.filter((entry) => entry.status !== "rascunho");
  const types = new Set(
    saved.flatMap((entry) =>
      entry.occurrence_types?.length
        ? entry.occurrence_types
        : entry.occurrence_type
          ? [entry.occurrence_type]
          : [],
    ),
  );
  return [
    {
      code: "primeiro_registro",
      label: "Primeiro registro",
      hint: "Salve seu primeiro relato.",
      earned: saved.length >= 1,
    },
    ...FIRST_OCCURRENCE_BADGES.map((badge) => ({
      code: badge.code,
      label: badge.label,
      hint: `Salve um relato com o tipo “${occurrenceTypeLabel(badge.type)}”.`,
      earned: types.has(badge.type),
    })),
    {
      code: "cinco_tipos",
      label: "5 tipos diferentes",
      hint: `${Math.min(types.size, 5)} de 5 tipos vividos.`,
      earned: types.size >= 5,
    },
    {
      code: "dez_registros",
      label: "10 registros",
      hint: `${Math.min(saved.length, 10)} de 10 registros.`,
      earned: saved.length >= 10,
    },
    {
      code: "relato_inspirador",
      label: "Relato inspirador",
      hint: "Um relato seu com 5 reações dos colegas.",
      earned: saved.some((entry) => (reactionTotals.get(entry.id) ?? 0) >= 5),
    },
  ];
}

export type BoardOrder = "registros" | "variedade" | "reacoes";
export const BOARD_ORDERS: { value: BoardOrder; label: string }[] = [
  { value: "registros", label: "Relatos compartilhados" },
  { value: "variedade", label: "Tipos diferentes" },
  { value: "reacoes", label: "Reações recebidas" },
];
export type BoardRow = {
  studentId: string;
  shared: number;
  types: number;
  reactions: number;
  medal: 1 | 2 | 3 | null;
};

/** Primeiro instante do mês corrente em Belém (UTC-3 fixo). */
export function monthStart(now: number): string {
  return `${belemDay(now).slice(0, 7)}-01T00:00:00-03:00`;
}

/**
 * Quadro simbólico da turma: conta só relatos compartilhados e visíveis no mural.
 * Quem não compartilhou não aparece; empates dividem a mesma medalha.
 */
export function diaryBoard(
  entries: (Pick<DiaryEntry, "id" | "student_id" | "occurrence_type"> &
    Partial<Pick<DiaryEntry, "occurrence_types">>)[],
  reactionTotals: ReadonlyMap<string, number>,
  order: BoardOrder,
  nameOf: (studentId: string) => string = (studentId) => studentId,
): BoardRow[] {
  const byStudent = new Map<string, { shared: number; types: Set<string>; reactions: number }>();
  for (const entry of entries) {
    const row = byStudent.get(entry.student_id) ?? { shared: 0, types: new Set(), reactions: 0 };
    row.shared += 1;
    for (const type of entry.occurrence_types?.length
      ? entry.occurrence_types
      : entry.occurrence_type
        ? [entry.occurrence_type]
        : [])
      row.types.add(type);
    row.reactions += reactionTotals.get(entry.id) ?? 0;
    byStudent.set(entry.student_id, row);
  }
  const rows = [...byStudent].map(([studentId, row]) => ({
    studentId,
    shared: row.shared,
    types: row.types.size,
    reactions: row.reactions,
  }));
  const metric = (row: (typeof rows)[number]) =>
    order === "variedade" ? row.types : order === "reacoes" ? row.reactions : row.shared;
  rows.sort(
    (a, b) =>
      metric(b) - metric(a) ||
      b.shared - a.shared ||
      b.types - a.types ||
      b.reactions - a.reactions ||
      nameOf(a.studentId).localeCompare(nameOf(b.studentId), "pt-BR"),
  );
  const podium = [...new Set(rows.map(metric))].filter((value) => value > 0).slice(0, 3);
  return rows.map((row) => {
    const place = podium.indexOf(metric(row));
    return { ...row, medal: place < 0 ? null : ((place + 1) as 1 | 2 | 3) };
  });
}

/** Destaques do mês: escolhidos pela Coordenação e os relatos com mais reações. */
export function monthHighlights<T extends Pick<DiaryEntry, "id" | "featured_at" | "shared_at">>(
  entries: T[],
  reactionTotals: ReadonlyMap<string, number>,
  since: string,
) {
  const start = Date.parse(since);
  const reactions = (entry: T) => reactionTotals.get(entry.id) ?? 0;
  return {
    featured: entries
      .filter((entry) => entry.featured_at && Date.parse(entry.featured_at) >= start)
      .sort((a, b) => Date.parse(b.featured_at!) - Date.parse(a.featured_at!)),
    appreciated: entries
      .filter(
        (entry) => entry.shared_at && Date.parse(entry.shared_at) >= start && reactions(entry) > 0,
      )
      .sort(
        (a, b) =>
          reactions(b) - reactions(a) || Date.parse(b.shared_at!) - Date.parse(a.shared_at!),
      )
      .slice(0, 3),
  };
}
