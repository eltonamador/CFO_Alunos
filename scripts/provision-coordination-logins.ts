/**
 * Cria logins individuais da Coordenação com senhas iniciais aleatórias.
 * O endereço em formato de e-mail é apenas um identificador de acesso:
 * nenhum convite ou confirmação por e-mail é enviado.
 *
 * Uso:
 *   pnpm tsx scripts/provision-coordination-logins.ts --dry-run --login-domain=abm.br
 *   pnpm tsx scripts/provision-coordination-logins.ts --confirm-prod --login-domain=abm.br
 *   pnpm tsx scripts/provision-coordination-logins.ts --verify --login-domain=abm.br
 *
 * A execução grava as credenciais uma única vez em um arquivo privado no
 * diretório temporário do sistema. Entregue cada senha ao titular e remova
 * o arquivo após a entrega. Nunca inclua senhas no Git ou nos logs.
 */
import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const confirmProd = args.includes("--confirm-prod");
const verify = args.includes("--verify");
const domain = args.find((arg) => arg.startsWith("--login-domain="))?.split("=")[1];
const projectRef = "waspsdnnxbpdwnyeqtxb";
const url = `https://${projectRef}.supabase.co`;

if (Number(dryRun) + Number(confirmProd) + Number(verify) !== 1 || domain !== "abm.br") {
  throw new Error("Informe --dry-run, --confirm-prod ou --verify e o domínio abm.br.");
}

type ApiKey = { name: string; type: string; api_key: string };
const keys = JSON.parse(
  execFileSync(
    "pnpm",
    ["exec", "supabase", "projects", "api-keys", "--project-ref", projectRef, "--output", "json"],
    { encoding: "utf8", env: { ...process.env, DO_NOT_TRACK: "1" } },
  ),
) as ApiKey[];
const serviceKey = keys.find(
  (key) => key.name === "service_role" && key.type === "legacy",
)?.api_key;
if (!serviceKey) throw new Error("Chave administrativa do projeto de produção indisponível.");

const client = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
});

const members = [
  { registration: "1175742", name: "MÁRCIO FONSECA DA COSTA", username: "marcio" },
  { registration: "1195506", name: "FRANCIELTON ARAÚJO AMADOR", username: "amador" },
  { registration: "1195867", name: "JOSIANE OLIVEIRA DOS SANTOS", username: "josiane" },
  { registration: "1195549", name: "MARLÚCIO ANDERSON DA CONCEIÇÃO TRAJANO", username: "trajano" },
  { registration: "1195808", name: "ALDO NAHUM CARDOSO", username: "nahum" },
  { registration: "943894", name: "ANA CECÍLIA BARBOSA DE CANTUÁRIA", username: "cecilia" },
] as const;

async function main() {
  const { data: rows, error: memberError } = await client
    .from("cfo_coordination_members")
    .select("registration, full_name, profile_id, active, whatsapp_phone")
    .in("registration", [...members.map((member) => member.registration), "1160680", "1113666"]);
  if (memberError) throw memberError;
  if (rows?.length !== 8) throw new Error("As designações da Coordenação diferem do esperado.");
  if (rows.some((row) => ["1160680", "1113666"].includes(row.registration) && row.profile_id)) {
    throw new Error("Integrante sem autorização possui conta vinculada. Interrompendo.");
  }

  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }

  if (verify) {
    const ids = members.map((member) => {
      const row = rows.find((candidate) => candidate.registration === member.registration);
      const user = users.find(
        (candidate) => candidate.email?.toLowerCase() === `${member.username}@${domain}`,
      );
      if (
        !row?.active ||
        row.full_name !== member.name ||
        !row.whatsapp_phone ||
        !row.profile_id ||
        row.profile_id !== user?.id ||
        !user.email_confirmed_at
      )
        throw new Error(`Conta, contato ou vínculo de ${member.name} não confere.`);
      console.log(`Verificado: ${member.name} (${member.username}@${domain})`);
      return row.profile_id;
    });
    const { data: profiles, error: profileError } = await client
      .from("profiles")
      .select("id, role, active")
      .in("id", ids);
    if (
      profileError ||
      profiles?.length !== 6 ||
      profiles.some((profile) => profile.role !== "coordenacao" || !profile.active)
    ) {
      throw profileError ?? new Error("Os perfis da Coordenação não conferem.");
    }
    console.log("Seis perfis ativos de Coordenação verificados; Eline e Jackson sem vínculo.");
    return;
  }

  const credentials = members.map((member) => {
    const row = rows.find((candidate) => candidate.registration === member.registration);
    const login = `${member.username}@${domain}`;
    if (!row?.active || row.full_name !== member.name || !row.whatsapp_phone || row.profile_id) {
      throw new Error(`A designação de ${member.name} não confere ou já tem conta vinculada.`);
    }
    if (users.some((user) => user.email?.toLowerCase() === login)) {
      throw new Error(`O login ${login} já está ocupado. Revisar antes de criar contas.`);
    }
    return {
      registration: member.registration,
      name: member.name,
      login,
      phone: row.whatsapp_phone,
      temporaryPassword: `${randomBytes(20).toString("base64url")}A1!`,
    };
  });

  if (dryRun) {
    for (const account of credentials)
      console.log(`${account.name}: ${account.login} — disponível`);
    console.log("Simulação concluída. Nenhuma conta ou senha foi criada.");
    return;
  }

  const directory = mkdtempSync(join(tmpdir(), "cfo-coordenacao-"));
  const credentialsPath = join(directory, "credenciais.json");
  writeFileSync(
    credentialsPath,
    `${JSON.stringify({ createdAt: new Date().toISOString(), credentials }, null, 2)}\n`,
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  console.log(`Arquivo privado de credenciais: ${credentialsPath}`);

  for (const account of credentials) {
    const { data, error: createError } = await client.auth.admin.createUser({
      email: account.login,
      password: account.temporaryPassword,
      email_confirm: true,
      user_metadata: { full_name: account.name, password_changed_at: null },
    });
    if (createError || !data.user) {
      throw new Error(
        `Criação de ${account.name} falhou: ${createError?.message ?? "sem usuário"}`,
      );
    }

    try {
      const { error: profileError } = await client.from("profiles").insert({
        id: data.user.id,
        role: "coordenacao",
        full_name: account.name,
        active: true,
        student_id: null,
      });
      if (profileError) throw profileError;

      const { data: linked, error: linkError } = await client
        .from("cfo_coordination_members")
        .update({ profile_id: data.user.id })
        .eq("registration", account.registration)
        .is("profile_id", null)
        .select("registration")
        .single();
      if (linkError || !linked) throw linkError ?? new Error("Vínculo não retornado.");
    } catch (error) {
      const { error: rollbackError } = await client.auth.admin.deleteUser(data.user.id);
      if (rollbackError) {
        throw new Error(
          `Falha ao vincular ${account.name}; remoção da conta também falhou: ${rollbackError.message}`,
        );
      }
      throw new Error(
        `Falha ao vincular ${account.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    console.log(`Conta de Coordenação criada e vinculada: ${account.name} (${account.login})`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
