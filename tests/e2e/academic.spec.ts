import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loginAs } from "./helpers/auth";

const DISCIPLINE = "História do Corpo de Bombeiros Militar do Amapá";
const ASSESSMENT = "Homologação automatizada";

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

async function findOffering(code: string, academicYear: number) {
  const { data: discipline, error: disciplineError } = await admin
    .from("academic_disciplines")
    .select("id")
    .eq("code", code)
    .single();
  if (disciplineError) throw disciplineError;
  const { data, error } = await admin
    .from("academic_offerings")
    .select("id")
    .eq("discipline_id", discipline.id)
    .eq("academic_year", academicYear)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function hasEnrollment(offeringId: string) {
  const { count, error } = await admin
    .from("academic_enrollments")
    .select("id", { count: "exact", head: true })
    .eq("offering_id", offeringId)
    .eq("student_id", "33333333-3333-3333-3333-333333333308");
  if (error) throw error;
  return count === 1;
}

async function hasAssessment(offeringId: string) {
  const { count, error } = await admin
    .from("academic_assessments")
    .select("id", { count: "exact", head: true })
    .eq("offering_id", offeringId)
    .eq("kind", "VC")
    .eq("sequence", 1);
  if (error) throw error;
  return count === 1;
}

test.describe("Gestão acadêmica", () => {
  test("coordenação percorre oferta, matrícula, avaliação, nota e auditoria", async ({ page }) => {
    await loginAs(page, "coordenacao");
    await page.goto("/coordenacao/academico?fase=1");

    await expect(page.getByRole("heading", { name: "Disciplinas e notas" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "CFO I", exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    let offeringId = await findOffering("CFO1-02", 2199);
    if (!offeringId) {
      await page.locator("summary").filter({ hasText: "Criar oferta para a turma" }).click();
      const form = page
        .locator('input[name="operation"][value="create_offering"]')
        .locator("..");
      await form.locator('select[name="class_id"]').selectOption({ index: 1 });
      await form
        .locator('select[name="discipline_id"]')
        .selectOption({ label: `CFO I · ${DISCIPLINE}` });
      await form.locator('input[name="academic_year"]').fill("2199");
      await form.getByRole("button", { name: "Criar oferta" }).click();
      await expect.poll(() => findOffering("CFO1-02", 2199)).not.toBeNull();
      offeringId = await findOffering("CFO1-02", 2199);
    }
    expect(offeringId).toBeTruthy();

    await page.goto(`/coordenacao/academico/${offeringId}`);
    await expect(page.getByRole("heading", { name: DISCIPLINE })).toBeVisible();
    await expect(page.getByText(/Política:/)).toBeVisible();

    if ((await page.getByRole("heading", { name: /PABLO — 08/ }).count()) === 0) {
      await page.locator("summary").filter({ hasText: "Matricular cadete na disciplina" }).click();
      const form = page.locator('input[name="operation"][value="enroll"]').locator("..");
      await form.locator('select[name="student_id"]').selectOption({ label: "PABLO — 08" });
      await form.getByRole("button", { name: "Matricular cadete" }).click();
      await expect.poll(() => hasEnrollment(offeringId!)).toBe(true);
      await page.goto(`/coordenacao/academico/${offeringId}`);
    }

    if ((await page.getByText(`VC 1 · ${ASSESSMENT}`, { exact: true }).count()) === 0) {
      await page.locator("summary").filter({ hasText: "Cadastrar avaliação" }).click();
      const form = page
        .locator('input[name="operation"][value="create_assessment"]')
        .locator("..");
      await form.locator('input[name="sequence"]').fill("1");
      await form.locator('input[name="title"]').fill(ASSESSMENT);
      await form.locator('input[name="held_on"]').fill("2026-09-10");
      await form.getByRole("button", { name: "Cadastrar avaliação" }).click();
      await expect.poll(() => hasAssessment(offeringId!)).toBe(true);
      await page.goto(`/coordenacao/academico/${offeringId}`);
    }

    const grade = page.getByLabel(/Nota de PABLO — 08/);
    const isCorrection = await page.getByRole("button", { name: "Retificar nota" }).isVisible();
    await grade.fill(isCorrection ? "8.25" : "7.50");
    if (isCorrection) {
      await page.getByLabel("Motivo da retificação").fill("Reexecução da homologação automatizada");
    }
    const expectedGrade = isCorrection ? "8,25" : "7,50";
    await page.getByRole("button", { name: isCorrection ? "Retificar nota" : "Salvar nota" }).click();
    await expect(page.getByRole("cell", { name: expectedGrade })).toBeVisible({ timeout: 10000 });

    await page.getByRole("tab", { name: "Histórico" }).click();
    await expect(page.getByRole("heading", { name: "Histórico de alterações" })).toBeVisible();
    await expect(page.getByText(/Nota · (Cadastro|Alteração)/).first()).toBeVisible();
  });

  test("oferta CFO1-09/2026 aplica Portaria 550 e política RI revisada", async ({ page }) => {
    await loginAs(page, "coordenacao");
    await page.goto("/coordenacao/academico?fase=1");

    const discipline = "Legislação Bombeiro Militar";
    let offeringId = await findOffering("CFO1-09", 2026);
    if (!offeringId) {
      await page.locator("summary").filter({ hasText: "Criar oferta para a turma" }).click();
      const form = page
        .locator('input[name="operation"][value="create_offering"]')
        .locator("..");
      await form.locator('select[name="class_id"]').selectOption({ index: 1 });
      await form
        .locator('select[name="discipline_id"]')
        .selectOption({ label: `CFO I · ${discipline}` });
      await expect(form.locator('input[name="workload_hours"]')).toHaveValue("38");
      await expect(form.locator('input[name="vc_count"]')).toHaveValue("2");
      await form.getByRole("button", { name: "Criar oferta" }).click();
      await expect.poll(() => findOffering("CFO1-09", 2026)).not.toBeNull();
      offeringId = await findOffering("CFO1-09", 2026);
    }
    expect(offeringId).toBeTruthy();

    await page.goto(`/coordenacao/academico/${offeringId}`);
    await expect(page.getByText(/2026 · 38 h\/a · 2 verificação/)).toBeVisible();
    await page.getByRole("tab", { name: "Regras e fontes" }).click();
    await expect(page.getByText(/CH divergente: matriz 30 h\/a × ementário 38 h\/a/)).toBeVisible();
    const vfRule = page.locator("dt").filter({ hasText: "Média mínima para VF" }).locator("..");
    await expect(vfRule.getByText("5", { exact: true })).toBeVisible();
    await expect(page.getByText("Sem desconto de faltas na nota")).toBeVisible();
  });
});
