import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBirthdayAlerts,
  type BirthdayAlert,
  type BirthdayStudent,
} from "@/modules/student-profile/domain/birthdayAlerts";

interface BirthdayStudentRow {
  id: string;
  full_name: string;
  birth_date: string | null;
}

/**
 * Consulta apenas os campos necessários. A chamada respeita a sessão e as
 * políticas RLS; o layout só a executa para Coordenação e Secretaria.
 */
export const getAdministrativeBirthdayAlerts = cache(async (): Promise<BirthdayAlert[]> => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, birth_date")
    .is("deleted_at", null);

  if (error) {
    console.error("Error fetching birthday alerts:", error);
    return [];
  }

  const students: BirthdayStudent[] = ((data ?? []) as BirthdayStudentRow[]).map((student) => ({
    id: student.id,
    fullName: student.full_name,
    birthDate: student.birth_date,
  }));

  return getBirthdayAlerts(students);
});
