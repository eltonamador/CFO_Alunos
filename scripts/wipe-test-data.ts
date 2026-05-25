/**
 * Zera dados de TESTE preenchidos pelos alunos/coordenação, preservando
 * estrutura base do sistema, usuários, catálogos e identidade dos alunos.
 *
 *   PRESERVA  : auth.users, profiles, courses, classes, equipment_categories,
 *               equipment_requirements, duty_roles
 *               students   (id, class_id, pelotao, student_number,
 *                           full_name, war_name, sex preservados;
 *                           demais campos de ficha → NULL)
 *
 *   ZERA      : student_contacts, student_addresses, student_logistics,
 *               emergency_contacts, vehicles, health_restrictions,
 *               documents, canga_assignments,
 *               student_equipment_status, equipment_questions,
 *               pending_changes, audit_logs,
 *               announcements (+ attachments/reads CASCADE),
 *               duty_rosters, duty_assignments, duty_impediments,
 *               duty_assignment_logs
 *
 * Uso:
 *   # 1. SEMPRE comece com dry-run:
 *   pnpm tsx scripts/wipe-test-data.ts --dry-run
 *
 *   # 2. Execução real (LOCAL ou DEV):
 *   pnpm tsx scripts/wipe-test-data.ts
 *
 *   # 3. Em PRODUÇÃO (Supabase Cloud) — exige confirmação extra:
 *   pnpm tsx scripts/wipe-test-data.ts --confirm-prod
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const isDryRun = process.argv.includes("--dry-run");
const isProd = /\.supabase\.co/i.test(url);
const hasConfirm = process.argv.includes("--confirm-prod");

if (!url || !serviceKey) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

if (isProd && !hasConfirm && !isDryRun) {
  console.error("\n🔴 ALERTA: NEXT_PUBLIC_SUPABASE_URL aponta para PRODUÇÃO");
  console.error(`   URL: ${url}\n`);
  console.error("   Para apagar dados reais, rode com --confirm-prod:");
  console.error("     pnpm tsx scripts/wipe-test-data.ts --confirm-prod\n");
  process.exit(2);
}

if (isProd && hasConfirm) {
  console.log("⚠  Executando contra PRODUÇÃO (confirmado via --confirm-prod)");
  console.log(`   URL: ${url}\n`);
}

if (isDryRun) {
  console.log("🧪 DRY-RUN — nenhum dado será apagado.\n");
}

const supa = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Tabelas cujos dados de teste devem ser DELETADOS na íntegra. */
const TABLES_TO_WIPE = [
  // ordem importa apenas se houver FKs RESTRICT — todas usam CASCADE/SET NULL aqui
  "equipment_questions",
  "student_equipment_status",
  "canga_assignments",
  "documents",
  "health_restrictions",
  "vehicles",
  "emergency_contacts",
  "student_logistics",
  "student_addresses",
  "student_contacts",
  "pending_changes",
  "audit_logs",
  "announcement_reads",
  "announcement_attachments",
  "announcements",
  "duty_assignment_logs",
  "duty_impediments",
  "duty_assignments",
  "duty_rosters",
] as const;

/** Campos de students preenchidos no cadastro — serão setados para NULL. */
const STUDENT_FIELDS_TO_CLEAR = [
  "cpf",
  "rg",
  "pis",
  "voter_id",
  "voter_zone",
  "voter_section",
  "birth_date",
  "naturality_state",
  "naturality_city",
  "marital_status",
  "education_level",
  "graduation_type",
  "enrollment_id",
  "father_name",
  "mother_name",
  "presentation_date",
  "photo_path",
  "graduation_name",
  "professional_experience",
  "religion",
  "religion_other",
  "has_religious_restriction",
  "religious_restriction_notes",
] as const;

async function countTable(name: string): Promise<number | null> {
  const { count, error } = await supa
    .from(name)
    .select("*", { count: "exact", head: true });
  if (error) {
    if (/relation .* does not exist/i.test(error.message)) return null;
    console.warn(`  ⚠ ${name}: ${error.message}`);
    return null;
  }
  return count ?? 0;
}

async function deleteAll(name: string): Promise<number> {
  // delete sem filtro é bloqueado pelo PostgREST → usar predicado que casa tudo
  const { count, error } = await supa
    .from(name)
    .delete({ count: "exact" })
    .not("created_at", "is", null);

  if (error) {
    // fallback para tabelas sem created_at
    const { count: c2, error: e2 } = await supa
      .from(name)
      .delete({ count: "exact" })
      .gte("student_id", "00000000-0000-0000-0000-000000000000");
    if (e2) throw new Error(`${name}: ${e2.message}`);
    return c2 ?? 0;
  }
  return count ?? 0;
}

async function main() {
  console.log("📋 Levantamento atual:\n");
  let totalRows = 0;
  for (const t of TABLES_TO_WIPE) {
    const c = await countTable(t);
    if (c === null) {
      console.log(`  ${t.padEnd(32)} (tabela não existe — pulando)`);
      continue;
    }
    console.log(`  ${t.padEnd(32)} ${String(c).padStart(6)} linhas`);
    totalRows += c;
  }
  const { count: studentsCount } = await supa
    .from("students")
    .select("*", { count: "exact", head: true });
  console.log(
    `\n  students                         ${String(studentsCount ?? 0).padStart(6)} registros (serão PRESERVADOS, mas com ${STUDENT_FIELDS_TO_CLEAR.length} campos zerados)`,
  );

  console.log(`\nTotal de linhas a deletar: ${totalRows}\n`);

  if (isDryRun) {
    console.log("✋ Dry-run encerrado — nada foi modificado.");
    console.log("   Para executar de verdade, rode novamente sem --dry-run.");
    return;
  }

  console.log("🧹 Apagando dados...\n");
  for (const t of TABLES_TO_WIPE) {
    const exists = await countTable(t);
    if (exists === null) continue;
    try {
      const n = await deleteAll(t);
      console.log(`  ✓ ${t.padEnd(32)} ${String(n).padStart(6)} linhas removidas`);
    } catch (e) {
      console.error(`  ✗ ${t}: ${(e as Error).message}`);
    }
  }

  console.log("\n🧼 Limpando campos de ficha em students...");
  const clearPayload: Record<string, null> = Object.fromEntries(
    STUDENT_FIELDS_TO_CLEAR.map((f) => [f, null]),
  );
  const { error: upErr, count: upCount } = await supa
    .from("students")
    .update(clearPayload, { count: "exact" })
    .not("id", "is", null);
  if (upErr) {
    console.error(`  ✗ students: ${upErr.message}`);
  } else {
    console.log(`  ✓ students                        ${String(upCount ?? 0).padStart(6)} registros com ficha zerada`);
  }

  console.log("\n✅ Concluído.");
  console.log("   Estrutura base, usuários e catálogos preservados.");
  console.log("   Alunos mantidos com nº, nome de guerra e nome completo.");
}

main().catch((e) => {
  console.error("\n💥 Erro fatal:", e);
  process.exit(1);
});
