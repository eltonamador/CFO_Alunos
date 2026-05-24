/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Auditoria dos formulários dos 30 alunos da turma CFO 2026.1.
 *
 * Modos:
 *   dry-run (default): só LÊ o banco. Reporta por aluno:
 *     - quais abas estão vazias
 *     - quais valores estão inválidos (telefone, CPF, CEP, UF, placa…)
 *     - quais pendências estão em aberto
 *     - cobertura geral por aba
 *
 *   --write (com --confirm-prod em Cloud): preenche APENAS campos vazios
 *     com dados plausíveis e variados. Nunca sobrescreve valor existente.
 *
 * Uso:
 *   pnpm tsx scripts/audit-students-forms.ts                 # dry-run
 *   pnpm tsx scripts/audit-students-forms.ts --write         # local
 *   pnpm tsx scripts/audit-students-forms.ts --write --confirm-prod  # Cloud
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  isValidPhone,
  isValidCEP,
  isValidUF,
  isValidPlate,
  maskPhone,
  maskCEP,
  maskUF,
  maskPlate,
  hasAtLeastTwoWords,
  normalizeName,
} from "../src/lib/masks";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const isProd = /\.supabase\.co/i.test(url);
const WRITE = process.argv.includes("--write");
const CONFIRM_PROD = process.argv.includes("--confirm-prod");

if (WRITE && isProd && !CONFIRM_PROD) {
  console.error(`\n🔴 BLOQUEIO: NEXT_PUBLIC_SUPABASE_URL aponta para PRODUÇÃO (${url})`);
  console.error("   Para escrever em Cloud, passe --confirm-prod explicitamente.\n");
  process.exit(2);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// ── Pools de dados plausíveis (só usados em --write para campos vazios) ──
const VEHICLES = [
  { type: "carro", brand_model: "Fiat Uno", plate: "ABC-1234" },
  { type: "carro", brand_model: "Volkswagen Gol", plate: "DEF-2345" },
  { type: "carro", brand_model: "Ford Ka", plate: "GHI-3A56" },
  { type: "moto", brand_model: "Honda CG 160", plate: "JKL-4B67" },
  { type: "moto", brand_model: "Yamaha Factor 125", plate: "MNO-5C78" },
  { type: "caminhonete", brand_model: "Toyota Hilux", plate: "PQR-6D89" },
];
const FAMILY_NAMES = [
  "Maria Silva", "João Pereira", "Ana Souza", "Carlos Lima", "Beatriz Costa",
  "Pedro Almeida", "Lúcia Fernandes", "Rafael Gomes", "Camila Santos", "Bruno Rocha",
];
const PHONES = [
  "(96) 98101-2233", "(96) 98202-3344", "(96) 99303-4455",
  "(96) 99404-5566", "(96) 99505-6677", "(96) 98606-7788",
];
const NEIGHBORHOODS = ["Centro", "Buritizal", "Jesus de Nazaré", "Trem", "Santa Rita"];
const CITIES = ["Macapá"];

// ── Coletor de resultados ──
type Issue = { aluno: string; aba: string; campo: string; problema: string };
const issues: Issue[] = [];
const filled: Issue[] = [];
const coverage: Record<string, { total: number; ok: number }> = {
  identificacao: { total: 0, ok: 0 },
  contato: { total: 0, ok: 0 },
  endereco: { total: 0, ok: 0 },
  emergencia: { total: 0, ok: 0 },
  saude: { total: 0, ok: 0 },
  logistica: { total: 0, ok: 0 },
  veiculo: { total: 0, ok: 0 },
};

function check(cond: boolean, aluno: string, aba: string, campo: string, problema: string) {
  coverage[aba].total += 1;
  if (cond) coverage[aba].ok += 1;
  else issues.push({ aluno, aba, campo, problema });
}

async function auditStudent(s: any, idx: number) {
  const label = `#${String(s.student_number ?? "?").padStart(2, "0")} ${s.war_name}`;

  // ── Identificação ──
  check(!!s.sex, label, "identificacao", "sex", "Sexo não informado");
  check(!!s.birth_date, label, "identificacao", "birth_date", "Data de nascimento não informada");
  check(!!s.full_name && hasAtLeastTwoWords(s.full_name), label, "identificacao", "full_name", "Nome completo curto");
  check(!s.naturality_state || isValidUF(s.naturality_state), label, "identificacao", "naturality_state", `UF inválida: ${s.naturality_state}`);

  // ── Contato ──
  const c = (await supabase.from("student_contacts").select("*").eq("student_id", s.id).maybeSingle()).data;
  check(!!c?.whatsapp, label, "contato", "whatsapp", "WhatsApp ausente");
  check(!c?.whatsapp || isValidPhone(c.whatsapp), label, "contato", "whatsapp", `Telefone inválido: ${c?.whatsapp}`);
  check(!c?.phone_secondary || isValidPhone(c.phone_secondary), label, "contato", "phone_secondary", `Tel secundário inválido: ${c?.phone_secondary}`);
  check(!c?.email_personal || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email_personal), label, "contato", "email_personal", "E-mail inválido");

  // ── Endereço ──
  const a = (await supabase.from("student_addresses").select("*").eq("student_id", s.id).maybeSingle()).data;
  check(!!a?.street, label, "endereco", "street", "Rua não informada");
  check(!!a?.city, label, "endereco", "city", "Cidade não informada");
  check(!a?.zip || isValidCEP(a.zip), label, "endereco", "zip", `CEP inválido: ${a?.zip}`);
  check(!a?.state || isValidUF(a.state), label, "endereco", "state", `UF inválida: ${a?.state}`);

  // ── Emergência ──
  const ec = (await supabase.from("emergency_contacts").select("*").eq("student_id", s.id)).data ?? [];
  const p1 = ec.find((x: any) => x.priority === 1);
  check(!!p1, label, "emergencia", "p1", "Contato de emergência primário ausente");
  if (p1) {
    check(hasAtLeastTwoWords(p1.full_name), label, "emergencia", "p1.full_name", "Nome incompleto");
    check(isValidPhone(p1.phone), label, "emergencia", "p1.phone", `Telefone inválido: ${p1.phone}`);
  }

  // ── Saúde ──
  const h = (await supabase.from("health_restrictions").select("*").eq("student_id", s.id).maybeSingle()).data;
  check(!!h, label, "saude", "registro", "Sem registro de saúde");
  if (h) {
    check(h.altura_cm == null || (h.altura_cm >= 100 && h.altura_cm <= 250), label, "saude", "altura_cm", `Altura fora do range: ${h.altura_cm}`);
    check(h.peso_kg == null || (h.peso_kg >= 30 && h.peso_kg <= 200), label, "saude", "peso_kg", `Peso fora do range: ${h.peso_kg}`);
    check(!(h.cirurgia_ocular === true && !h.cirurgia_ocular_obs), label, "saude", "cirurgia_ocular_obs", "Cirurgia ocular = Sim sem observação");
  }

  // ── Logística ──
  const l = (await supabase.from("student_logistics").select("*").eq("student_id", s.id).maybeSingle()).data;
  check(!!l, label, "logistica", "registro", "Sem registro de logística");

  // ── Veículo ──
  const v = (await supabase.from("vehicles").select("*").eq("student_id", s.id).maybeSingle()).data;
  check(!!v, label, "veiculo", "registro", "Sem registro de veículo/CNH");
  if (v?.has_vehicle === true) {
    check(!!v.vehicle_type, label, "veiculo", "vehicle_type", "Tipo de veículo ausente");
    check(!!v.vehicle_brand_model && v.vehicle_brand_model.length >= 3, label, "veiculo", "vehicle_brand_model", "Marca/modelo ausente");
    check(isValidPlate(v.plate), label, "veiculo", "plate", `Placa inválida: ${v.plate}`);
  }
  if (v?.has_cnh === true) {
    check(!!v.cnh_category, label, "veiculo", "cnh_category", "Categoria CNH ausente");
    check(!!v.cnh_valid_until, label, "veiculo", "cnh_valid_until", "Validade CNH ausente");
  }

  // ── Modo --write: preenche APENAS campos vazios ──
  if (WRITE) {
    // Contato
    if (!c?.whatsapp || !c?.email_personal) {
      const payload: any = { student_id: s.id };
      if (!c?.whatsapp) payload.whatsapp = maskPhone(PHONES[idx % PHONES.length]!);
      if (!c?.email_personal)
        payload.email_personal = `${s.war_name.toLowerCase().replace(/[^a-z]/g, "")}.${(s.student_number ?? idx).toString().padStart(2, "0")}@cbmap.local`;
      await supabase.from("student_contacts").upsert(payload);
      filled.push({ aluno: label, aba: "contato", campo: Object.keys(payload).filter(k=>k!=="student_id").join(","), problema: "preenchido" });
    }

    // Endereço
    if (!a?.street || !a?.city) {
      const payload: any = { student_id: s.id };
      if (!a?.street) payload.street = `Rua ${(idx + 1) * 7}, nº ${100 + idx}`;
      if (!a?.district) payload.district = NEIGHBORHOODS[idx % NEIGHBORHOODS.length]!;
      if (!a?.city) payload.city = CITIES[0]!;
      if (!a?.state) payload.state = maskUF("AP");
      if (!a?.zip) payload.zip = maskCEP(`6890${idx.toString().padStart(4, "0")}`.slice(0, 8));
      await supabase.from("student_addresses").upsert(payload);
      filled.push({ aluno: label, aba: "endereco", campo: Object.keys(payload).filter(k=>k!=="student_id").join(","), problema: "preenchido" });
    }

    // Emergência (só priority 1)
    if (!p1) {
      await supabase.from("emergency_contacts").upsert(
        {
          student_id: s.id,
          priority: 1,
          full_name: normalizeName(FAMILY_NAMES[idx % FAMILY_NAMES.length]!),
          relationship: idx % 2 === 0 ? "Mãe" : "Pai",
          phone: maskPhone(PHONES[(idx + 1) % PHONES.length]!),
        },
        { onConflict: "student_id,priority" },
      );
      filled.push({ aluno: label, aba: "emergencia", campo: "p1", problema: "preenchido" });
    }

    // Veículo (cenários: 1/3 tem veículo, 1/3 tem CNH, 1/3 nada)
    if (!v) {
      const mod = idx % 3;
      const veh = VEHICLES[idx % VEHICLES.length]!;
      const payload: any = { student_id: s.id };
      if (mod === 0) {
        payload.has_vehicle = true;
        payload.vehicle_type = veh.type;
        payload.vehicle_brand_model = veh.brand_model;
        payload.plate = maskPlate(veh.plate);
        payload.has_cnh = true;
        payload.cnh_category = "B";
        payload.cnh_valid_until = "2030-12-31";
      } else if (mod === 1) {
        payload.has_vehicle = false;
        payload.has_cnh = true;
        payload.cnh_category = "AB";
        payload.cnh_valid_until = "2029-06-30";
      } else {
        payload.has_vehicle = false;
        payload.has_cnh = false;
      }
      await supabase.from("vehicles").upsert(payload);
      filled.push({ aluno: label, aba: "veiculo", campo: "registro", problema: "criado" });
    }

    // Logística
    if (!l) {
      await supabase.from("student_logistics").upsert({
        student_id: s.id,
        has_fixed_residence_macapa: idx % 2 === 0,
        has_family_in_ap: idx % 3 !== 0,
      });
      filled.push({ aluno: label, aba: "logistica", campo: "registro", problema: "criado" });
    }
  }
}

async function main() {
  console.log("\n═════════════════════════════════════════════════════════════");
  console.log(`  AUDIT — Formulários dos alunos · ${WRITE ? "MODO ESCRITA" : "DRY-RUN"}`);
  console.log(`  Supabase: ${url}`);
  console.log("═════════════════════════════════════════════════════════════\n");

  const { data: students, error } = await supabase
    .from("students")
    .select("*")
    .is("deleted_at", null)
    .order("student_number");

  if (error || !students) {
    console.error("Falha ao listar alunos:", error?.message);
    process.exit(1);
  }
  console.log(`Alunos encontrados: ${students.length}`);

  // Pendências em aberto
  const { data: pendings } = await supabase
    .from("pending_changes")
    .select("id, student_id, context, status, created_at")
    .eq("status", "pendente");

  let i = 0;
  for (const s of students) {
    await auditStudent(s, i);
    i++;
  }

  // ── Relatório ──
  console.log("\n── COBERTURA POR ABA (campos válidos / esperados) ──");
  for (const [aba, c] of Object.entries(coverage)) {
    const pct = c.total === 0 ? 0 : Math.round((c.ok * 100) / c.total);
    const bar = "█".repeat(Math.floor(pct / 5)).padEnd(20, "░");
    console.log(`  ${aba.padEnd(14)} ${bar} ${pct.toString().padStart(3)}%   (${c.ok}/${c.total})`);
  }

  console.log(`\n── PENDÊNCIAS EM ABERTO: ${pendings?.length ?? 0} ──`);
  for (const p of pendings ?? []) {
    console.log(`  · ${p.context} (student=${p.student_id.slice(0, 8)}…) criada ${new Date(p.created_at).toLocaleDateString("pt-BR")}`);
  }

  console.log(`\n── PROBLEMAS DETECTADOS: ${issues.length} ──`);
  const byAba = issues.reduce<Record<string, number>>((acc, it) => {
    acc[it.aba] = (acc[it.aba] ?? 0) + 1;
    return acc;
  }, {});
  for (const [aba, n] of Object.entries(byAba)) console.log(`  ${aba.padEnd(14)} ${n} problema(s)`);

  // Primeiros 15 problemas para inspeção
  console.log("\n  Primeiros 15 problemas:");
  for (const it of issues.slice(0, 15)) {
    console.log(`    [${it.aba}/${it.campo}] ${it.aluno} → ${it.problema}`);
  }

  if (WRITE) {
    console.log(`\n── CAMPOS PREENCHIDOS NESTA EXECUÇÃO: ${filled.length} ──`);
    for (const f of filled.slice(0, 30)) {
      console.log(`  + ${f.aluno} · ${f.aba}: ${f.campo}`);
    }
    if (filled.length > 30) console.log(`  ... e mais ${filled.length - 30}.`);
  } else {
    console.log("\nℹ️  DRY-RUN — nada foi gravado. Use --write para preencher campos vazios.");
  }

  console.log("\n═════════════════════════════════════════════════════════════\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
