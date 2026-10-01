/**
 * Provisiona a conta de aluno de teste no projeto Supabase configurado em .env.local.
 * Executar depois das migrations 0129 e 0130 e do deploy do aplicativo.
 *
 * BORIS_LOGIN_EMAIL=... BORIS_INITIAL_PASSWORD=... pnpm tsx scripts/provision-boris.ts --confirm-prod
 * A senha nunca é impressa. Use uma senha temporária única e troque-a no primeiro acesso.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.BORIS_LOGIN_EMAIL?.trim().toLowerCase();
const password = process.env.BORIS_INITIAL_PASSWORD;

if (!url || !key || !email || !email.includes("@") || !password || password.length < 12) {
  throw new Error(
    "Informe NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, BORIS_LOGIN_EMAIL e BORIS_INITIAL_PASSWORD (mínimo 12 caracteres).",
  );
}
if (/\.supabase\.co\b/i.test(url) && !process.argv.includes("--confirm-prod")) {
  throw new Error("Projeto remoto detectado. Execute com --confirm-prod após conferir o deploy.");
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

async function findAuthUser(login: string) {
  for (let page = 1; ; page += 1) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const found = data.users.find((user) => user.email?.toLowerCase() === login);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
}

async function main() {
  const { data: courseClass, error: classError } = await db
    .from("classes")
    .select("id,name")
    .eq("id", "22222222-2222-2222-2222-222222222222")
    .single();
  if (classError || courseClass?.name !== "CFO 2026.1") {
    throw new Error("Turma oficial CFO 2026.1 não encontrada.");
  }

  const { data: testRows, error: studentError } = await db
    .from("students")
    .select("id,class_id,war_name,is_test,course_status,student_number")
    .eq("is_test", true)
    .eq("war_name", "BORIS");
  if (studentError)
    throw new Error(`Migration 0130 pendente ou consulta falhou: ${studentError.message}`);
  if (testRows.length > 1)
    throw new Error("Há mais de um Boris de teste; corrija antes de provisionar.");

  let studentId = testRows[0]?.id;
  if (
    testRows[0] &&
    (testRows[0].class_id !== courseClass.id ||
      testRows[0].course_status !== "outro" ||
      testRows[0].student_number !== null)
  ) {
    throw new Error("Boris existente não tem a configuração segura de teste.");
  }

  const existingUser = await findAuthUser(email!);
  if (existingUser) {
    const { data: existingProfile, error: profileError } = await db
      .from("profiles")
      .select("role,student_id,full_name")
      .eq("id", existingUser.id)
      .maybeSingle();
    if (profileError) throw profileError;
    if (!existingProfile && existingUser.user_metadata?.full_name !== "Boris — aluno de teste") {
      throw new Error("O e-mail já existe sem perfil de Boris; nenhuma conta foi alterada.");
    }
    if (
      existingProfile &&
      (existingProfile.role !== "aluno" ||
        existingProfile.full_name !== "Boris — aluno de teste" ||
        existingProfile.student_id !== studentId)
    ) {
      throw new Error("O e-mail informado já pertence a outro perfil; nenhuma conta foi alterada.");
    }
  }

  if (!studentId) {
    const { data, error } = await db
      .from("students")
      .insert({
        class_id: courseClass.id,
        full_name: "Boris — aluno de teste",
        war_name: "BORIS",
        pelotao: "CFO I",
        student_number: null,
        situation: "matriculado",
        course_status: "outro",
        is_test: true,
      })
      .select("id")
      .single();
    if (error || !data) throw new Error(`Falha ao criar Boris: ${error?.message}`);
    studentId = data.id;
  }

  let userId = existingUser?.id;
  if (!userId) {
    const { data, error } = await db.auth.admin.createUser({
      email: email!,
      password: password!,
      email_confirm: true,
      user_metadata: { full_name: "Boris — aluno de teste" },
    });
    if (error || !data.user) throw new Error(`Falha ao criar login: ${error?.message}`);
    userId = data.user.id;
  }

  const { error: profileError } = await db.from("profiles").upsert({
    id: userId,
    role: "aluno",
    full_name: "Boris — aluno de teste",
    active: true,
    student_id: studentId,
  });
  if (profileError) throw new Error(`Falha ao vincular login: ${profileError.message}`);

  console.log(`Boris provisionado: ${email} | aluno ${studentId} | perfil ${userId}`);
  console.log("Entre no aplicativo publicado e altere a senha temporária no primeiro acesso.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
