/** Prévia local auditável da escala 065; não conecta ao banco nem publica. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { extractOfficerSchedulePdf } from "../src/modules/schedule-repository/infrastructure/officerPdf";
import type { DutyOverview } from "../src/modules/schedule-repository/domain/roster";

async function main() {
  const source = process.argv[2];
  if (!source) throw new Error("Informe o caminho do PDF original da escala 065/2026.");
  const bytes = readFileSync(source);
  const entries = await extractOfficerSchedulePdf(new Uint8Array(bytes), []);
  // Transcrição conferida visualmente na página 1, independente da extração.
  const expected = [
    ["2026-09-29", "CAP TRAJANO", "CAP JOSIANE", "TEN HELLEN"],
    ["2026-09-30", "CAP NAHUM", "MAJ MÁRCIO COSTA", "TEN DIONÍSIO"],
    ["2026-10-01", "CAP JOSIANE", "CAP NAHUM", "TEN JOYCE"],
    ["2026-10-02", "TEN CECÍLIA", "CAP TRAJANO", "CAP LADISLAU"],
    ["2026-10-03", "CAP NAHUM", "CAP CAVALCANTE"],
    ["2026-10-04", "CAP TRAJANO", "CAP DIEGO"],
    ["2026-10-05", "CAP JOSIANE", "MAJ MÁRCIO COSTA", "MAJ LUANA"],
  ];
  assert.equal(entries.length, 19);
  for (const [date, ...names] of expected) {
    const rows = entries.filter((row) => row.duty_date === date);
    assert.deepEqual(rows.map((row) => row.display_name), names);
    assert.deepEqual(rows.map((row) => [row.shift, row.starts_at, row.ends_at]), names.length === 2
      ? [["diurno", "07:00", "19:00"], ["noturno", "19:00", "07:00"]]
      : [["manha", "07:00", "13:00"], ["tarde", "13:00", "19:00"], ["noite", "19:00", "07:00"]]);
    for (const row of rows) assert.equal(row.duty_function, row.display_name.startsWith("MAJ ") ? "Superior de dia" : "Oficial de dia");
  }
  assert.equal(entries.filter((row) => row.duty_function === "Superior de dia").length, 3);
  const out = resolve("output/escala-065-revisao");
  mkdirSync(out, { recursive: true });
  writeFileSync(`${out}/original.pdf`, bytes);
  const draft = {
    status: "aguardando_avaliacao", published: false, source: resolve(source),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    periodStart: "2026-09-29", periodEnd: "2026-10-05", method: "native_text",
    verification: "19 serviços conferidos com a imagem do PDF; postos, nomes, datas e horários validados. Perfis serão associados pelo cadastro na importação aprovada.",
    entries,
    importRows: entries.map((e) => ({ kind: "officer", person: e.display_name, studentId: "", profileId: "", date: e.duty_date, dutyFunction: e.duty_function, shift: e.shift, startsAt: e.starts_at, endsAt: e.ends_at, sourceLine: e.source_line })),
  };
  writeFileSync(`${out}/escala-065-conferida.json`, JSON.stringify(draft, null, 2));
  execFileSync(process.execPath, ["node_modules/tailwindcss/lib/cli.js", "-i", "src/app/globals.css", "-o", `${out}/styles.css`, "--minify"], { stdio: "pipe" });
  // A prévia renderiza o componente real da página inicial, sem sessão/banco.
  (globalThis as unknown as { React: typeof React }).React = React;
  const { TodayTomorrowDuty } = await import("../src/components/app/schedules/TodayTomorrowDuty");
  const labels: Record<string, string> = { manha: "Manhã", tarde: "Tarde", noite: "Noite", diurno: "Diurno", noturno: "Noturno" };
  const roster = entries.map((e) => ({ id: `065-${e.sequence}`, kind: "officer" as const, person: e.display_name, date: e.duty_date, duty: `${e.duty_function} · ${labels[e.shift]} ${e.starts_at}–${e.ends_at}`, mine: false }));
  const previews = expected.map(([date], index) => {
    const tomorrow = new Date(`${date}T12:00:00Z`); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const overview: DutyOverview = { today: date!, tomorrow: tomorrow.toISOString().slice(0, 10), firstGroup: "officer", entries: roster, unavailable: false };
    return `<div class="preview" data-date="${date}" ${index ? "hidden" : ""}>${renderToStaticMarkup(React.createElement(TodayTomorrowDuty, { overview }))}</div>`;
  }).join("");
  const br = (s: string) => s.split("-").reverse().join("/");
  const rows = entries.map((e) => `<tr><td>${br(e.duty_date)}</td><td>${labels[e.shift]}</td><td>${e.starts_at}–${e.ends_at}${e.ends_at < e.starts_at ? " (+1 dia)" : ""}</td><td>${e.display_name}</td><td>${e.duty_function}</td></tr>`).join("");
  const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>CFO Alunos · Escala 065 para avaliação</title><link rel="stylesheet" href="styles.css"><style>body{font-family:Arial,sans-serif}main{max-width:1180px;margin:auto;padding:28px 20px}header{border-bottom:3px solid #8b1a1f;margin-bottom:24px;padding-bottom:18px}h1{font-size:26px;font-weight:700;margin:10px 0}.badge{color:#854d0e;background:#fef3c7;border-radius:18px;padding:6px 12px;font-size:13px}.note{color:#5a564a;font-size:14px;margin:12px 0}.controls{margin:20px 0;display:flex;gap:12px;align-items:center;flex-wrap:wrap}select{border:1px solid #bbb;border-radius:8px;padding:8px;background:white}.table-wrap{overflow:auto;margin-top:14px}table{width:100%;border-collapse:collapse;background:white;font-size:14px}th,td{text-align:left;padding:12px;border-bottom:1px solid #ddd;white-space:nowrap}th{background:#f1ecdf}h2.full{margin-top:28px;font-size:21px;font-weight:bold}a.source{color:#8b1a1f;text-decoration:underline}.preview a{pointer-events:none;opacity:.5}@media(max-width:600px){main{padding:20px 12px}h1{font-size:23px}}</style><main><header><p class="section-eyebrow">CFO Alunos · Academia Bombeiro Militar</p><h1>Escala 065/2026</h1><span class="badge">Aguardando avaliação · Não publicada</span><p class="note">29/09 a 05/10/2026 · 19 serviços conferidos · 16 de oficial de dia e 3 de superior de dia</p></header><p>Major: <strong>Superior de dia</strong>. Capitão ou tenente: <strong>Oficial de dia</strong>.</p><div class="controls"><label for="day">Simular a data da consulta rápida:</label><select id="day">${expected.map(([d]) => `<option value="${d}">${br(d!)}</option>`).join("")}</select></div>${previews}<p class="note">Prévia local do componente da página inicial, contendo apenas os oficiais desta escala. A data acima é uma simulação para avaliação. Os turnos noturnos terminam às 07h do dia seguinte.</p><h2 class="full">Conferência completa</h2><p class="note">Texto nativo comparado com as duas páginas do PDF. Nomes, acentos, postos, dias da semana e horários conferidos.</p><div class="table-wrap"><table><thead><tr><th>Data</th><th>Turno</th><th>Horário</th><th>Militar</th><th>Função</th></tr></thead><tbody>${rows}</tbody></table></div><p class="note"><a class="source" href="original.pdf">Abrir PDF original</a> · <a class="source" href="escala-065-conferida.json">Dados conferidos para incorporação</a></p></main><script>document.getElementById('day').addEventListener('change',e=>{document.querySelectorAll('.preview').forEach(p=>p.hidden=p.dataset.date!==e.target.value)})</script></html>`;
  writeFileSync(`${out}/index.html`, html);
  console.log(JSON.stringify({ output: out, verified: entries.length, superiors: 3, published: false }));
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
