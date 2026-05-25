import { describe, expect, it } from "vitest";
import {
  calculateStudentProfileProgress,
  REQUIRED_FIELDS,
  statusFor,
  type StudentProfileBundle,
} from "./student-progress";

function emptyBundle(): StudentProfileBundle {
  return {
    student: {
      id: "s-1",
      class_id: "c-1",
      student_number: null,
      war_name: "",
      full_name: "",
      pelotao: null,
      photo_path: null,
      situation: "matriculado",
      sex: null,
      birth_date: null,
      nationality: null,
      naturality_state: null,
      naturality_city: null,
      marital_status: null,
      education_level: null,
      graduation_type: null,
      graduation_name: null,
      professional_experience: null,
      enrollment_id: null,
      cpf: null,
      rg: null,
      pis: null,
      voter_id: null,
      voter_zone: null,
      voter_section: null,
      father_name: null,
      mother_name: null,
      presentation_date: null,
      religion: null,
      religion_other: null,
      has_religious_restriction: null,
      religious_restriction_notes: null,
      enrollment_status: "pendente",
      had_prior_military_service: null,
      prior_military_branch: null,
      prior_military_institution: null,
      prior_military_rank: null,
      prior_military_duration: null,
      prior_military_notes: null,
    },
    contact: null,
    address: null,
    emergency: [],
    health: null,
    logistics: null,
    vehicle: null,
  };
}

function fullBundle(): StudentProfileBundle {
  return {
    student: {
      id: "s-1",
      class_id: "c-1",
      student_number: 7,
      war_name: "SILVA",
      full_name: "Joao da Silva",
      pelotao: "CFO I",
      photo_path: null,
      situation: "matriculado",
      sex: "M",
      birth_date: "2000-01-01",
      nationality: "Brasileira",
      naturality_state: "AP",
      naturality_city: "Macapá",
      marital_status: "Solteiro",
      education_level: "Superior",
      graduation_type: "Bacharelado",
      graduation_name: "Administração",
      professional_experience: null,
      enrollment_id: "12345",
      cpf: "111.222.333-44",
      rg: "9999999",
      pis: null,
      voter_id: null,
      voter_zone: null,
      voter_section: null,
      father_name: "Pai",
      mother_name: "Mae",
      presentation_date: null,
      religion: "Outra",
      religion_other: "Espirita",
      has_religious_restriction: false,
      religious_restriction_notes: null,
      enrollment_status: "confirmada",
      had_prior_military_service: false,
      prior_military_branch: null,
      prior_military_institution: null,
      prior_military_rank: null,
      prior_military_duration: null,
      prior_military_notes: null,
    },
    contact: {
      student_id: "s-1",
      whatsapp: "11999999999",
      phone_secondary: null,
      email_personal: "a@b.com",
      email_institutional: null,
      notes: null,
    },
    address: {
      student_id: "s-1",
      street: "Rua A",
      district: "Centro",
      city: "Macapá",
      state: "AP",
      zip: "68900000",
      landmark: null,
      origin_in_amapa: true,
      from_other_state: false,
      origin_state: null,
      origin_city: null,
    },
    emergency: [
      {
        id: "e-1",
        student_id: "s-1",
        priority: 1,
        full_name: "Mae",
        relationship: "Mãe",
        phone: "11999999999",
        address: null,
        notes: null,
      },
    ],
    health: {
      student_id: "s-1",
      blood_type: "O",
      rh_factor: "+",
      altura_cm: 175,
      peso_kg: 70,
      cirurgia_ocular: false,
      cirurgia_ocular_obs: null,
      allergies: null,
      continuous_medication: null,
      chronic_disease: null,
      physical_restriction: null,
      dietary_restriction: null,
      uses_glasses: false,
      medical_notes: null,
      operational_summary: null,
      validation_status: "pendente",
      validated_at: null,
    },
    logistics: {
      student_id: "s-1",
      has_fixed_residence_macapa: true,
      course_address: null,
      needs_housing: false,
      has_family_in_ap: null,
      local_contact: null,
    },
    vehicle: {
      student_id: "s-1",
      has_vehicle: false,
      vehicle_type: null,
      vehicle_brand_model: null,
      plate: null,
      has_cnh: null,
      cnh_category: null,
      cnh_valid_until: null,
      cnh_attached: null,
      available_for_deployment: null,
      notes: null,
    },
  };
}

describe("statusFor", () => {
  it("zero filled → nao_iniciada", () => {
    expect(statusFor(0, 10)).toBe("nao_iniciada");
  });
  it("full → completa", () => {
    expect(statusFor(10, 10)).toBe("completa");
  });
  it(">=80% e <100% → quase_completa", () => {
    expect(statusFor(8, 10)).toBe("quase_completa");
    expect(statusFor(9, 10)).toBe("quase_completa");
  });
  it("entre 1% e 79% → em_preenchimento", () => {
    expect(statusFor(1, 10)).toBe("em_preenchimento");
    expect(statusFor(7, 10)).toBe("em_preenchimento");
  });
});

describe("calculateStudentProfileProgress", () => {
  it("bundle vazio devolve 0% e nao_iniciada", () => {
    const r = calculateStudentProfileProgress(emptyBundle());
    expect(r.filled).toBe(0);
    expect(r.percent).toBe(0);
    expect(r.status).toBe("nao_iniciada");
    expect(r.missing.length).toBe(r.total);
  });

  it("bundle completo devolve 100% e completa", () => {
    const r = calculateStudentProfileProgress(fullBundle());
    expect(r.filled).toBe(r.total);
    expect(r.percent).toBe(100);
    expect(r.status).toBe("completa");
    expect(r.missing).toEqual([]);
  });

  it("aceita false como preenchimento válido em campos booleanos", () => {
    const b = emptyBundle();
    b.student.has_religious_restriction = false;
    b.address = {
      student_id: "s-1",
      street: null,
      district: null,
      city: null,
      state: null,
      zip: null,
      landmark: null,
      origin_in_amapa: false,
      from_other_state: null,
      origin_state: null,
      origin_city: null,
    };
    b.logistics = {
      student_id: "s-1",
      has_fixed_residence_macapa: false,
      course_address: null,
      needs_housing: false,
      has_family_in_ap: null,
      local_contact: null,
    };
    b.vehicle = {
      student_id: "s-1",
      has_vehicle: false,
      vehicle_type: null,
      vehicle_brand_model: null,
      plate: null,
      has_cnh: null,
      cnh_category: null,
      cnh_valid_until: null,
      cnh_attached: null,
      available_for_deployment: null,
      notes: null,
    };
    b.health = {
      student_id: "s-1",
      blood_type: null,
      rh_factor: null,
      altura_cm: null,
      peso_kg: null,
      cirurgia_ocular: null,
      cirurgia_ocular_obs: null,
      allergies: null,
      continuous_medication: null,
      chronic_disease: null,
      physical_restriction: null,
      dietary_restriction: null,
      uses_glasses: false,
      medical_notes: null,
      operational_summary: null,
      validation_status: "pendente",
      validated_at: null,
    };
    const r = calculateStudentProfileProgress(b);
    // 5 booleanos false foram aceitos:
    // has_religious_restriction, origin_in_amapa, has_fixed_residence_macapa,
    // needs_housing, has_vehicle + uses_glasses → 6 campos
    expect(r.filled).toBe(6);
    expect(r.status).toBe("em_preenchimento");
  });

  it("strings em branco ou só espaços não contam", () => {
    const b = emptyBundle();
    b.student.full_name = "   ";
    b.student.war_name = "";
    const r = calculateStudentProfileProgress(b);
    expect(r.filled).toBe(0);
  });

  it("trava 100% para apenas quando todos os campos estão preenchidos", () => {
    const b = fullBundle();
    // remove um campo
    b.student.cpf = null;
    const r = calculateStudentProfileProgress(b);
    expect(r.filled).toBe(r.total - 1);
    expect(r.percent).toBeLessThan(100);
    expect(r.status).toBe("quase_completa");
    expect(r.missing).toContain("cpf");
  });

  it("REQUIRED_FIELDS não tem ids duplicados", () => {
    const ids = REQUIRED_FIELDS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("matrícula pendente não penaliza o progresso (enrollment_id excluído do total)", () => {
    const pending = fullBundle();
    pending.student.enrollment_status = "pendente";
    pending.student.enrollment_id = null;

    const confirmed = fullBundle();
    confirmed.student.enrollment_status = "confirmada";
    confirmed.student.enrollment_id = "12345";

    const rPending = calculateStudentProfileProgress(pending);
    const rConfirmed = calculateStudentProfileProgress(confirmed);

    // pendente: enrollment_id sai do total, ficha continua 100%.
    expect(rPending.status).toBe("completa");
    expect(rPending.percent).toBe(100);
    expect(rPending.total).toBe(rConfirmed.total - 1);
  });

  it("had_prior_military_service=false libera os complementares (excluídos do total)", () => {
    const yes = fullBundle();
    yes.student.had_prior_military_service = true;
    yes.student.prior_military_branch = "policia_militar";
    yes.student.prior_military_institution = "PMAP";
    yes.student.prior_military_duration = "3 anos";

    const no = fullBundle();
    no.student.had_prior_military_service = false;

    const rYes = calculateStudentProfileProgress(yes);
    const rNo = calculateStudentProfileProgress(no);

    expect(rYes.total).toBe(rNo.total + 3);
    expect(rNo.status).toBe("completa");
    expect(rYes.status).toBe("completa");
  });

  it("had_prior_military_service=true sem complementares marca missing", () => {
    const b = fullBundle();
    b.student.had_prior_military_service = true;
    b.student.prior_military_branch = null;
    b.student.prior_military_institution = null;
    b.student.prior_military_duration = null;

    const r = calculateStudentProfileProgress(b);
    expect(r.missing).toEqual(
      expect.arrayContaining([
        "prior_military_branch",
        "prior_military_institution",
        "prior_military_duration",
      ]),
    );
    expect(r.status).not.toBe("completa");
  });

  it("matrícula confirmada sem número conta como campo faltante", () => {
    const b = fullBundle();
    b.student.enrollment_status = "confirmada";
    b.student.enrollment_id = null;

    const r = calculateStudentProfileProgress(b);
    expect(r.missing).toContain("enrollment_id");
    expect(r.status).not.toBe("completa");
  });
});
