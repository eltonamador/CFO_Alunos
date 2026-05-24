/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Normaliza valores antigos no Cloud usando os mesmos helpers do app:
 * - telefones em student_contacts, emergency_contacts → maskPhone
 * - CEP em student_addresses → maskCEP
 * - UF em student_addresses, students → maskUF (apenas se valor parecer UF)
 * - placa em vehicles → maskPlate (mas só se isValidPlate verdadeiro após mask)
 *
 * Dry-run por padrão. Use --write (+ --confirm-prod em Cloud) para gravar.
 * Não toca em valores já corretos (após aplicar máscara).
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  maskPhone,
  maskCEP,
  maskUF,
  maskPlate,
  isValidPlate,
} from "../src/lib/masks";

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

interface Change {
  table: string;
  key: string;
  field: string;
  before: string;
  after: string;
}
const changes: Change[] = [];

function maybeNormalize<T extends Record<string, any>>(
  table: string,
  rows: T[],
  keyField: string,
  fieldMap: Record<string, (v: string) => string | null>,
) {
  return rows.flatMap((r) => {
    const updates: Record<string, string | null> = {};
    for (const [field, fn] of Object.entries(fieldMap)) {
      const before = r[field];
      if (!before || typeof before !== "string") continue;
      const after = fn(before);
      if (after !== null && after !== before) {
        updates[field] = after;
        changes.push({ table, key: r[keyField], field, before, after });
      }
    }
    return Object.keys(updates).length > 0
      ? [{ key: r[keyField], updates }]
      : [];
  });
}

async function main() {
  console.log(`\n=== NORMALIZAÇÃO ${WRITE ? "[ESCRITA]" : "[DRY-RUN]"} ===\n`);

  // student_contacts
  const { data: contacts } = await supabase.from("student_contacts").select("*");
  const contactUpdates = maybeNormalize("student_contacts", contacts ?? [], "student_id", {
    whatsapp: (v) => {
      const m = maskPhone(v);
      return m.replace(/\D/g, "").length >= 10 ? m : null;
    },
    phone_secondary: (v) => {
      const m = maskPhone(v);
      return m.replace(/\D/g, "").length >= 10 ? m : null;
    },
  });

  // emergency_contacts (chave composta — uso id)
  const { data: emergencies } = await supabase.from("emergency_contacts").select("*");
  const emergUpdates = maybeNormalize("emergency_contacts", emergencies ?? [], "id", {
    phone: (v) => {
      const m = maskPhone(v);
      return m.replace(/\D/g, "").length >= 10 ? m : null;
    },
  });

  // student_addresses
  const { data: addrs } = await supabase.from("student_addresses").select("*");
  const addrUpdates = maybeNormalize("student_addresses", addrs ?? [], "student_id", {
    zip: (v) => {
      const m = maskCEP(v);
      return m.replace(/\D/g, "").length === 8 ? m : null;
    },
    state: (v) => (v.length <= 3 ? maskUF(v) || null : null),
    origin_state: (v) => (v.length <= 3 ? maskUF(v) || null : null),
  });

  // vehicles (plate)
  const { data: vehs } = await supabase.from("vehicles").select("*");
  const vehUpdates = maybeNormalize("vehicles", vehs ?? [], "student_id", {
    plate: (v) => {
      const m = maskPlate(v);
      return isValidPlate(m) ? m : null;
    },
  });

  console.log(`Mudanças propostas: ${changes.length}\n`);
  for (const c of changes) {
    console.log(`  · [${c.table}.${c.field}] ${c.key.slice(0, 8)}…  ${JSON.stringify(c.before)} → ${JSON.stringify(c.after)}`);
  }

  if (!WRITE) {
    console.log("\nDry-run — nada foi gravado. Use --write para aplicar.\n");
    return;
  }

  // Aplicar (em batches pequenos por linha)
  for (const u of contactUpdates) {
    await supabase.from("student_contacts").update(u.updates).eq("student_id", u.key);
  }
  for (const u of emergUpdates) {
    await supabase.from("emergency_contacts").update(u.updates).eq("id", u.key);
  }
  for (const u of addrUpdates) {
    await supabase.from("student_addresses").update(u.updates).eq("student_id", u.key);
  }
  for (const u of vehUpdates) {
    await supabase.from("vehicles").update(u.updates).eq("student_id", u.key);
  }

  console.log(`\n✅ ${changes.length} alterações aplicadas.\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
