import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { requireRole } from "@/components/app/RoleGuard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CoordinationDiaryPage from "./page";

vi.mock("@/components/app/RoleGuard", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("@/modules/internship-management/infrastructure/diaryPhotosDrive", () => ({
  diaryPhotosConfigured: () => false,
}));
vi.mock("@/modules/internship-management/presentation/DiaryControls", () => ({
  DiaryModeration: () => null,
  DiaryReactions: () => null,
}));
vi.mock("@/modules/internship-management/presentation/DiaryEntryCard", () => ({
  DiaryEntryCard: () => null,
}));
vi.mock("@/modules/internship-management/presentation/DiaryClassViews", () => ({
  DiaryMural: ({ userId, canModerate }: { userId: string; canModerate: boolean }) => (
    <p>
      Mural: {userId} {canModerate ? "com moderação" : ""}
    </p>
  ),
  DiaryBoard: () => <p>Conteúdo do quadro</p>,
}));
beforeEach(() => vi.clearAllMocks());

it.each(["coordenador-a", "coordenador-b"])(
  "%s acessa mural sem vínculo de aluno ou delegação",
  async (userId) => {
    vi.mocked(requireRole).mockResolvedValue({
      userId,
      role: "coordenacao",
      studentId: null,
    } as Awaited<ReturnType<typeof requireRole>>);
    render(await CoordinationDiaryPage({ searchParams: { aba: "mural" } }));
    expect(requireRole).toHaveBeenCalledWith("coordenacao");
    expect(screen.getByText(`Mural: ${userId} com moderação`)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Mural da turma" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("link", { name: "Quadro da turma" })).toHaveAttribute(
      "href",
      "/coordenacao/estagio/ocorrencias?aba=quadro",
    );
    expect(screen.getByRole("link", { name: "Registros salvos" })).toHaveAttribute(
      "href",
      "/coordenacao/estagio/ocorrencias",
    );
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
  },
);

it("abre o quadro com as mesmas abas da Coordenação", async () => {
  vi.mocked(requireRole).mockResolvedValue({
    userId: "coordenador",
    role: "coordenacao",
    studentId: null,
  } as Awaited<ReturnType<typeof requireRole>>);
  render(await CoordinationDiaryPage({ searchParams: { aba: "quadro" } }));
  expect(screen.getByText("Conteúdo do quadro")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Quadro da turma" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
