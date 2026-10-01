import { describe, expect, it } from "vitest";
import {
  navigationOwner,
  NAVIGATION_MAX_AGE,
  parseNavigationSnapshot,
  restorableHref,
  type NavigationIdentity,
} from "./navigation";
import { isPublicAsset } from "./cachePolicy";

const student: NavigationIdentity = { userId: "a", role: "aluno" };
describe("restauração segura da navegação", () => {
  it("mantém aba/data e exclui texto livre, tokens e fragmentos", () => {
    expect(restorableHref("/aluno/ficha?tab=contato&q=nome&token=secret#cpf", student)).toBe(
      "/aluno/ficha?tab=contato",
    );
    expect(restorableHref("/qts?data=2026-10-01", student)).toBe("/qts?data=2026-10-01");
  });
  it.each([
    "//evil.test/aluno",
    "https://evil.test",
    "/\\evil.test",
    "/api/reports",
    "/login",
    "/avaliar-estagio/token",
    "/coordenacao/alunos/1",
    "/aluno/%2e%2e/coordenacao",
    "/aluno//ficha",
  ])("recusa destino indevido %s", (href) => {
    expect(restorableHref(href, student)).toBeNull();
  });
  it("limita delegações às seções autorizadas", () => {
    const delegated = { ...student, canManageInternship: true };
    expect(restorableHref("/coordenacao/estagio/agenda", delegated)).toBe(
      "/coordenacao/estagio/agenda",
    );
    expect(restorableHref("/coordenacao/escalas", delegated)).toBeNull();
  });
  it("recusa outra conta, permissão revogada, expiração e dados inválidos", () => {
    const now = Date.now();
    const snapshot = {
      version: 1,
      owner: navigationOwner(student),
      href: "/aluno/ficha?tab=contato",
      scrollY: 350,
      savedAt: now,
    };
    const raw = JSON.stringify(snapshot);
    expect(parseNavigationSnapshot(raw, student, now)).toEqual(snapshot);
    expect(parseNavigationSnapshot(raw, { ...student, userId: "b" }, now)).toBeNull();
    expect(parseNavigationSnapshot(raw, { ...student, canManageInternship: true }, now)).toBeNull();
    expect(parseNavigationSnapshot(raw, student, now + NAVIGATION_MAX_AGE + 1)).toBeNull();
    for (const patch of [
      { scrollY: -1 },
      { savedAt: now + 90_000 },
      { href: "/aluno?q=private" },
      { version: 2 },
    ]) {
      expect(
        parseNavigationSnapshot(JSON.stringify({ ...snapshot, ...patch }), student, now),
      ).toBeNull();
    }
    expect(parseNavigationSnapshot("{", student)).toBeNull();
  });
});

describe("cache público do PWA", () => {
  const origin = "https://cfo.test";
  it.each([
    "/_next/static/chunks/a.js",
    "/icons/icon-192.png",
    "/brasao-abm-256.png",
    "/_next/image?url=%2Fbrasao-abm-256.png&w=32&q=75",
  ])("permite %s", (path) => {
    expect(isPublicAsset(new URL(path, origin), origin)).toBe(true);
  });
  it.each([
    "/aluno",
    "/api/reports/alunos",
    "/foto.png?token=secret",
    "/icons/icon-192.png?token=x",
    "/_next/image?url=https%3A%2F%2Fprivate.supabase.co%2Fphoto.png",
    "https://private.supabase.co/photo.png",
    "https://other.test/_next/static/a.js",
  ])("não armazena %s", (path) => {
    expect(isPublicAsset(new URL(path, origin), origin)).toBe(false);
  });
});
