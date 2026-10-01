import { render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DiaryBoard, DiaryMural } from "./DiaryClassViews";

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: vi.fn() }));
vi.mock("../infrastructure/diaryPhotosDrive", () => ({ diaryPhotosConfigured: () => false }));
vi.mock("./DiaryPhotos", () => ({ DiaryPhotos: () => null }));
vi.mock("./DiaryControls", () => ({
  DiaryReactions: ({ canReact }: { canReact: boolean }) =>
    canReact ? <button>Aplaudir</button> : null,
  DiaryModeration: () => <button>Ocultar do mural</button>,
}));

const now = new Date().toISOString();
const entry = (id: string, status = "compartilhado", hidden_at: string | null = null) => ({
  id,
  student_id: "s1",
  status,
  hidden_at,
  summary: id,
  shared_at: now,
  featured_at: now,
  occurred_on: now.slice(0, 10),
  companion_ids: [],
  occurrence_type: "salvamento_veicular",
  occurrence_types: ["salvamento_veicular"],
  vehicles: [],
  vehicle: null,
});
let entries: ReturnType<typeof entry>[];

// Executa os filtros dos leitores reais sobre uma base que inclui dados privados e ocultos.
function query(table: string) {
  let rows: Record<string, unknown>[] =
    table === "internship_diary_entries"
      ? [...entries]
      : table === "v_student_class_basic"
        ? [{ id: "s1", war_name: "CADETE", student_number: 1 }]
        : [{ entry_id: "visivel", user_id: "coordenador", kind: "aprendi" }];
  const builder = {
    select: () => builder,
    eq: (key: string, value: unknown) => {
      rows = rows.filter((row) => row[key] === value);
      return builder;
    },
    is: (key: string, value: unknown) => {
      rows = rows.filter((row) => row[key] === value);
      return builder;
    },
    in: (key: string, values: unknown[]) => {
      rows = rows.filter((row) => values.includes(row[key]));
      return builder;
    },
    order: () => builder,
    range: (from: number, to: number) => {
      rows = rows.slice(from, to + 1);
      return builder;
    },
    limit: (limit: number) => {
      rows = rows.slice(0, limit);
      return builder;
    },
    then: (resolve: (result: { data: typeof rows; error: null }) => unknown) =>
      Promise.resolve(resolve({ data: rows, error: null })),
  };
  return builder;
}
const basePath = "/coordenacao/estagio/ocorrencias";
beforeEach(() => {
  entries = [
    entry("visivel"),
    entry("pessoal", "pessoal"),
    entry("rascunho", "rascunho"),
    entry("oculto", "compartilhado", now),
  ];
  vi.mocked(createSupabaseServerClient).mockReturnValue({ from: query } as unknown as ReturnType<
    typeof createSupabaseServerClient
  >);
});

it("mural da Coordenação só mostra compartilhados visíveis, com reação e moderação", async () => {
  render(
    await DiaryMural({
      basePath,
      studentId: null,
      userId: "coordenador",
      limit: 60,
      canModerate: true,
    }),
  );
  expect(screen.getByRole("heading", { name: "visivel" })).toBeInTheDocument();
  for (const text of ["pessoal", "rascunho", "oculto"])
    expect(screen.queryByRole("heading", { name: text })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ocultar do mural" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Aplaudir" })).toBeInTheDocument();
});

it("cadete não recebe controles de moderação nem reage ao próprio relato", async () => {
  render(
    await DiaryMural({
      basePath: "/aluno/estagio/ocorrencias",
      studentId: "s1",
      userId: "cadete",
      limit: 60,
    }),
  );
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

it("quadro só conta o mural visível e mantém filtros e destaques na área da Coordenação", async () => {
  render(await DiaryBoard({ basePath, studentId: null, wholePeriod: true, order: "registros" }));
  expect(screen.getByText(/1 relato · 1 tipo · 1 reação/)).toBeInTheDocument();
  expect(screen.queryByText(/\(você\)/)).not.toBeInTheDocument();
  expect(screen.getByLabelText("Período")).toHaveValue("tudo");
  expect(screen.getByLabelText("Período").closest("form")).toHaveAttribute("action", basePath);
  for (const link of screen.getAllByRole("link", { name: "visivel" }))
    expect(link).toHaveAttribute("href", `${basePath}?aba=mural#relato-visivel`);
  expect(screen.queryByRole("link", { name: "oculto" })).not.toBeInTheDocument();
});

it("paginação do mural permanece na área do perfil", async () => {
  render(await DiaryMural({ basePath, studentId: null, userId: "coordenador", limit: 1 }));
  expect(screen.getByRole("link", { name: "Ver relatos anteriores" })).toHaveAttribute(
    "href",
    `${basePath}?aba=mural&limite=61`,
  );
});
