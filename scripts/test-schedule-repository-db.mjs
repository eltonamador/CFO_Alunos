/**
 * PostgreSQL WASM descartável para validar a migration do repositório.
 * Reutiliza o runtime isolado do módulo acadêmico quando disponível.
 * Storage fica fora deste teste porque o PGlite não fornece storage.objects.
 */
import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const runtime = process.env.CFO_SCHEDULE_RUNTIME ?? "/private/tmp/cfo-academic-db-runtime";
const requireRuntime = createRequire(join(runtime, "package.json"));
async function dependency(name) {
  return import(pathToFileURL(requireRuntime.resolve(name)).href);
}
const { PGlite } = await dependency("@electric-sql/pglite");
const { pgtap } = await dependency("@electric-sql/pglite-pgtap");
const { pgcrypto } = await dependency("@electric-sql/pglite/contrib/pgcrypto");
const { uuid_ossp } = await dependency("@electric-sql/pglite/contrib/uuid_ossp");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite({ extensions: { pgtap, pgcrypto, uuid_ossp } });
let failed = false;

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create schema extensions;
    create schema storage;
    create table auth.users(id uuid primary key, email text);
    create table storage.buckets(
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects(
      id uuid primary key default gen_random_uuid(), bucket_id text not null,
      name text not null, owner_id text, unique(bucket_id, name)
    );
    alter table storage.objects enable row level security;
    create function auth.uid() returns uuid language sql stable as $$
      select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
    $$;
    grant usage on schema public, auth, extensions to anon, authenticated, service_role;
    grant usage on schema storage to authenticated, service_role;
    grant all on storage.buckets, storage.objects to service_role;
    grant select, insert on storage.objects to authenticated;
    grant execute on function auth.uid() to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    set search_path = public, extensions;
  `);
  const migrationDirectory = join(root, "supabase", "migrations");
  const migrations = (await readdir(migrationDirectory)).sort();
  const selected = migrations.filter((name) => {
    const number = Number(name.slice(0, 4));
    return (number >= 1 && number <= 12) || number === 14 || (number >= 40 && number <= 45);
  });
  for (const name of selected) {
    await db.exec(await readFile(join(migrationDirectory, name), "utf8"));
    process.stdout.write(`Migration OK: ${name}\n`);
  }
  const results = await db.exec(
    await readFile(join(root, "supabase", "tests", "schedule_repository.test.sql"), "utf8"),
  );
  let assertions = 0;
  for (const result of results) {
    for (const row of result.rows ?? []) {
      for (const value of Object.values(row)) {
        if (typeof value !== "string") continue;
        if (/^(?:not )?ok \d+|^1\.\.|^#/.test(value)) {
          process.stdout.write(`${value}\n`);
          if (/^(?:not )?ok \d+/.test(value)) assertions += 1;
          if (/^not ok|^# Looks like/.test(value)) failed = true;
        }
      }
    }
  }
  if (!assertions) throw new Error("Nenhuma asserção pgTAP foi executada.");
  process.stdout.write(`pgTAP: ${assertions} verificações; ${failed ? "FALHA" : "sucesso"}.\n`);
} catch (error) {
  failed = true;
  process.stderr.write(`Falha no banco de escalas isolado: ${error.message}\n`);
  if (error.detail) process.stderr.write(`${error.detail}\n`);
  if (error.where) process.stderr.write(`${error.where}\n`);
} finally {
  await db.close();
}
if (failed) process.exitCode = 1;
