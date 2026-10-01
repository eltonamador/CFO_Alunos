/**
 * Configuração local, uma única vez. Uso:
 * node scripts/authorize-diary-drive.mjs /caminho/client_secret.json conta@exemplo.com
 * O arquivo gerado é ignorado pelo Git e não ativa o recurso na Vercel.
 */
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const [credentialsPath, expectedEmail] = process.argv.slice(2);
if (!credentialsPath || !expectedEmail) {
  console.error("Uso: node scripts/authorize-diary-drive.mjs <client_secret.json> <email-da-conta-Google>");
  process.exit(1);
}

const credentials = JSON.parse(await readFile(resolve(credentialsPath), "utf8")).installed;
if (!credentials?.client_id || !credentials?.client_secret)
  throw new Error("Baixe um cliente OAuth do tipo Aplicativo para computador no Google Cloud.");

const state = randomBytes(24).toString("hex");
let finish;
const callback = new Promise((resolveCallback, rejectCallback) => {
  finish = { resolve: resolveCallback, reject: rejectCallback };
});
const server = createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    response.writeHead(400).end("Autorização inválida. Pode fechar esta aba.");
    finish.reject(new Error("Retorno OAuth inválido ou autorização recusada."));
    return;
  }
  response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" })
    .end("Conta conectada. Volte ao terminal para concluir.");
  finish.resolve(url.searchParams.get("code"));
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const port = server.address().port;
const redirectUri = `http://127.0.0.1:${port}`;
const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
authorize.search = new URLSearchParams({
  client_id: credentials.client_id,
  redirect_uri: redirectUri,
  response_type: "code",
  scope: "https://www.googleapis.com/auth/drive.file",
  access_type: "offline",
  prompt: "consent",
  state,
}).toString();
console.log(`Abra a autorização com a conta ${expectedEmail}:\n${authorize}`);
execFile("open", [authorize.toString()], () => {});

let code;
let timeoutId;
try {
  code = await Promise.race([
    callback,
    new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error("Autorização expirou em 5 minutos.")), 300_000);
    }),
  ]);
} finally {
  clearTimeout(timeoutId);
  server.close();
}

const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    code,
    client_id: credentials.client_id,
    client_secret: credentials.client_secret,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  }),
});
if (!tokenResponse.ok) throw new Error(`Falha ao autorizar: HTTP ${tokenResponse.status}`);
const token = await tokenResponse.json();
if (!token.refresh_token || !token.access_token) throw new Error("Google não retornou refresh token.");
const headers = { Authorization: `Bearer ${token.access_token}` };
const about = await fetch("https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)", { headers });
if (!about.ok) throw new Error(`Não foi possível identificar a conta: HTTP ${about.status}`);
const account = await about.json();
if (account.user?.emailAddress?.toLowerCase() !== expectedEmail.toLowerCase())
  throw new Error("A conta selecionada não é a conta esperada; nenhuma pasta foi criada.");

const folderResponse = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name", {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify({ name: "CFO Alunos - fotos do diário", mimeType: "application/vnd.google-apps.folder" }),
});
if (!folderResponse.ok) throw new Error(`Não foi possível criar a pasta privada: HTTP ${folderResponse.status}`);
const folder = await folderResponse.json();
if (!folder.id) throw new Error("Google não retornou o ID da pasta.");

const destination = resolve(".env.diary-photos.local");
const variables = {
  DIARY_PHOTOS_ENABLED: "true",
  DIARY_PHOTOS_DRIVE_FOLDER_ID: folder.id,
  DIARY_PHOTOS_GOOGLE_CLIENT_ID: credentials.client_id,
  DIARY_PHOTOS_GOOGLE_CLIENT_SECRET: credentials.client_secret,
  DIARY_PHOTOS_GOOGLE_REFRESH_TOKEN: token.refresh_token,
  DIARY_PHOTOS_GOOGLE_EMAIL: expectedEmail,
};
await writeFile(destination, Object.entries(variables).map(([key, value]) => {
  if (/[\r\n]/.test(value)) throw new Error(`Valor inválido para ${key}`);
  return `${key}=${value}`;
}).join("\n") + "\n", { mode: 0o600, flag: "wx" });
console.log(`Pasta privada criada: https://drive.google.com/drive/folders/${folder.id}`);
console.log(`Credenciais guardadas em ${destination}. Mova esta pasta para dentro da pasta de teste restrita; só depois configure as variáveis na Vercel.`);
