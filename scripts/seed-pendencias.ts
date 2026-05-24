import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  console.log("Seeding sample pending items...");

  // 1. Get 3 students
  const { data: students } = await supabase
    .from("students")
    .select("id, war_name")
    .is("deleted_at", null)
    .limit(3);

  if (!students || students.length === 0) {
    console.error("No students found. Run seed-users first.");
    process.exit(1);
  }

  console.log(`Found ${students.length} students to seed pendencies.`);

  // Get matching profiles so we have a valid requester user id
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, student_id")
    .in("student_id", students.map(s => s.id));

  const profileMap = new Map(profiles?.map(p => [p.student_id, p.id]) ?? []);

  // Get active coordination user to use as backup requester
  const { data: coordUser } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "coordenacao")
    .maybeSingle();

  const backupRequesterId = coordUser?.id;
  if (!backupRequesterId) {
    console.error("No coordination user found. Run seed-users first.");
    process.exit(1);
  }

  // 2. Seed pending changes
  console.log("\nSeeding pending cadastral changes...");
  const s1 = students[0];
  const s2 = students[1];

  const { error: pChangeErr } = await supabase.from("pending_changes").insert([
    {
      student_id: s1.id,
      context: "Identificação",
      entity: "students",
      field: "mother_name",
      previous_value: "Maria Antônia",
      new_value: "Maria Antônia da Silva",
      requested_by: profileMap.get(s1.id) || backupRequesterId,
      status: "pendente"
    },
    {
      student_id: s2.id,
      context: "Identificação",
      entity: "students",
      field: "father_name",
      previous_value: null,
      new_value: "José Francisco de Souza",
      requested_by: profileMap.get(s2.id) || backupRequesterId,
      status: "pendente"
    }
  ]);
  console.log("Pending changes seed result:", pChangeErr ? pChangeErr.message : "Success");

  // 3. Seed pending documents
  console.log("\nSeeding pending documents...");
  const { error: docErr } = await supabase.from("documents").insert([
    {
      student_id: s1.id,
      doc_type: "rg_cpf",
      storage_path: "mock/rg_cpf.pdf",
      status: "enviado"
    },
    {
      student_id: s2.id,
      doc_type: "comprovante_residencia",
      storage_path: "mock/comprovante_residencia.pdf",
      status: "em_analise"
    }
  ]);
  console.log("Documents seed result:", docErr ? docErr.message : "Success");

  // 4. Seed pending equipment/enxoval statuses
  console.log("\nSeeding pending equipment validations...");
  const { data: requirements } = await supabase
    .from("equipment_requirements")
    .select("id, name")
    .eq("active", true)
    .limit(3);

  if (requirements && requirements.length > 0) {
    const s3 = students[2] || s1;
    const req1 = requirements[0];
    const req2 = requirements[1] || requirements[0];

    const { error: eqErr } = await supabase.from("student_equipment_status").upsert([
      {
        student_id: s1.id,
        requirement_id: req1.id,
        status: "comprado",
        validation_status: "nao_validado",
        student_notes: "Comprei a gandola no tamanho M conforme edital.",
        updated_by: profileMap.get(s1.id) || backupRequesterId
      },
      {
        student_id: s3.id,
        requirement_id: req2.id,
        status: "comprado",
        validation_status: "nao_validado",
        student_notes: "Bota adquirida na loja oficial do bombeiro.",
        updated_by: profileMap.get(s3.id) || backupRequesterId
      }
    ], { onConflict: "student_id,requirement_id" });

    console.log("Equipment status seed result:", eqErr ? eqErr.message : "Success");
  } else {
    console.log("No equipment requirements found to link status.");
  }

  console.log("\nAll sample pending items seeded successfully! Please refresh your dashboard.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
