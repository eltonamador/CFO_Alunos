/**
 * Reset da senha inicial de TODOS os alunos (role='aluno').
 *
 * - Lê a nova senha de STUDENT_DEFAULT_PASSWORD (env, NUNCA hardcoded).
 * - Limpa user_metadata.password_changed_at → força fluxo /primeiro-acesso.
 * - NÃO toca em coordenação, secretaria, instrutor, admin.
 * - Requer SUPABASE_SERVICE_ROLE_KEY.
 *
 * Uso:
 *   # 1. Dry-run (recomendado primeiro — apenas lista o que faria):
 *   pnpm tsx scripts/reset-students-passwords.ts --dry-run
 *
 *   # 2. Execução real (LOCAL ou DEV):
 *   pnpm tsx scripts/reset-students-passwords.ts
 *
 *   # 3. Execução em PRODUÇÃO (Supabase Cloud) — exige confirmação:
 *   pnpm tsx scripts/reset-students-passwords.ts --confirm-prod
 *
 * Política de senha (mesma do form changePasswordAction):
 *   - mínimo 8 caracteres
 *   - pelo menos 1 letra maiúscula
 *   - pelo menos 1 dígito
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const newPassword = process.env.STUDENT_DEFAULT_PASSWORD;

const isDryRun = process.argv.includes("--dry-run");
const isProd = /\.supabase\.co/i.test(url);
const hasConfirm = process.argv.includes("--confirm-prod");

if (!url || !serviceKey) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

if (!newPassword) {
  console.error("❌ Faltam STUDENT_DEFAULT_PASSWORD no .env.local");
  console.error("   Adicione, por exemplo:  STUDENT_DEFAULT_PASSWORD=Abm@2026");
  process.exit(1);
}

if (newPassword.length < 8 || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
  console.error("❌ STUDENT_DEFAULT_PASSWORD inválida:");
  console.error("   mínimo 8 caracteres, 1 maiúscula e 1 dígito.");
  process.exit(1);
}

if (isProd && !hasConfirm && !isDryRun) {
  console.error("\n🔴 ALERTA: NEXT_PUBLIC_SUPABASE_URL aponta para PRODUÇÃO");
  console.error(`   URL: ${url}\n`);
  console.error("   Para resetar senhas reais, rode com --confirm-prod:");
  console.error("     pnpm tsx scripts/reset-students-passwords.ts --confirm-prod\n");
  process.exit(2);
}

if (isProd && hasConfirm) {
  console.log("⚠  Executando contra PRODUÇÃO (confirmado via --confirm-prod)");
  console.log(`   URL: ${url}\n`);
}

if (isDryRun) {
  console.log("🧪 DRY-RUN — nenhuma senha será alterada.\n");
}

const supa = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const { data: profiles, error: pErr } = await supa
    .from("profiles")
    .select("id, full_name, role, active")
    .eq("role", "aluno")
    .order("full_name");

  if (pErr) throw pErr;
  if (!profiles || profiles.length === 0) {
    console.warn("⚠ Nenhum profile com role='aluno' encontrado.");
    return;
  }

  const { data: usersList, error: uErr } = await supa.auth.admin.listUsers({ perPage: 1000 });
  if (uErr) throw uErr;
  const usersById = new Map(usersList.users.map((u) => [u.id, u]));

  console.log(`Encontrados ${profiles.length} alunos.\n`);

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of profiles) {
    const u = usersById.get(p.id);
    if (!u) {
      console.warn(`  ⚠ ${p.full_name} → sem auth.user vinculado, pulando`);
      skipped++;
      continue;
    }

    if (isDryRun) {
      console.log(`  • ${u.email ?? "(sem email)"} (${p.full_name}) — reset planejado`);
      ok++;
      continue;
    }

    const { error } = await supa.auth.admin.updateUserById(u.id, {
      password: newPassword,
      user_metadata: {
        ...(u.user_metadata ?? {}),
        password_changed_at: null,
      },
    });

    if (error) {
      console.error(`  ✗ ${u.email}: ${error.message}`);
      failed++;
    } else {
      console.log(`  ✓ ${u.email} (${p.full_name})`);
      ok++;
    }
  }

  console.log(`\n────────────────────────────────────────`);
  console.log(`  ${isDryRun ? "Seriam resetados" : "Resetados"}: ${ok}`);
  if (skipped > 0) console.log(`  Ignorados (sem user): ${skipped}`);
  if (failed > 0) console.log(`  Falhas:               ${failed}`);
  console.log(`────────────────────────────────────────`);
  if (!isDryRun) {
    console.log(`  Senha padrão definida via STUDENT_DEFAULT_PASSWORD.`);
    console.log(`  No próximo login o aluno será redirecionado para /primeiro-acesso`);
    console.log(`  para trocar a senha (fluxo já existente).`);
  }
}

main().catch((e) => {
  console.error("\n💥 Erro fatal:", e);
  process.exit(1);
});
