/**
 * Lista alunos com número, nome de guerra, e-mail/usuário.
 * Apenas leitura — não modifica nada.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supa = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: students, error } = await supa
    .from("students")
    .select("id, student_number, war_name, full_name")
    .order("student_number", { ascending: true });

  if (error) throw error;
  if (!students) return;

  const { data: profiles, error: pErr } = await supa
    .from("profiles")
    .select("id, student_id")
    .eq("role", "aluno");
  if (pErr) throw pErr;

  const { data: usersList, error: uErr } = await supa.auth.admin.listUsers({ perPage: 1000 });
  if (uErr) throw uErr;
  const emailByAuthId = new Map(usersList.users.map((u) => [u.id, u.email ?? ""]));
  const emailByStudentId = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.student_id) {
      emailByStudentId.set(p.student_id, emailByAuthId.get(p.id) ?? "");
    }
  }

  const rows: string[] = [];
  rows.push("Nº | Nome de Guerra | Nome Completo | E-mail/Usuário");
  rows.push("---|---|---|---");
  for (const s of students) {
    const num = s.student_number ? String(s.student_number).padStart(2, "0") : "—";
    const email = emailByStudentId.get(s.id) || "(sem usuário)";
    rows.push(`${num} | ${s.war_name ?? "—"} | ${s.full_name ?? "—"} | ${email}`);
  }
  console.log(rows.join("\n"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
