/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Resolve as 3 pendências do snapshot inicial:
 *   - RIVALDO mother_name              → VALIDAR (correção legítima)
 *   - IAN LIMA father_name             → VALIDAR (preenchimento legítimo)
 *   - SABRINA health (allergies fwfwf) → RECUSAR (dados de teste)
 *
 * Idempotente — re-checa o status antes de mexer.
 * Sempre exige --write.
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) process.exit(1);

const WRITE = process.argv.includes("--write");
const isProd = /\.supabase\.co/i.test(url);
if (WRITE && isProd && !process.argv.includes("--confirm-prod")) {
  console.error("🔴 Em Cloud, exige --confirm-prod");
  process.exit(2);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// IDs reais vindos do backup
const DECISIONS: Record<string, { decision: "validado" | "recusado"; reason?: string }> = {
  "f5a27546": { decision: "validado" }, // RIVALDO mother_name
  "02298afb": { decision: "validado" }, // IAN LIMA father_name
  "5f22433b": {
    decision: "recusado",
    reason: "Dados de teste inválidos (allergies/medical_notes/chronic_disease = 'fwfwf'). Aluno deve refazer.",
  },
};

async function main() {
  const { data: pendings } = await supabase
    .from("pending_changes")
    .select("*")
    .eq("status", "pendente");

  console.log(`\n=== RESOLVE-PENDINGS ${WRITE ? "[ESCRITA]" : "[DRY-RUN]"} ===`);
  console.log(`Pendências em aberto: ${pendings?.length ?? 0}\n`);

  for (const p of pendings ?? []) {
    const prefix = p.id.slice(0, 8);
    const d = DECISIONS[prefix];
    if (!d) {
      console.log(`  ? ${prefix}… (sem decisão pré-aprovada — IGNORADA)`);
      continue;
    }
    console.log(`  → ${prefix}…  decisão: ${d.decision.toUpperCase()}${d.reason ? "  motivo: " + d.reason : ""}`);

    if (!WRITE) continue;

    // 1. Atualiza pending_changes
    await supabase
      .from("pending_changes")
      .update({
        status: d.decision,
        reason: d.reason ?? null,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", p.id);

    // 2. Se for saúde + recusada/validada, reflete em health_restrictions
    if (p.entity === "health_restrictions") {
      await supabase
        .from("health_restrictions")
        .update({
          validation_status: d.decision,
          validated_at: new Date().toISOString(),
        })
        .eq("student_id", p.student_id);
    }
  }

  console.log("\n✅ Resolução concluída.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
