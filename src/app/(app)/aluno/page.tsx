import { requireRole } from "@/components/app/RoleGuard";
import { createServerClientUntyped } from "@/lib/supabase/untyped";

export const metadata = { title: "Portal do Aluno" };

// Tipos obrigatórios de documentos (excluindo "outro", que é opcional)
const REQUIRED_DOC_TYPES = [
  "rg_cpf",
  "cnh",
  "comprovante_residencia",
  "foto_3x4",
  "declaracao_medica",
] as const;

const REQUIRED_DOC_LABELS: Record<string, string> = {
  rg_cpf: "RG / CPF",
  cnh: "CNH",
  comprovante_residencia: "Comprovante de Residência",
  foto_3x4: "Foto 3×4",
  declaracao_medica: "Declaração Médica",
};

// Statuses que contam como "item providenciado" no progresso
const DONE_STATUSES = new Set(["ok", "comprado", "nao_se_aplica"]);

export default async function AlunoHome() {
  const session = await requireRole("aluno");

  type ProgressItem = { label: string; value: number };
  type Pendencia = { label: string };

  let progress: ProgressItem[] = [
    { label: "Cadastro", value: 0 },
    { label: "Documentos", value: 0 },
    { label: "Materiais (quarentena)", value: 0 },
    { label: "Materiais (geral)", value: 0 },
  ];
  let pendencias: Pendencia[] = [];

  if (session.studentId) {
    const supabase = createServerClientUntyped();

    // Busca paralela de todos os dados necessários
    const [studentRes, contactRes, addressRes, healthRes, docsRes, equipStatusRes, equipReqsRes] =
      await Promise.all([
        supabase
          .from("students")
          .select("cpf,rg,birth_date,marital_status,mother_name")
          .eq("id", session.studentId)
          .maybeSingle(),
        supabase
          .from("student_contacts")
          .select("whatsapp")
          .eq("student_id", session.studentId)
          .maybeSingle(),
        supabase
          .from("student_addresses")
          .select("street,city,zip")
          .eq("student_id", session.studentId)
          .maybeSingle(),
        supabase
          .from("health_restrictions")
          .select("blood_type,rh_factor")
          .eq("student_id", session.studentId)
          .maybeSingle(),
        supabase
          .from("documents")
          .select("doc_type")
          .eq("student_id", session.studentId)
          .neq("status", "recusado"),
        supabase
          .from("student_equipment_status")
          .select("requirement_id,status")
          .eq("student_id", session.studentId),
        supabase
          .from("equipment_requirements")
          .select("id,phase,mandatory")
          .eq("active", true),
      ]);

    // ── Cadastro % ──────────────────────────────────────────────────────
    const s = studentRes.data as Record<string, unknown> | null;
    const c = contactRes.data as Record<string, unknown> | null;
    const a = addressRes.data as Record<string, unknown> | null;
    const h = healthRes.data as Record<string, unknown> | null;

    const cadastroFields = [
      s?.cpf,
      s?.rg,
      s?.birth_date,
      s?.marital_status,
      s?.mother_name,
      c?.whatsapp,
      a?.street,
      a?.city,
      a?.zip,
      h?.blood_type,
    ];
    const cadastroFilled = cadastroFields.filter(Boolean).length;
    const cadastroPct = Math.round((cadastroFilled / cadastroFields.length) * 100);

    // ── Documentos % ────────────────────────────────────────────────────
    const uploadedTypes = new Set(
      (docsRes.data ?? []).map((d: Record<string, unknown>) => d.doc_type as string),
    );
    const docsUploaded = REQUIRED_DOC_TYPES.filter((t) => uploadedTypes.has(t)).length;
    const docsPct = Math.round((docsUploaded / REQUIRED_DOC_TYPES.length) * 100);
    const missingDocs = REQUIRED_DOC_TYPES.filter((t) => !uploadedTypes.has(t));

    // ── Materiais % ─────────────────────────────────────────────────────
    const reqs = (equipReqsRes.data ?? []) as Array<{
      id: string;
      phase: string;
      mandatory: boolean;
    }>;
    const statusMap = new Map(
      (equipStatusRes.data ?? []).map((e: Record<string, unknown>) => [
        e.requirement_id as string,
        e.status as string,
      ]),
    );

    const quarentenaReqs = reqs.filter((r) => r.phase === "quarentena");
    const quarentenaDone = quarentenaReqs.filter((r) =>
      DONE_STATUSES.has(statusMap.get(r.id) ?? ""),
    ).length;
    const quarentenaPct =
      quarentenaReqs.length > 0
        ? Math.round((quarentenaDone / quarentenaReqs.length) * 100)
        : 0;

    const geralDone = reqs.filter((r) => DONE_STATUSES.has(statusMap.get(r.id) ?? "")).length;
    const geralPct = reqs.length > 0 ? Math.round((geralDone / reqs.length) * 100) : 0;

    // ── Pendências ──────────────────────────────────────────────────────
    const pendEquipamento = quarentenaReqs.filter(
      (r) => r.mandatory && !DONE_STATUSES.has(statusMap.get(r.id) ?? ""),
    ).length;

    progress = [
      { label: "Cadastro", value: cadastroPct },
      { label: "Documentos", value: docsPct },
      { label: "Materiais (quarentena)", value: quarentenaPct },
      { label: "Materiais (geral)", value: geralPct },
    ];

    pendencias = [
      ...missingDocs.map((t) => ({ label: `Documento: ${REQUIRED_DOC_LABELS[t] ?? t}` })),
      ...(pendEquipamento > 0
        ? [
            {
              label: `${pendEquipamento} item${pendEquipamento > 1 ? "s" : ""} de quarentena a providenciar`,
            },
          ]
        : []),
    ];
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="section-eyebrow">Portal do Aluno</p>
        <h1 className="text-2xl font-bold">{`Olá, ${session.fullName}`}</h1>
        {!session.studentId && (
          <p className="mt-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Sua conta ainda não está vinculada a um aluno. Procure a Coordenação.
          </p>
        )}
      </header>

      {/* Barras de progresso */}
      <section className="grid gap-3 sm:grid-cols-2">
        {progress.map((p) => (
          <div key={p.label} className="rounded-lg border bg-card p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">{p.label}</p>
              <p
                className={`text-sm tabular-nums font-semibold ${
                  p.value === 100 ? "text-green-600" : "text-muted-foreground"
                }`}
              >
                {p.value}%
              </p>
            </div>
            <div className="h-2 overflow-hidden rounded bg-muted">
              <div
                className={`h-full transition-all ${p.value === 100 ? "bg-green-500" : "bg-primary"}`}
                style={{ width: `${p.value}%` }}
              />
            </div>
          </div>
        ))}
      </section>

      {/* Pendências */}
      <section className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold">Pendências</h2>
        {pendencias.length === 0 ? (
          <p className="mt-2 text-sm font-medium text-green-600">
            ✔ Nenhuma pendência no momento.
          </p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {pendencias.map((p) => (
              <li key={p.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-orange-400" />
                {p.label}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
