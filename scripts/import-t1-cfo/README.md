# Importador — Dados T1 CFO

Importa os 30 alunos do PDF `Dados T1 CFO.pdf` para o banco do CFO_Alunos **sem nunca sobrescrever** dados já preenchidos.

## Arquivos

- [`mapping.md`](./mapping.md) — correspondência PDF × banco.
- [`import-pdf.ts`](./import-pdf.ts) — script único: dry-run + apply.
- `data/t1-cfo-pdf-extract.json` — extração estruturada do PDF (gitignored, LGPD).
- `out/relatorio.json` — gerado a cada run (gitignored).
- `out/divergencias.json` — gerado a cada run (gitignored).

## Pré-requisitos

1. `.env.local` na raiz do projeto com:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
2. Confirmar para qual ambiente o `.env.local` aponta (local ou Cloud).
3. Backup do banco recomendado antes do `--apply` (use o script `scripts/backup-cloud.ts` se for Cloud).

## Regerar a extração do PDF (opcional)

A extração inicial já está em `data/t1-cfo-pdf-extract.json`. Para regerar (se o PDF for atualizado), rode o seguinte Python na raiz do projeto (requer `pip install pypdf pdfplumber`):

```bash
python -c "from scripts.import_t1_cfo.extract import run; run()"  # se quiser empacotar
```

Ou refazendo manualmente com o script Python ad-hoc usado nesta sessão (gera o mesmo JSON).

## Execução

### 1) Descobrir a `class_id` da T1 CFO

```bash
pnpm tsx scripts/import-t1-cfo/import-pdf.ts
```

Sem `--class-id`, o script lista todas as classes existentes. Copie o `id` (uuid) da turma T1 CFO 2026.

### 2) Dry-run (sem gravar nada)

```bash
pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid>
```

Saída:
- console: por aluno, `write=` (campos a preencher), `match=` (compatíveis), `skip=` (já preenchidos), `diverge=` (divergência);
- `out/relatorio.json`: ações por aluno;
- `out/divergencias.json`: divergências para revisão manual.

### 3) Apply

```bash
# ambiente LOCAL
pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid> --apply

# ambiente CLOUD (exige confirmação explícita)
pnpm tsx scripts/import-t1-cfo/import-pdf.ts --class-id <uuid> --apply --confirm-prod
```

### 4) Idempotência

Rodar `--apply` duas vezes seguidas deve produzir `write=0` na segunda — confirma que nada foi sobrescrito.

## Checklist de validação

### Após dry-run
- [ ] **30 alunos** marcados como `matched`. Se algum sair `MISS` ou `AMB`, **parar** e revisar manualmente (provável grafia divergente do `full_name` no banco).
- [ ] Revisar `out/divergencias.json` com a coordenação antes de aplicar.

### Após `--apply`
- [ ] Rodar uma 2ª vez sem `--apply`: somatório `field_writes = 0`.
- [ ] No Supabase Studio, para 2-3 alunos amostrados:
  - [ ] `students` — `sex`, `birth_date`, `professional_experience`, `religion` (apenas para o aluno Adventista, #26 JEFERSON);
  - [ ] `health_restrictions` — `blood_type`, `rh_factor`, `altura_cm`, `allergies`, `continuous_medication`;
  - [ ] `student_contacts` — `whatsapp`;
  - [ ] `student_addresses` — `street`;
  - [ ] `emergency_contacts` — 1 linha priority=1, 1 linha priority=2 (quando aplicável).
- [ ] Na UI (Próximas Tarefas → ficha do aluno): abrir 2-3 fichas e verificar que os campos aparecem; campos que já estavam preenchidos pelos próprios alunos **continuam intactos**.
- [ ] Conferir que `war_name`, `full_name`, `student_number`, `class_id`, `pelotao`, `enrollment_status` **não foram alterados**.

## Limites conhecidos

- **Fobias**: o schema não tem coluna dedicada; quando houver valor (no PDF atual: zero), seria gravado em `health_restrictions.medical_notes` prefixado por `Fobias: `.
- **Endereço**: só `student_addresses.street` é preenchido. `district`/`city`/`state`/`zip` ficam NULL — o aluno completa via formulário.
- **Emergência**: nome/parentesco/endereço extraídos por heurística. Texto bruto é preservado em `notes` para auditoria.
- **Telefones**: o prefixo `55` (DDI) presente em algumas linhas do PDF é removido; o número fica em formato `(96) 9XXXX-XXXX`.

## LGPD

`data/` e `out/` estão no `.gitignore`. **Não** mover esses arquivos para fora do diretório, **não** colar conteúdo em chats/issues públicos, **não** anexar em PRs.
