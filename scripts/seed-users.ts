/**
 * Cria usuários iniciais em auth.users e vincula a profiles.
 *
 * Uso (DEV LOCAL):
 *   1. Rodar `supabase db reset` para aplicar migrations
 *   2. Rodar `supabase db execute --file supabase/seed.sql`
 *   3. Rodar este script:  pnpm tsx scripts/seed-users.ts
 *
 * Uso (PRODUÇÃO — Supabase Cloud):
 *   1. Garantir que .env.local aponta para o projeto cloud
 *   2. Aplicar migrations: pnpm exec supabase db push
 *   3. Aplicar seed via psql (ver docs/DEPLOY_SUPABASE.md)
 *   4. Rodar este script com flag --confirm-prod:
 *      pnpm tsx scripts/seed-users.ts --confirm-prod
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !serviceKey) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

// ===== GUARDA DE PRODUÇÃO =====
// Se a URL aponta pra supabase.co (Cloud) e não veio a flag --confirm-prod,
// aborta imediatamente para evitar criar usuários por engano em produção.
const isProd = /\.supabase\.co/i.test(url);
const hasConfirm = process.argv.includes("--confirm-prod");

if (isProd && !hasConfirm) {
  console.error("\n🔴 ALERTA: NEXT_PUBLIC_SUPABASE_URL aponta para PRODUÇÃO");
  console.error(`   URL: ${url}`);
  console.error("");
  console.error("   Este script criará usuários reais em auth.users do projeto cloud.");
  console.error("   Se for intencional, rode novamente com a flag --confirm-prod:");
  console.error("");
  console.error("      pnpm tsx scripts/seed-users.ts --confirm-prod");
  console.error("");
  process.exit(2);
}

if (isProd && hasConfirm) {
  console.log("⚠  Executando contra PRODUÇÃO (confirmado via --confirm-prod)");
  console.log(`   URL: ${url}\n`);
}

const supa = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

type SeedUser = {
  email: string;
  password: string;
  fullName: string;
  role: "coordenacao" | "secretaria" | "instrutor" | "aluno";
  studentNumber?: number;
};

const ADMINS: SeedUser[] = [
  { email: "coordenacao@cbmap.local", password: "ChangeMe!2026", fullName: "Coordenação CFO", role: "coordenacao" },
  { email: "secretaria@cbmap.local",  password: "ChangeMe!2026", fullName: "Secretaria Acad.", role: "secretaria" },
  { email: "instrutor@cbmap.local",   password: "ChangeMe!2026", fullName: "Instrutor Teste",  role: "instrutor" },
];

async function upsertUser(u: SeedUser, studentId?: string) {
  // Cria (ou ignora se já existe) o auth.user
  const { data: existing } = await supa.auth.admin.listUsers();
  const found = existing.users.find((x) => x.email === u.email);

  let userId: string;
  if (found) {
    userId = found.id;
    console.log(`↻ ${u.email} já existe (${userId})`);
  } else {
    const { data, error } = await supa.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.fullName },
    });
    if (error || !data.user) throw new Error(`Falha ao criar ${u.email}: ${error?.message}`);
    userId = data.user.id;
    console.log(`✓ criado ${u.email} (${userId})`);
  }

  // Upsert do profile
  const { error: pe } = await supa.from("profiles").upsert({
    id: userId,
    role: u.role,
    full_name: u.fullName,
    active: true,
    student_id: studentId ?? null,
  });
  if (pe) throw new Error(`Falha no profile de ${u.email}: ${pe.message}`);
}

async function main() {
  // Admins
  for (const a of ADMINS) await upsertUser(a);

  // 30 alunos — vinculando por student_number
  const { data: students } = await supa
    .from("students")
    .select("id, student_number, full_name")
    .order("student_number");

  if (!students || students.length === 0) {
    console.warn("⚠ Nenhum student encontrado — rode seed.sql primeiro.");
    return;
  }

  for (const s of students) {
    const num = String(s.student_number).padStart(2, "0");
    await upsertUser(
      {
        email: `aluno${num}@cbmap.local`,
        password: "ChangeMe!2026",
        fullName: s.full_name,
        role: "aluno",
      },
      s.id,
    );
  }

  console.log("\n✅ Seed de usuários concluído.");
  console.log("    Login admin:    coordenacao@cbmap.local / ChangeMe!2026");
  console.log("    Login alunoXX:  aluno01@cbmap.local     / ChangeMe!2026");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
