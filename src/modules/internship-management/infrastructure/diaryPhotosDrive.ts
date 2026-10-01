import { randomUUID } from "node:crypto";

const DRIVE = "https://www.googleapis.com/drive/v3";
const FOLDER = "application/vnd.google-apps.folder";
const MAX_PHOTOS = 3;

type Config = {
  folderId: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  expectedEmail: string;
};

export type DiaryPhoto = { id: string; name: string };

export function diaryPhotosConfigured() {
  return Boolean(config());
}

function config(): Config | null {
  if (process.env.DIARY_PHOTOS_ENABLED !== "true") return null;
  const folderId = process.env.DIARY_PHOTOS_DRIVE_FOLDER_ID;
  const clientId = process.env.DIARY_PHOTOS_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.DIARY_PHOTOS_GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.DIARY_PHOTOS_GOOGLE_REFRESH_TOKEN;
  const expectedEmail = process.env.DIARY_PHOTOS_GOOGLE_EMAIL;
  if (!folderId || !clientId || !clientSecret || !refreshToken || !expectedEmail) return null;
  return { folderId, clientId, clientSecret, refreshToken, expectedEmail };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function token(cfg: Config): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      refresh_token: cfg.refreshToken,
      grant_type: "refresh_token",
    }),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Drive OAuth: ${response.status}`);
  const data = (await response.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Drive OAuth: token ausente");
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + Math.max(60, data.expires_in ?? 3600) * 1000,
  };
  return data.access_token;
}

async function drive(cfg: Config, path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(path.startsWith("https://") ? path : `${DRIVE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${await token(cfg)}`, ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Drive API: ${response.status}`);
  return response;
}

let checkedUntil = 0;
let checkedWrite = false;

/** Recusa a pasta de teste enquanto ela permitir leitura por link. */
async function checkedConfig(requireWrite = false): Promise<Config> {
  const cfg = config();
  if (!cfg) throw new Error("Fotos do diário não configuradas");
  if (checkedUntil > Date.now()) {
    if (requireWrite && !checkedWrite) throw new Error("Pasta do diário sem permissão de escrita");
    return cfg;
  }
  const [about, folder] = await Promise.all([
    drive(cfg, "/about?fields=user(emailAddress)"),
    drive(cfg, `/files/${encodeURIComponent(cfg.folderId)}?fields=id,mimeType,trashed,capabilities(canAddChildren)&supportsAllDrives=true`),
  ]);
  const account = (await about.json()) as { user?: { emailAddress?: string } };
  const root = (await folder.json()) as {
    mimeType?: string;
    trashed?: boolean;
    capabilities?: { canAddChildren?: boolean };
  };
  if (account.user?.emailAddress?.toLowerCase() !== cfg.expectedEmail.toLowerCase())
    throw new Error("Conta Google do diário não corresponde à configuração");
  if (root.mimeType !== FOLDER || root.trashed)
    throw new Error("Pasta do diário indisponível");
  let page = "";
  do {
    const response = await drive(cfg, `/files/${encodeURIComponent(cfg.folderId)}/permissions?fields=permissions(type),nextPageToken&pageSize=100&supportsAllDrives=true${page ? `&pageToken=${encodeURIComponent(page)}` : ""}`);
    const access = (await response.json()) as { permissions?: { type: string }[]; nextPageToken?: string };
    if (!access.permissions || access.permissions.some((permission) => ["anyone", "domain"].includes(permission.type)))
      throw new Error("Pasta do diário permite acesso externo");
    page = access.nextPageToken ?? "";
  } while (page);
  checkedWrite = root.capabilities?.canAddChildren === true;
  checkedUntil = Date.now() + 60_000;
  if (requireWrite && !checkedWrite) throw new Error("Pasta do diário sem permissão de escrita");
  return cfg;
}

function escaped(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

async function entryFolder(cfg: Config, entryId: string, create: boolean) {
  const q = encodeURIComponent(
    `'${escaped(cfg.folderId)}' in parents and name = '${escaped(entryId)}' and mimeType = '${FOLDER}' and appProperties has { key='cfo_diary_entry' and value='${escaped(entryId)}' } and trashed = false`,
  );
  const response = await drive(cfg, `/files?q=${q}&fields=files(id,name)&pageSize=10&supportsAllDrives=true&includeItemsFromAllDrives=true`);
  const data = (await response.json()) as { files?: { id: string }[] };
  if (data.files?.length) return data.files[0]!.id;
  if (!create) return null;
  const created = await drive(cfg, "/files?fields=id&supportsAllDrives=true", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: entryId, mimeType: FOLDER, parents: [cfg.folderId], appProperties: { cfo_diary_entry: entryId } }),
  });
  return ((await created.json()) as { id: string }).id;
}

async function files(cfg: Config, folderId: string): Promise<DiaryPhoto[]> {
  const q = encodeURIComponent(`'${escaped(folderId)}' in parents and trashed = false`);
  const response = await drive(cfg, `/files?q=${q}&fields=files(id,name,mimeType),nextPageToken&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`);
  const data = (await response.json()) as { files?: { id: string; name: string; mimeType: string }[] };
  return (data.files ?? [])
    .filter((file) => file.mimeType === "image/jpeg")
    .map(({ id, name }) => ({ id, name }));
}

export async function listDiaryPhotos(entryId: string): Promise<DiaryPhoto[]> {
  const cfg = await checkedConfig();
  const folderId = await entryFolder(cfg, entryId, false);
  return folderId ? files(cfg, folderId) : [];
}

export async function uploadDiaryPhoto(entryId: string, bytes: Uint8Array): Promise<DiaryPhoto> {
  const cfg = await checkedConfig(true);
  const folderId = await entryFolder(cfg, entryId, true);
  if (!folderId) throw new Error("Pasta do relato indisponível");
  if ((await files(cfg, folderId)).length >= MAX_PHOTOS)
    throw new RangeError("Limite de três fotos por relato");
  const name = `${randomUUID()}.jpg`;
  const boundary = `cfo-${randomUUID()}`;
  const header = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, mimeType: "image/jpeg", parents: [folderId] })}\r\n--${boundary}\r\nContent-Type: image/jpeg\r\n\r\n`,
  );
  const body = Buffer.concat([header, Buffer.from(bytes), Buffer.from(`\r\n--${boundary}--`)]);
  const response = await drive(cfg, "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name&supportsAllDrives=true", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  const photo = (await response.json()) as DiaryPhoto;
  if (!photo.id) throw new Error("Drive não confirmou o envio");
  return photo;
}

async function checkedPhoto(cfg: Config, entryId: string, photoId: string) {
  const folderId = await entryFolder(cfg, entryId, false);
  if (!folderId) return false;
  const response = await drive(cfg, `/files/${encodeURIComponent(photoId)}?fields=id,mimeType,parents,trashed&supportsAllDrives=true`);
  const file = (await response.json()) as { mimeType?: string; parents?: string[]; trashed?: boolean };
  return !file.trashed && file.mimeType === "image/jpeg" && file.parents?.includes(folderId);
}

export async function readDiaryPhoto(entryId: string, photoId: string): Promise<Uint8Array | null> {
  const cfg = await checkedConfig();
  if (!(await checkedPhoto(cfg, entryId, photoId))) return null;
  const response = await drive(cfg, `/files/${encodeURIComponent(photoId)}?alt=media&supportsAllDrives=true`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function deleteDiaryPhoto(entryId: string, photoId: string): Promise<boolean> {
  const cfg = await checkedConfig(true);
  if (!(await checkedPhoto(cfg, entryId, photoId))) return false;
  await drive(cfg, `/files/${encodeURIComponent(photoId)}?supportsAllDrives=true`, { method: "DELETE" });
  return true;
}

export async function deleteDiaryPhotoFolder(entryId: string): Promise<void> {
  const cfg = await checkedConfig(true);
  const folderId = await entryFolder(cfg, entryId, false);
  if (folderId) await drive(cfg, `/files/${encodeURIComponent(folderId)}?supportsAllDrives=true`, { method: "DELETE" });
}
