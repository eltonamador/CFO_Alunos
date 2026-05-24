/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Dump JSON local de todas as tabelas críticas do Cloud.
 * Cria backups/{timestamp}/ com um arquivo por tabela.
 * Não modifica nada.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const TABLES = [
  "students",
  "student_contacts",
  "student_addresses",
  "emergency_contacts",
  "health_restrictions",
  "student_logistics",
  "vehicles",
  "pending_changes",
  "canga_assignments",
  "equipment_checklist",
];

async function main() {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = join("backups", ts);
  mkdirSync(dir, { recursive: true });
  console.log(`Backup → ${dir}\nSupabase: ${url}\n`);

  let total = 0;
  for (const t of TABLES) {
    const { data, error } = await supabase.from(t).select("*");
    if (error) {
      console.warn(`  ! ${t}: ${error.message}`);
      continue;
    }
    const rows = data ?? [];
    writeFileSync(join(dir, `${t}.json`), JSON.stringify(rows, null, 2), "utf8");
    total += rows.length;
    console.log(`  ✓ ${t.padEnd(24)} ${rows.length.toString().padStart(5)} linhas`);
  }
  console.log(`\nTotal: ${total} linhas exportadas.`);
  console.log(`Para restaurar manualmente, use os JSON em ${dir}.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
