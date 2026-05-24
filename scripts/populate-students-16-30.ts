/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import {
  maskPhone,
  maskCEP,
  maskUF,
  maskPlate,
} from "../src/lib/masks";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !serviceKey) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const isProd = /\.supabase\.co/i.test(url);
const WRITE = process.argv.includes("--write");
const CONFIRM_PROD = process.argv.includes("--confirm-prod");

if (WRITE && isProd && !CONFIRM_PROD) {
  console.error(`\n🔴 BLOQUEIO: NEXT_PUBLIC_SUPABASE_URL aponta para PRODUÇÃO (${url})`);
  console.error("   Para escrever em Cloud, passe --confirm-prod explicitamente.\n");
  process.exit(2);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Pools
const NEIGHBORHOODS = ["Centro", "Buritizal", "Jesus de Nazaré", "Trem", "Santa Rita"];
const CITIES = ["Macapá", "Santana", "Fazendinha"];
const BLOOD_TYPES = ["O", "A", "B", "AB"];
const RH_FACTORS = ["+", "-"];
const EDUCATION = ["Ensino Médio", "Ensino Superior Completo", "Pós-graduação"];

async function main() {
  console.log(`\n=== POPULATE ALUNOS 16-30 ${WRITE ? "[ESCRITA]" : "[DRY-RUN]"} ===`);

  const { data: students, error: stdErr } = await supabase
    .from("students")
    .select("*")
    .gte("student_number", 16)
    .lte("student_number", 30)
    .order("student_number");

  if (stdErr || !students || students.length === 0) {
    console.error("Nenhum aluno encontrado ou erro:", stdErr);
    return;
  }
  
  const { data: equipReqs } = await supabase.from("equipment_requirements").select("id");

  for (const s of students) {
    const num = s.student_number;
    console.log(`\nProcessando Aluno #${num} - ${s.war_name}`);
    const mod = num % 5;
    
    // Scenario mapping:
    // mod === 1 (16, 21, 26) -> A: 100% Complete
    // mod === 2 (17, 22, 27) -> B: Missing documents
    // mod === 3 (18, 23, 28) -> C: Missing materials
    // mod === 4 (19, 24, 29) -> D: Health pending
    // mod === 0 (20, 25, 30) -> E: Cadastral pendencies

    const isA = mod === 1;
    const isB = mod === 2;
    const isC = mod === 3;
    const isD = mod === 4;
    const isE = mod === 0;

    if (!WRITE) {
      console.log(`  Dry-run: Pertence ao Cenário ${isA ? 'A (Completo)' : isB ? 'B (Docs Pendentes)' : isC ? 'C (Materiais Pendentes)' : isD ? 'D (Saúde Pendente)' : 'E (Pendências Cadastrais)'}`);
      continue;
    }

    // 1. Identificação
    const identUpdate = {
      birth_date: `199${num % 10}-05-1${num % 9 + 1}`,
      sex: num % 2 === 0 ? "F" : "M",
      marital_status: "Solteiro(a)",
      education_level: EDUCATION[num % 3],
      cpf: `0000000${num.toString().padStart(4, "0")}`,
      voter_id: `1234567890${num.toString().padStart(2, "0")}`,
      voter_zone: "001",
      voter_section: "0001",
      father_name: `Pai do Aluno ${num}`,
      mother_name: `Mãe do Aluno ${num}`,
      naturality_state: "AP",
      naturality_city: "Macapá",
    };
    await supabase.from("students").update(identUpdate).eq("id", s.id);

    // 2. Contato
    await supabase.from("student_contacts").upsert({
      student_id: s.id,
      whatsapp: maskPhone(`9699111${num.toString().padStart(4, "0")}`),
      email_personal: `aluno${num}@teste.com`
    });

    // 3. Endereço
    await supabase.from("student_addresses").upsert({
      student_id: s.id,
      street: `Rua Nova Vida ${num}`,
      district: NEIGHBORHOODS[num % NEIGHBORHOODS.length],
      city: CITIES[num % CITIES.length],
      state: "AP",
      zip: maskCEP("68900000"),
      origin_in_amapa: true
    });

    // 4. Logística
    await supabase.from("student_logistics").upsert({
      student_id: s.id,
      has_fixed_residence_macapa: true,
      has_family_in_ap: true
    });

    // 5. Emergência
    await supabase.from("emergency_contacts").upsert({
      student_id: s.id,
      priority: 1,
      full_name: `Contato Principal ${num}`,
      relationship: "Mãe",
      phone: maskPhone(`9699222${num.toString().padStart(4, "0")}`)
    });
    if (isA || isD) {
      await supabase.from("emergency_contacts").upsert({
        student_id: s.id,
        priority: 2,
        full_name: `Contato Secundário ${num}`,
        relationship: "Pai",
        phone: maskPhone(`9699333${num.toString().padStart(4, "0")}`)
      });
    }

    // 6. Veículos
    if (isA || isC || isE) {
      await supabase.from("vehicles").upsert({
        student_id: s.id,
        has_vehicle: true,
        vehicle_type: "carro",
        vehicle_brand_model: "Honda Civic",
        plate: maskPlate(`ABC12${num.toString().padStart(2, "0")}`),
        has_cnh: true,
        cnh_category: "AB",
        cnh_valid_until: "2030-01-01"
      });
    } else {
      await supabase.from("vehicles").upsert({
        student_id: s.id,
        has_vehicle: false,
        has_cnh: false
      });
    }

    // 7. Saúde
    const healthStatus = isD ? "pendente" : "validado";
    await supabase.from("health_restrictions").upsert({
      student_id: s.id,
      blood_type: BLOOD_TYPES[num % 4],
      rh_factor: RH_FACTORS[num % 2],
      altura_cm: 170 + num,
      peso_kg: 60 + num,
      allergies: isD ? "Alergia a dipirona (simulação pendência)" : null,
      uses_glasses: num % 3 === 0,
      validation_status: healthStatus,
    });

    // 8. Documentos
    if (!isB) {
      // Cria docs válidos se não for cenário B
      const docTypes = ['rg_cpf', 'cnh', 'comprovante_residencia', 'foto_3x4'];
      for (const t of docTypes) {
        await supabase.from("documents").insert({
          student_id: s.id,
          doc_type: t,
          storage_path: `docs/${s.id}/${t}.pdf`,
          status: 'validado'
        });
      }
    } else {
      // Cenário B - Docs pendentes
      await supabase.from("documents").insert({
        student_id: s.id,
        doc_type: 'rg_cpf',
        storage_path: `docs/${s.id}/rg_cpf.pdf`,
        status: 'pendente'
      });
    }

    // 9. Materiais
    if (equipReqs) {
      const inserts = equipReqs.map((req: any, index: number) => {
        let st = "ok";
        let validSt = "validado";
        
        if (isC) {
          if (index % 5 === 0) {
            st = "falta_comprar";
            validSt = "nao_validado";
          } else if (index % 7 === 0) {
            st = "em_duvida";
            validSt = "nao_validado";
          }
        }
        
        return {
          student_id: s.id,
          requirement_id: req.id,
          status: st,
          validation_status: validSt,
          student_notes: st === "em_duvida" ? "Pode ser na cor azul escuro?" : null
        };
      });
      // Delete old first to be fully idempotent
      await supabase.from("student_equipment_status").delete().eq("student_id", s.id);
      await supabase.from("student_equipment_status").insert(inserts);
    }

    // 10. Pendências Cadastrais
    if (isE) {
      await supabase.from("pending_changes").insert({
        student_id: s.id,
        context: "contato",
        entity: "student_contacts",
        previous_value: { whatsapp: "(96) 90000-0000" },
        new_value: { whatsapp: "(96) 99999-9999" },
        status: "pendente"
      });
    }

    console.log(`  ✅ Escrito no Supabase para ${s.war_name}.`);
  }

  console.log("\n✅ Concluído.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
