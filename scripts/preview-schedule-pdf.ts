/** Prévia local, sem banco ou persistência, do mesmo leitor e parser usados pelo job. */
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  extractSchedulePdfText,
  ScheduleExtractionError,
} from "../src/modules/schedule-repository/infrastructure/pdfText";
import {
  parseScheduleText,
  type ScheduleCadetIdentity,
} from "../src/modules/schedule-repository/domain/parser";

const MAX_BYTES = 20 * 1024 * 1024;
const host = "127.0.0.1";
const port = Number(process.env.SCHEDULE_PREVIEW_PORT || 3000);
const languages = execFileSync("tesseract", ["--list-langs"], { encoding: "utf8" });
const ocrLanguage = /^por$/m.test(languages) ? "por" : "eng";
const seed = readFileSync(resolve("supabase/seed.sql"), "utf8");
const cadets: ScheduleCadetIdentity[] = [
  ...seed.matchAll(
    /\('([0-9a-f-]{36})',\s*'[0-9a-f-]{36}',\s*'CFO I',\s*(\d+),\s*'([^']+)',\s*'((?:[^']|'')+)',\s*'((?:[^']|'')+)',\s*'[MF]'\)/g,
  ),
]
  .filter((match) => match[3] === "matriculado")
  .map((match) => ({
    id: match[1]!,
    studentNumber: Number(match[2]),
    fullName: match[4]!.replace(/''/g, "'"),
    warName: match[5]!.replace(/''/g, "'"),
  }));
if (!cadets.length) throw new Error("A lista local de cadetes não pôde ser lida do seed.");

const page = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teste local — PDF de escala</title><style>
body{font:16px system-ui,sans-serif;max-width:1050px;margin:2rem auto;padding:0 1rem;color:#202020;background:#fcfaf7}
h1{font-size:1.6rem}p{line-height:1.5}form{display:grid;gap:1rem;padding:1.2rem;border:1px solid #ddd;border-radius:10px;background:white}
label{display:grid;gap:.4rem}input,button{font:inherit;padding:.65rem;border:1px solid #bbb;border-radius:6px}button{width:max-content;background:#8b1a1f;color:white;cursor:pointer}
.card{background:#fff;border:1px solid #ddd;border-radius:10px;padding:1rem;margin:1rem 0}table{border-collapse:collapse;width:100%}th,td{padding:.5rem;border-bottom:1px solid #ddd;text-align:left;vertical-align:top}
.scroll{overflow:auto}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:480px;overflow:auto;background:#f6f6f6;padding:1rem}small{color:#555}
</style></head><body>
<h1>Teste local da extração de escalas</h1>
<p>Usa o leitor e o parser atuais com os cadetes matriculados no seed local. O PDF é analisado apenas na memória deste computador; não é publicado nem enviado ao Supabase.</p>
<form id="form"><label>Arquivo PDF (até 20 MiB)<input id="file" type="file" accept="application/pdf,.pdf" required></label>
<label>Tipo de escala / função padrão<input id="function" value="Escala de Oficial de Dia" maxlength="200" required></label>
<button type="submit">Extrair e conferir</button></form>
<p id="state" role="status"></p><div id="result"></div>
<script>
const form=document.querySelector('#form'), state=document.querySelector('#state'), result=document.querySelector('#result');
function el(tag,text){const node=document.createElement(tag);node.textContent=text;return node}
function card(title){const section=el('section','');section.className='card';section.append(el('h2',title));result.append(section);return section}
function table(parent,heads,rows){const wrap=el('div',''),t=el('table',''),head=el('tr','');wrap.className='scroll';heads.forEach(h=>head.append(el('th',h)));t.append(head);rows.forEach(row=>{const tr=el('tr','');row.forEach(value=>tr.append(el('td',String(value??'—'))));t.append(tr)});wrap.append(t);parent.append(wrap)}
form.addEventListener('submit',async event=>{
 event.preventDefault();result.replaceChildren();const file=document.querySelector('#file').files[0];if(!file)return;
 state.textContent='Lendo '+file.name+'…';const functionName=document.querySelector('#function').value;
 try{const response=await fetch('/analisar?funcao='+encodeURIComponent(functionName),{method:'POST',headers:{'content-type':'application/pdf'},body:file});
  const data=await response.json();if(!response.ok)throw new Error(data.message||'Falha na leitura.');
  state.textContent=data.pages+' página(s), '+data.text.length+' caracteres, método '+data.extractionMethod+(data.extractionMethod==='ocr'?' ('+data.ocrLanguage+')':'')+'. '+data.candidates.length+' candidato(s).';
  if(data.candidates.length){const section=card('Possíveis vínculos com cadetes');table(section,['Data','Pessoa','Função','Situação','Linha original'],data.candidates.map(c=>[c.duty_date,c.raw_name,c.duty_function,c.match_status,c.original_line]))}
  else card('Nenhum cadete identificado').append(el('p','O PDF pode conter oficiais ou outros nomes. Confira as linhas abaixo.'));
  const lines=card('Linhas extraídas');table(lines,['Nº','Conteúdo'],data.text.split(/\\r?\\n/).filter(Boolean).map((line,i)=>[i+1,line]));
  const raw=card('Texto completo');raw.append(el('pre',data.text));
  raw.append(el('small','Esta prévia não grava designações nem envia notificações.'));
 }catch(error){state.textContent=error.message||'Falha inesperada.'}
});
</script></body></html>`;

const server = createServer(async (request, response) => {
  if (request.method === "GET" && (request.url === "/teste-pdf" || request.url === "/")) {
    response.writeHead(200, {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(page);
    return;
  }
  if (request.method !== "POST" || !request.url?.startsWith("/analisar?")) {
    response.writeHead(404).end();
    return;
  }
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  try {
    if (request.headers["content-type"] !== "application/pdf") throw new Error("Selecione um PDF.");
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_BYTES) throw new Error("O arquivo excede 20 MiB.");
      chunks.push(chunk);
    }
    const bytes = Buffer.concat(chunks);
    if (bytes.subarray(0, 5).toString() !== "%PDF-") throw new Error("O arquivo não é um PDF.");
    const extracted = await extractSchedulePdfText(
      new Uint8Array(bytes),
      "auto",
      "local_tesseract",
      ocrLanguage,
    );
    const url = new URL(request.url, `http://${host}:${port}`);
    const dutyFunction = (url.searchParams.get("funcao") || "Escala").trim().slice(0, 200);
    const parsed = parseScheduleText(extracted.text, cadets, {
      referenceYear: new Date().getFullYear(),
      defaultDutyFunction: dutyFunction,
    });
    response
      .writeHead(200)
      .end(JSON.stringify({ ...extracted, ocrLanguage, candidates: parsed.candidates }));
  } catch (error) {
    const message =
      error instanceof ScheduleExtractionError
        ? `${error.code}: ${error.message}`
        : error instanceof Error
          ? error.message
          : "Falha inesperada.";
    response.writeHead(422).end(JSON.stringify({ message }));
  }
});
server.listen(port, host, () => {
  console.log(`Prévia local disponível em http://${host}:${port}/teste-pdf`);
});
