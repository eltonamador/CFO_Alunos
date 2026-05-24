import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function test() {
  console.log("Checking Supabase connection and tables...");

  const { data: students, error: studentErr } = await supabase.from("students").select("id, war_name");
  console.log(`\nStudents count: ${students?.length}. Error:`, studentErr);

  const { data: pendingChanges, error: pendingErr } = await supabase.from("pending_changes").select("id, status");
  console.log(`\nPending Changes count: ${pendingChanges?.length}. Error:`, pendingErr);
  console.log("Pending Changes details:", pendingChanges);

  const { data: documents, error: docErr } = await supabase.from("documents").select("id, status");
  console.log(`\nDocuments count: ${documents?.length}. Error:`, docErr);
  console.log("Documents details:", documents);

  const { data: equipment, error: eqErr } = await supabase.from("student_equipment_status").select("id, status, validation_status");
  console.log(`\nEquipment status count: ${equipment?.length}. Error:`, eqErr);
  console.log("Equipment status details:", equipment);
}

test();
