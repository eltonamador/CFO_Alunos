/**
 * Cria usuários iniciais em auth.users e vincula a profiles.
 *
 * Uso:
 *   1. Rodar `supabase db reset` para aplicar migrations
 *   2. Rodar `supabase db execute --file supabase/seed.sql` para popular alunos/equipamentos
 *   3. Rodar este script:  pnpm tsx scripts/seed-users.ts
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
