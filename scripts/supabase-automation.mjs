import { existsSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_REF = "waspsdnnxbpdwnyeqtxb";
const PROJECT_NAME = "cfo-alunos-prod";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const marker = "# Managed by scripts/supabase-automation.mjs (Supabase local)";

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    env: process.env,
  });
  if (options.capture && result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`${command} ${args.join(" ")} falhou (${result.status}).`);
  return result.stdout?.trim() ?? "";
}

function tryRun(command, args) {
  return spawnSync(command, args, { cwd: root, encoding: "utf8", stdio: "ignore" }).status === 0;
}

function supabase(args, options) {
  return run("pnpm", ["exec", "supabase", ...args], options);
}

function retry(label, operation, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      console.warn(`${label} falhou na tentativa ${attempt}/${attempts}; repetindo em 5 segundos...`);
      spawnSync("sleep", ["5"], { stdio: "ignore" });
    }
  }
  throw lastError;
}

function linkedRef() {
  const path = resolve(root, "supabase/.temp/project-ref");
  return existsSync(path) ? readFileSync(path, "utf8").trim() : null;
}

function ensureLink() {
  const current = linkedRef();
  if (current === PROJECT_REF) return;
  if (current && current !== PROJECT_REF) {
    throw new Error(
      `Checkout vinculado ao projeto inesperado ${current}; esperado ${PROJECT_REF}.`,
    );
  }
  console.log(`Vinculando ao Supabase ${PROJECT_NAME} (${PROJECT_REF})...`);
  supabase(["link", "--project-ref", PROJECT_REF]);
}

function ensureDocker() {
  if (tryRun("docker", ["info"])) return;
  if (process.platform === "darwin" && tryRun("sh", ["-c", "command -v colima"])) {
    console.log("Docker parado; iniciando Colima...");
    run("colima", ["start"]);
  }
  if (!tryRun("docker", ["info"])) {
    throw new Error(
      "Docker indisponível. Instale/inicie Docker Desktop, Colima ou runtime compatível.",
    );
  }
}

function localStatus() {
  try {
    return JSON.parse(supabase(["status", "--output", "json"], { capture: true }));
  } catch {
    return null;
  }
}

function writeLocalEnv(status) {
  const path = resolve(root, ".env.local");
  if (existsSync(path) && !readFileSync(path, "utf8").includes(marker)) {
    throw new Error(
      ".env.local existente não é gerenciado pela automação; preserve-o ou renomeie-o antes do setup local.",
    );
  }
  let content = existsSync(path)
    ? readFileSync(path, "utf8")
    : `${marker}\n# Gerado a partir de: pnpm exec supabase status --output json\n`;
  const values = {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY,
    NEXT_PUBLIC_APP_NAME: "CFO Alunos",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NODE_ENV: "development",
  };
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${value}`;
    const lines = content.split("\n");
    const index = lines.findIndex((candidate) => candidate.startsWith(`${key}=`));
    if (index >= 0) lines[index] = line;
    else lines.push(line);
    content = lines.join("\n");
  }
  if (!content.endsWith("\n")) content += "\n";
  writeFileSync(path, content, { encoding: "utf8", mode: 0o600 });
  chmodSync(path, 0o600);
  console.log(".env.local local gerado sem expor chaves no terminal.");
}

function generateTypes() {
  const output = supabase(["gen", "types", "typescript", "--local"], { capture: true });
  const typesPath = resolve(root, "src/lib/supabase/types.ts");
  writeFileSync(typesPath, `${output}\n`, "utf8");
  run("pnpm", ["exec", "prettier", "--write", typesPath]);
  console.log("Tipos TypeScript regenerados do banco local.");
}

function doctor() {
  const cli = supabase(["--version"], { capture: true });
  const docker = tryRun("docker", ["info"]);
  const status = docker ? localStatus() : null;
  const ref = linkedRef();
  const envPath = resolve(root, ".env.local");
  const managedEnv = existsSync(envPath) && readFileSync(envPath, "utf8").includes(marker);
  console.log(`Supabase CLI: ${cli}`);
  console.log(`Docker: ${docker ? "disponível" : "parado/indisponível"}`);
  console.log(`Supabase local: ${status ? "ativo" : "parado"}`);
  console.log(
    `Projeto remoto: ${ref === PROJECT_REF ? `${PROJECT_NAME} vinculado` : "não vinculado"}`,
  );
  console.log(
    `.env.local: ${managedEnv ? "local e gerenciado" : existsSync(envPath) ? "existente e não gerenciado" : "ausente"}`,
  );
}

function localSetup() {
  const envPath = resolve(root, ".env.local");
  if (existsSync(envPath) && !readFileSync(envPath, "utf8").includes(marker)) {
    throw new Error(
      ".env.local existente não é gerenciado; setup local cancelado antes de alterar o ambiente.",
    );
  }
  ensureDocker();
  supabase(["start", "--output", "json"], { capture: true });
  console.log("Supabase local ativo.");
  retry("Reset do Supabase local", () => supabase(["db", "reset"]));
  supabase(["test", "db"]);
  generateTypes();
  const status = localStatus();
  if (!status) throw new Error("Supabase local iniciou, mas o status não pôde ser lido.");
  writeLocalEnv(status);
  run("pnpm", ["exec", "tsx", "scripts/seed-users.ts"]);
  console.log("Ambiente local pronto e validado.");
}

function localHomologate() {
  localSetup();
  run("pnpm", ["exec", "playwright", "install", "chromium"]);
  run("pnpm", ["check"]);
  run("pnpm", ["e2e", "--project=chromium"]);
  console.log("Homologação local concluída com sucesso.");
}

function remotePlan() {
  ensureLink();
  supabase(["migration", "list", "--linked"]);
  supabase(["db", "push", "--linked", "--dry-run"]);
}

function remoteApply(args) {
  const confirmation = `--confirm-production=${PROJECT_NAME}`;
  if (!args.includes(confirmation)) {
    throw new Error(
      `Aplicação bloqueada. Use ${confirmation} após aprovação explícita da implantação.`,
    );
  }
  ensureLink();
  supabase(["db", "push", "--linked"]);
}

const [command, ...args] = process.argv.slice(2);
const commands = {
  doctor,
  "local-homologate": localHomologate,
  "local-setup": localSetup,
  "local-types": generateTypes,
  "local-stop": () => supabase(["stop", "--no-backup"]),
  "remote-plan": remotePlan,
  "remote-apply": () => remoteApply(args),
  link: ensureLink,
};

if (!commands[command]) {
  console.error(
    "Uso: node scripts/supabase-automation.mjs <doctor|link|local-setup|local-homologate|local-types|local-stop|remote-plan|remote-apply>",
  );
  process.exit(2);
}

try {
  commands[command]();
} catch (error) {
  console.error(`Erro: ${error.message}`);
  process.exit(1);
}
