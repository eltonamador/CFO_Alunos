/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Importador seguro do PDF "Dados T1 CFO.pdf" para o banco CFO_Alunos.
 *
 * Modos:
 *   dry-run (default): só LÊ o banco e relata o que faria. Não escreve nada.
 *   --apply: aplica gravações.
 *   --apply --confirm-prod: necessário para escrever em ambiente Cloud (.supabase.co).
 *
 * Regras (ver mapping.md):
 *  - Match por full_name normalizado (1 hit = confiança alta; 0 ou 2+ = ignora).
 *  - Só preenche campos NULL/vazios.
 *  - Nunca sobrescreve; divergências apenas são registradas.
 *  - Idempotente.
 *
 * Saídas (gitignored):
 *  - scripts/import-t1-cfo/out/relatorio.json
 *  - scripts/import-t1-cfo/out/divergencias.json
 *
 * Uso:
 *   pnpm tsx scripts/import-t1-cfo/import-pdf.ts                          # dry-run
 *   pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid>        # dry-run com classe
 *   pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid> --apply
 *   pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid> --apply --confirm-prod
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";

config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !KEY) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
function argValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const APPLY = args.has("--apply");
const CONFIRM_PROD = args.has("--confirm-prod");
const CLASS_ID = argValue("--class-id");
const isProd = /\.supabase\.co/i.test(URL);

if (APPLY && isProd && !CONFIRM_PROD) {
  console.error(`\nBLOQUEIO: NEXT_PUBLIC_SUPABASE_URL aponta para Cloud (${URL}).`);
  console.error("Para gravar em Cloud, passe --confirm-prod explicitamente.\n");
  process.exit(2);
}

const sb = createClient(URL, KEY, { auth: { persistSession: false } });

// Resolvido a partir do cwd (sempre rodar a partir da raiz do projeto, como os
// outros scripts em scripts/*.ts).
const HERE = path.join(process.cwd(), "scripts", "import-t1-cfo");
const DATA_PATH = path.join(HERE, "data", "t1-cfo-pdf-extract.json");
const OUT_DIR = path.join(HERE, "out");
fs.mkdirSync(OUT_DIR, { recursive: true });

// ───────────────────────────────────────────── helpers
function strip(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}
function digits(s: string | null | undefined): string {
  return (s ?? "").replace(/\D+/g, "");
}
function normPhone(s: string | null | undefined): string {
  let d = digits(s);
  if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  return d;
}
function fmtPhone(d: string | null | undefined): string | null {
  if (!d) return null;
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return d;
}
function isEmpty(v: any): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}
function eqLoose(a: any, b: any): boolean {
  if (a === b) return true;
  if (isEmpty(a) && isEmpty(b)) return true;
  if (typeof a === "string" && typeof b === "string") return strip(a) === strip(b);
  return false;
}

// ───────────────────────────────────────────── tipos
type PdfRow = {
  numero_pdf: number;
  sex: string | null;
  full_name: string;
  war_name: string | null;
  blood_type: string | null;
  rh_factor: string | null;
  contact_phone_digits: string | null;
  contact_phone_formatted: string | null;
  profession_raw: string | null;
  address_raw: string | null;
  emergency_1_raw: string | null;
  emergency_1: any;
  emergency_2_raw: string | null;
  emergency_2: any;
  altura_cm: number | null;
  birth_date: string | null;
  allergies: string | null;
  medications: string | null;
  phobias: string | null;
  is_adventista: boolean | null;
};

type FieldAction =
  | { kind: "set"; table: string; field: string; from: any; to: any }
  | { kind: "skip_already_set"; table: string; field: string; current: any }
  | { kind: "match_ok"; table: string; field: string; value: any }
  | { kind: "divergence"; table: string; field: string; current: any; pdf: any }
  | { kind: "no_value_in_pdf"; table: string; field: string };

type RowReport = {
  numero_pdf: number;
  pdf_full_name: string;
  match_status: "not_found" | "ambiguous" | "matched";
  matched_student_id?: string;
  matched_student_number?: number | null;
  matched_war_name?: string;
  confidence: "alta" | "baixa";
  actions: FieldAction[];
  errors: string[];
};

// ───────────────────────────────────────────── main
async function main() {
  const raw = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));
  const pdfRows: PdfRow[] = raw.rows;
  console.log(`\n=== IMPORT T1 CFO ===  modo=${APPLY ? "APLICAR" : "DRY-RUN"}  banco=${isProd ? "CLOUD" : "LOCAL"}`);
  console.log(`PDF: ${pdfRows.length} linhas`);

  // Listar classes/courses para guiar o operador
  const { data: classes, error: cErr } = await sb
    .from("classes")
    .select("id, name, course_id, courses(code, name, year)")
    .order("name");
  if (cErr) {
    console.error("Erro lendo classes:", cErr.message);
    process.exit(1);
  }
  console.log(`\nClasses disponíveis (${classes?.length ?? 0}):`);
  classes?.forEach((c: any) =>
    console.log(`  ${c.id}  ${c.courses?.code ?? "?"} ${c.courses?.year ?? "?"} — ${c.name}`),
  );

  if (!CLASS_ID) {
    console.log("\nSem --class-id. Use uma das classes acima e refaça (dry-run aceita).");
    process.exit(0);
  }

  const klass = classes?.find((c: any) => c.id === CLASS_ID);
  if (!klass) {
    console.error(`\nclass-id ${CLASS_ID} não existe.`);
    process.exit(1);
  }
  console.log(`\nUsando classe: ${(klass as any).courses?.code} — ${(klass as any).name} (${CLASS_ID})`);

  // Carrega todos os alunos da classe — sem deleted_at
  const { data: students, error: sErr } = await sb
    .from("students")
    .select(
      "id, student_number, full_name, war_name, sex, birth_date, pelotao, professional_experience, religion, has_religious_restriction, religious_restriction_notes",
    )
    .eq("class_id", CLASS_ID)
    .is("deleted_at", null);
  if (sErr) {
    console.error("Erro lendo students:", sErr.message);
    process.exit(1);
  }
  console.log(`Alunos na classe: ${students?.length ?? 0}`);

  // index por full_name normalizado
  const byName = new Map<string, any[]>();
  for (const s of students ?? []) {
    const k = strip(s.full_name);
    const arr = byName.get(k) ?? [];
    arr.push(s);
    byName.set(k, arr);
  }

  const reports: RowReport[] = [];
  const divergencias: any[] = [];
  const summary = {
    matched: 0,
    not_found: 0,
    ambiguous: 0,
    field_writes: 0,
    field_skips_already_set: 0,
    field_matches_ok: 0,
    field_divergences: 0,
  };

  for (const row of pdfRows) {
    const rep: RowReport = {
      numero_pdf: row.numero_pdf,
      pdf_full_name: row.full_name,
      match_status: "not_found",
      confidence: "baixa",
      actions: [],
      errors: [],
    };

    const key = strip(row.full_name);
    const hits = byName.get(key) ?? [];
    if (hits.length === 0) {
      rep.match_status = "not_found";
      summary.not_found++;
      reports.push(rep);
      continue;
    }
    if (hits.length > 1) {
      rep.match_status = "ambiguous";
      rep.errors.push(`múltiplos matches: ${hits.map((h) => h.id).join(", ")}`);
      summary.ambiguous++;
      reports.push(rep);
      continue;
    }
    const stu = hits[0];
    rep.match_status = "matched";
    rep.confidence = "alta";
    rep.matched_student_id = stu.id;
    rep.matched_student_number = stu.student_number;
    rep.matched_war_name = stu.war_name;
    summary.matched++;

    // Preparar subtables atuais (1 query por tabela; podia ser otimizado, mas 30 alunos)
    const [hc, sc, sa, e1, e2] = await Promise.all([
      sb.from("health_restrictions").select("*").eq("student_id", stu.id).maybeSingle(),
      sb.from("student_contacts").select("*").eq("student_id", stu.id).maybeSingle(),
      sb.from("student_addresses").select("*").eq("student_id", stu.id).maybeSingle(),
      sb.from("emergency_contacts").select("*").eq("student_id", stu.id).eq("priority", 1).maybeSingle(),
      sb.from("emergency_contacts").select("*").eq("student_id", stu.id).eq("priority", 2).maybeSingle(),
    ]);

    const studentUpdates: Record<string, any> = {};
    const healthUpdates: Record<string, any> = {};
    const contactUpdates: Record<string, any> = {};
    const addressUpdates: Record<string, any> = {};
    const emerg1Updates: Record<string, any> = {};
    const emerg2Updates: Record<string, any> = {};

    // students
    plan("students", "sex", stu.sex, row.sex);
    plan("students", "birth_date", stu.birth_date, row.birth_date);
    plan("students", "professional_experience", stu.professional_experience, row.profession_raw);
    if (row.is_adventista === true) {
      plan("students", "religion", stu.religion, "Adventista");
      plan("students", "has_religious_restriction", stu.has_religious_restriction, true);
    } else if (row.is_adventista === false) {
      // "Não" → nada a inferir; não tocamos religion (não consideramos "Não" como religion="Outra").
      rep.actions.push({ kind: "no_value_in_pdf", table: "students", field: "religion" });
      rep.actions.push({ kind: "no_value_in_pdf", table: "students", field: "has_religious_restriction" });
    }

    // health_restrictions
    const cur_h = hc.data ?? {};
    plan("health_restrictions", "blood_type", cur_h.blood_type, row.blood_type);
    plan("health_restrictions", "rh_factor", cur_h.rh_factor, row.rh_factor);
    plan("health_restrictions", "altura_cm", cur_h.altura_cm, row.altura_cm);
    plan("health_restrictions", "allergies", cur_h.allergies, row.allergies);
    plan("health_restrictions", "continuous_medication", cur_h.continuous_medication, row.medications);
    if (row.phobias) {
      plan("health_restrictions", "medical_notes", cur_h.medical_notes, `Fobias: ${row.phobias}`);
    } else {
      rep.actions.push({ kind: "no_value_in_pdf", table: "health_restrictions", field: "medical_notes (fobias)" });
    }

    // student_contacts
    const cur_c = sc.data ?? {};
    plan("student_contacts", "whatsapp", cur_c.whatsapp, fmtPhone(row.contact_phone_digits));

    // student_addresses
    const cur_a = sa.data ?? {};
    plan("student_addresses", "street", cur_a.street, row.address_raw);

    // emergency_contacts priority 1
    const cur_e1 = e1.data ?? {};
    const pdfE1 = row.emergency_1;
    if (pdfE1?.phone_digits) {
      plan("emergency_contacts:1", "phone", cur_e1.phone, fmtPhone(pdfE1.phone_digits));
      plan("emergency_contacts:1", "full_name", cur_e1.full_name, pdfE1.name_guess);
      plan("emergency_contacts:1", "relationship", cur_e1.relationship, pdfE1.relationship_guess);
      plan("emergency_contacts:1", "address", cur_e1.address, pdfE1.address_guess);
      plan("emergency_contacts:1", "notes", cur_e1.notes, pdfE1.raw);
    }

    const cur_e2 = e2.data ?? {};
    const pdfE2 = row.emergency_2;
    if (pdfE2?.phone_digits) {
      plan("emergency_contacts:2", "phone", cur_e2.phone, fmtPhone(pdfE2.phone_digits));
      plan("emergency_contacts:2", "full_name", cur_e2.full_name, pdfE2.name_guess);
      plan("emergency_contacts:2", "relationship", cur_e2.relationship, pdfE2.relationship_guess);
      plan("emergency_contacts:2", "address", cur_e2.address, pdfE2.address_guess);
      plan("emergency_contacts:2", "notes", cur_e2.notes, pdfE2.raw);
    }

    // Aplica gravações se autorizado
    if (APPLY) {
      if (Object.keys(studentUpdates).length > 0) {
        const { error } = await sb.from("students").update(studentUpdates).eq("id", stu.id);
        if (error) rep.errors.push(`students.update: ${error.message}`);
      }
      if (Object.keys(healthUpdates).length > 0) {
        const payload = { student_id: stu.id, ...healthUpdates };
        const { error } = await sb.from("health_restrictions").upsert(payload, { onConflict: "student_id" });
        if (error) rep.errors.push(`health_restrictions.upsert: ${error.message}`);
      }
      if (Object.keys(contactUpdates).length > 0) {
        const payload = { student_id: stu.id, ...contactUpdates };
        const { error } = await sb.from("student_contacts").upsert(payload, { onConflict: "student_id" });
        if (error) rep.errors.push(`student_contacts.upsert: ${error.message}`);
      }
      if (Object.keys(addressUpdates).length > 0) {
        const payload = { student_id: stu.id, ...addressUpdates };
        const { error } = await sb.from("student_addresses").upsert(payload, { onConflict: "student_id" });
        if (error) rep.errors.push(`student_addresses.upsert: ${error.message}`);
      }
      // Emergency 1 — INSERT se não existe; senão UPDATE só dos campos NULL planejados
      if (pdfE1?.phone_digits) {
        if (!cur_e1.student_id) {
          const { error } = await sb.from("emergency_contacts").insert({
            student_id: stu.id,
            priority: 1,
            full_name: pdfE1.name_guess ?? "(não informado)",
            relationship: pdfE1.relationship_guess,
            phone: fmtPhone(pdfE1.phone_digits) ?? "",
            address: pdfE1.address_guess,
            notes: pdfE1.raw,
          });
          if (error) rep.errors.push(`emergency_contacts.insert(p1): ${error.message}`);
        } else if (Object.keys(emerg1Updates).length > 0) {
          const { error } = await sb.from("emergency_contacts")
            .update(emerg1Updates)
            .eq("student_id", stu.id)
            .eq("priority", 1);
          if (error) rep.errors.push(`emergency_contacts.update(p1): ${error.message}`);
        }
      }
      // Emergency 2 — idem
      if (pdfE2?.phone_digits) {
        if (!cur_e2.student_id) {
          const { error } = await sb.from("emergency_contacts").insert({
            student_id: stu.id,
            priority: 2,
            full_name: pdfE2.name_guess ?? "(não informado)",
            relationship: pdfE2.relationship_guess,
            phone: fmtPhone(pdfE2.phone_digits) ?? "",
            address: pdfE2.address_guess,
            notes: pdfE2.raw,
          });
          if (error) rep.errors.push(`emergency_contacts.insert(p2): ${error.message}`);
        } else if (Object.keys(emerg2Updates).length > 0) {
          const { error } = await sb.from("emergency_contacts")
            .update(emerg2Updates)
            .eq("student_id", stu.id)
            .eq("priority", 2);
          if (error) rep.errors.push(`emergency_contacts.update(p2): ${error.message}`);
        }
      }
    }

    reports.push(rep);

    function plan(tbl: string, field: string, current: any, pdfVal: any) {
      if (isEmpty(pdfVal)) {
        rep.actions.push({ kind: "no_value_in_pdf", table: tbl, field });
        return;
      }
      if (isEmpty(current)) {
        rep.actions.push({ kind: "set", table: tbl, field, from: current ?? null, to: pdfVal });
        summary.field_writes++;
        // bucket into the right update object (so apply step has the right payload)
        if (tbl === "students") studentUpdates[field] = pdfVal;
        else if (tbl === "health_restrictions") healthUpdates[field] = pdfVal;
        else if (tbl === "student_contacts") contactUpdates[field] = pdfVal;
        else if (tbl === "student_addresses") addressUpdates[field] = pdfVal;
        else if (tbl === "emergency_contacts:1") emerg1Updates[field] = pdfVal;
        else if (tbl === "emergency_contacts:2") emerg2Updates[field] = pdfVal;
        return;
      }
      if (eqLoose(current, pdfVal)) {
        rep.actions.push({ kind: "match_ok", table: tbl, field, value: current });
        summary.field_matches_ok++;
        return;
      }
      rep.actions.push({ kind: "divergence", table: tbl, field, current, pdf: pdfVal });
      summary.field_divergences++;
      divergencias.push({
        student_id: stu.id,
        student_number: stu.student_number,
        full_name: stu.full_name,
        table: tbl,
        field,
        current,
        pdf: pdfVal,
      });
    }
  }

  // ─── relatórios
  fs.writeFileSync(path.join(OUT_DIR, "relatorio.json"), JSON.stringify({ summary, reports }, null, 2), "utf8");
  fs.writeFileSync(path.join(OUT_DIR, "divergencias.json"), JSON.stringify(divergencias, null, 2), "utf8");

  // ─── console
  console.log("\n=== RESUMO ===");
  console.log(summary);
  console.log("\n=== POR ALUNO ===");
  for (const r of reports) {
    const tag =
      r.match_status === "matched"
        ? `OK   #${r.matched_student_number ?? "?"}`
        : r.match_status === "ambiguous"
          ? `AMB  ----`
          : `MISS ----`;
    const w = r.actions.filter((a) => a.kind === "set").length;
    const d = r.actions.filter((a) => a.kind === "divergence").length;
    const s = r.actions.filter((a) => a.kind === "skip_already_set").length;
    const m = r.actions.filter((a) => a.kind === "match_ok").length;
    console.log(
      `  ${tag}  PDF#${String(r.numero_pdf).padStart(2, "0")}  ${r.pdf_full_name.padEnd(50)} ` +
        `write=${w} match=${m} skip=${s} diverge=${d}` +
        (r.errors.length ? `  ERRO=${r.errors.join("; ")}` : ""),
    );
  }

  console.log(`\nrelatorio.json     → ${path.join(OUT_DIR, "relatorio.json")}`);
  console.log(`divergencias.json  → ${path.join(OUT_DIR, "divergencias.json")}`);
  if (!APPLY) console.log("\nDRY-RUN — nada foi gravado. Adicione --apply para executar.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
