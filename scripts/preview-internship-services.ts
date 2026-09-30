import { mkdirSync, writeFileSync } from "node:fs";
import { buildOperationalInternshipPDF } from "../src/lib/reports/internship-operational-pdf";
async function run() {
  mkdirSync("tmp/pdfs",{recursive:true});
  const rows = Array.from({length:64},(_,i)=>({shiftId:String(i), studentNumber:i+1,warName:`CADETE TESTE ${i+1}`,activityName:i%3===0?"Permanência":i%3===1?"USB - APH":"Guarda-vidas",siteName:i%3===0?"ABM":i%3===1?"1º GBM":"Santa Inês",resourceName:i%3===0?"Aluno de Dia":i%3===1?"USB":"Posto de praia",startsAt:"2026-09-26T09:00:00Z",endsAt:"2026-09-26T21:00:00Z",uniformCode:i%3===2?"4D" as const:"3A" as const, validatedMinutes:720}));
  const bytes=await buildOperationalInternshipPDF({title:"ESCALAS DE SERVIÇO CFO1",service:"todos",referenceCode:"GER-260926-260927-TEST",programName:"TESTE DE LAYOUT - sem validade operacional",periodStart:"2026-09-26",periodEnd:"2026-09-27",issuedAt:"2026-09-24T12:00:00Z",rows});
  writeFileSync("tmp/pdfs/escala-servicos-qa.pdf",bytes);
  const gbmBytes=await buildOperationalInternshipPDF({title:"ESCALA DE ESTÁGIO OPERACIONAL CFO1",service:"gbm",referenceCode:"EOP-260926-260927-1GBM-TEST",gbmName:"1º GBM",programName:"CFO 2026.1",periodStart:"2026-09-26",periodEnd:"2026-09-27",issuedAt:"2026-09-24T12:00:00Z",rows:rows.filter((row)=>row.siteName==="1º GBM")});
  writeFileSync("tmp/pdfs/escala-gbm-qa.pdf",gbmBytes);
  const beachBytes=await buildOperationalInternshipPDF({title:"ESCALA DE SERVIÇO DE PRAIA CFO1",service:"praia",referenceCode:"PRA-260926-260927-TEST",programName:"CFO 2026.1",periodStart:"2026-09-26",periodEnd:"2026-09-27",issuedAt:"2026-09-24T12:00:00Z",rows:rows.filter((row)=>row.siteName==="Santa Inês")});
  writeFileSync("tmp/pdfs/escala-praia-qa.pdf",beachBytes);
  const permanenceBytes=await buildOperationalInternshipPDF({title:"ESCALA DE PERMANÊNCIA CFO1",service:"permanencia",referenceCode:"PER-260926-260927-TEST",programName:"CFO 2026.1",periodStart:"2026-09-26",periodEnd:"2026-09-27",issuedAt:"2026-09-24T12:00:00Z",rows:rows.filter((row)=>row.siteName==="ABM").slice(0,6)});
  writeFileSync("tmp/pdfs/escala-permanencia-qa.pdf",permanenceBytes);
}
run();
