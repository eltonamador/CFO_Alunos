import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const json = (value: unknown) => new Response(JSON.stringify(value), {
  status: 200,
  headers: { "Content-Type": "application/json" },
});

describe("acesso à pasta de fotos", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("DIARY_PHOTOS_ENABLED", "true");
    vi.stubEnv("DIARY_PHOTOS_DRIVE_FOLDER_ID", "root-folder");
    vi.stubEnv("DIARY_PHOTOS_GOOGLE_CLIENT_ID", "client");
    vi.stubEnv("DIARY_PHOTOS_GOOGLE_CLIENT_SECRET", "secret");
    vi.stubEnv("DIARY_PHOTOS_GOOGLE_REFRESH_TOKEN", "refresh");
    vi.stubEnv("DIARY_PHOTOS_GOOGLE_EMAIL", "owner@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("bloqueia a consulta se o Drive permitir acesso por link", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("oauth2.googleapis.com")) return json({ access_token: "token" });
      if (url.includes("/about?")) return json({ user: { emailAddress: "owner@example.com" } });
      if (url.includes("/permissions?")) return json({ permissions: [{ type: "user" }, { type: "anyone" }] });
      return json({ mimeType: "application/vnd.google-apps.folder", capabilities: { canAddChildren: true } });
    });
    vi.stubGlobal("fetch", fetcher);
    const { listDiaryPhotos } = await import("./diaryPhotosDrive");
    await expect(listDiaryPhotos("entry-id")).rejects.toThrow("acesso externo");
    expect(fetcher.mock.calls.some(([url]) => url.includes("/files?q="))).toBe(false);
  });

  it("bloqueia a conta Google errada antes de acessar arquivos", async () => {
    const fetcher = vi.fn(async (url: string) => {
      if (url.includes("oauth2.googleapis.com")) return json({ access_token: "token" });
      if (url.includes("/about?")) return json({ user: { emailAddress: "other@example.com" } });
      return json({ mimeType: "application/vnd.google-apps.folder", capabilities: { canAddChildren: true } });
    });
    vi.stubGlobal("fetch", fetcher);
    const { listDiaryPhotos } = await import("./diaryPhotosDrive");
    await expect(listDiaryPhotos("entry-id")).rejects.toThrow("Conta Google");
  });
});
