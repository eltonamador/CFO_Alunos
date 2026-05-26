# HANDOFF — Importador T1 CFO (sessão Claude)

Data: 2026-05-26 (atualizado pós-apply na mesma data)

## STATUS: IMPORTAÇÃO CONCLUÍDA NO CLOUD

- Backup pré-apply: `backups/2026-05-26T16-27-37-430Z/` (192 linhas, 9 tabelas).
- Class usada: `22222222-2222-2222-2222-222222222222` (CFO-2026 2026 — CFO 2026.1).
- 30/30 alunos matched · **225 campos gravados** · 0 sobrescritas.
- Idempotência verificada: 2º dry-run pós-apply retornou `field_writes=0`, `field_matches_ok=390`.

### Bug encontrado e corrigido durante a sessão

O `--apply` original deixava 38 escritas presas (`emergency_contacts.notes` em 19 alunos cujos contatos já existiam no banco). Causa: o bloco de apply só fazia `INSERT` se a linha não existia; quando existia, nunca aplicava `UPDATE` para preencher campos NULL planejados. Fix em `scripts/import-t1-cfo/import-pdf.ts`:

- novos buckets `emerg1Updates` / `emerg2Updates` (próximos de `studentUpdates`),
- bloco de apply faz `UPDATE` por `(student_id, priority)` quando a linha já existe e há campos no bucket.

Após o fix, 2º apply gravou os 38 e o dry-run seguinte confirmou idempotência.

### Pendências para a coordenação (revisão humana — importador NÃO sobrescreveu)

1. **#26 JEFERSON DA SILVA NUNES** — `health_restrictions.continuous_medication` no banco é `"nenhum"`; PDF traz `"Sinvastatina (colesterol), Lacrifilm e Opti (colírios)"`. Clinicamente relevante; confirmar com o aluno.
2. **#19 KELLISAN FREIRE OLIVEIRA** — `student_contacts.whatsapp` no banco é `(96) 98146-0881`; PDF traz `(99) 68146-0881`. DDD divergente; conferir qual está correto.
3. **19 alunos com contatos de emergência invertidos entre P1 e P2** (ex.: #1 RIVALDO — banco P1=Marilene/P2=Nivaldo; PDF P1=Nivaldo/P2=Marilene). Ordem do banco prevalece; sem ação automática. Lista completa em `out/divergencias.json` (gitignored).

---


## Contexto

O usuário trouxe o PDF `G:\Meu Drive\CBMAP - Cursos e Instrução\CFO-26\Planejamento\Dados T1 CFO.pdf`
(30 alunos da T1 CFO 2026) e pediu importação segura para o banco `CFO_Alunos`,
**sem sobrescrever dados já preenchidos pelos próprios alunos**.

A sessão original foi aberta por engano em `C:\Projetos\PORTAL-STER` (CFSD-26).
A análise foi feita olhando o schema real deste repo (`CFO_Alunos`), e os arquivos
abaixo foram criados aqui via caminhos absolutos.

## O que já está pronto neste repo

- `.gitignore` — adiciona `scripts/import-t1-cfo/data/` e `scripts/import-t1-cfo/out/` (LGPD).
- `scripts/import-t1-cfo/mapping.md` — coluna do PDF → tabela/campo, com observações.
- `scripts/import-t1-cfo/import-pdf.ts` — script único (dry-run por padrão; `--apply` grava).
- `scripts/import-t1-cfo/README.md` — instruções e checklist de validação.
- `scripts/import-t1-cfo/data/t1-cfo-pdf-extract.json` — extração estruturada do PDF (gitignored).

## Achados do PDF (30 linhas)

- Cobertura 100% para: nome completo, nome de guerra, sexo, tipo sanguíneo, telefone, profissão, endereço, altura, data de nascimento, emergências (1 e 2).
- Alergias: 13/30 · Medicamentos: 15/30 · **Fobias: 0/30** · Adventistas: 1/30 (#26 JEFERSON DA SILVA NUNES).

## Decisões registradas

1. **Schema não foi alterado.** Nenhuma migration nova; nada de campo novo. Fobias (quando houver) vão para `health_restrictions.medical_notes` prefixado por `Fobias:` — único lugar com semântica clínica adequada.
2. **Match por `full_name` normalizado** (uppercase, sem acentos, espaços colapsados). 1 hit = alta confiança; 0 ou 2+ = ignorado pelo apply.
3. **Idempotência rígida:** o script lê o estado atual antes de qualquer escrita; só preenche NULL/vazio; nunca sobrescreve; divergências vão para `out/divergencias.json`.
4. **`war_name` e `full_name` nunca são tocados** pelo importador (chave/identidade).
5. **Adventista="Não"** não infere religião alguma (campos `religion` ficam intactos).

## Próximos passos (ação do operador)

1. `pnpm tsx scripts/import-t1-cfo/import-pdf.ts` — lista classes, pegar o uuid da T1 CFO 2026.
2. `pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid>` — dry-run; revisar `out/relatorio.json` e `out/divergencias.json`.
3. `pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid> --apply` (local) ou `--apply --confirm-prod` (Cloud).
4. Re-rodar dry-run pós-apply: `field_writes` deve ser 0 (prova de idempotência).

Checklist completo em [README.md](./README.md).

## Verificações já feitas nesta sessão

- `tsc --noEmit` em `import-pdf.ts` → RC=0 (sem erros de tipo).
- Não houve nenhuma escrita em banco (dry-run não foi executado contra o Supabase ainda).
- Nenhum arquivo de dados pessoais foi commitado (todos sob `data/` e `out/`, gitignored).

## O que NÃO foi feito (e por que)

- **Não rodei o dry-run contra o banco.** Falta saber qual `class_id` é a T1 CFO 2026; o script lista as classes ao rodar sem `--class-id`.
- **Não criei migration.** Não houve necessidade — todos os campos do PDF têm destino no schema existente.
- **Não toquei em UI/rotas/auth.** Fora do escopo.
