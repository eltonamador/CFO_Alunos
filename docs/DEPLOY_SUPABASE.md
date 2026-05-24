# Deploy — Supabase Cloud (Produção)

Guia passo-a-passo para preparar o **projeto Supabase Cloud** de produção do CFO Alunos.

> ⚠️ **Ambiente único**: este projeto não tem staging. Toda operação aqui é em PRODUÇÃO.
> Antes de qualquer comando destrutivo, confira 3× se o `.env.local` aponta pro projeto certo.

---

## Pré-requisitos

- [ ] Projeto criado no Supabase Cloud (região São Paulo recomendada)
- [ ] Senha do banco guardada em local seguro (não recuperável depois)
- [ ] Chaves `Project URL`, `Publishable key` e `Service role` em local seguro
- [ ] Supabase CLI instalado (`pnpm exec supabase --version`)
- [ ] `psql` instalado (Windows: instalar PostgreSQL ≥ 14 só pelo cliente, ou usar WSL)

---

## Passo 1 — Configurar `.env.local` para PROD

Faz backup do `.env.local` atual primeiro:

```powershell
Copy-Item .env.local .env.local.localdev.bak
```

Edita `.env.local` com os valores do bloco de notas:

```env
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxx
NEXT_PUBLIC_APP_NAME=CFO Alunos
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production
```

Confirma que `.env.local` não vai pro git:
```bash
git status   # NÃO pode aparecer .env.local
```

---

## Passo 2 — Conectar a CLI ao projeto remoto

```bash
pnpm exec supabase login       # abre browser, autoriza
pnpm exec supabase link --project-ref SEU_PROJECT_REF
```

> O `project_ref` é a string que aparece na URL: `https://app.supabase.com/project/PROJECT_REF/...`

---

## Passo 3 — Aplicar as 15 migrations

```bash
pnpm exec supabase db push
```

Esse comando aplica TODAS as migrations em ordem (`0001` → `0015`). Cria o schema, RLS, triggers e auditoria.

Confirma no painel Supabase → **Table Editor**: devem aparecer ~20 tabelas em `public`.

---

## Passo 4 — Popular catálogos e os 30 alunos via `psql`

O `seed.sql` cria curso, turma, 18 categorias de enxoval, itens prioritários e os **30 alunos oficiais** (com UUIDs determinísticos — idempotente).

Pega a connection string em **Settings → Database → Connection string → URI**, substitui `[YOUR-PASSWORD]` pela senha real:

```bash
psql "postgresql://postgres:SUA_SENHA@db.SEU_PROJETO.supabase.co:5432/postgres" -f supabase/seed.sql
```

Saída esperada (última linha): `Seed concluído: 30 alunos, 28 itens de equipamento, 18 categorias.`

> 💡 Esse comando é **idempotente** (`on conflict do nothing`/`do update`). Pode rodar várias vezes sem duplicar.

---

## Passo 5 — Criar os usuários `auth` (Coord, Secretaria, Instrutor, 30 alunos)

```bash
pnpm tsx scripts/seed-users.ts
```

Esse script lê o `.env.local`, conecta via service-role e:
- Cria 3 usuários admin: `coordenacao@abm.br`, `secretaria@abm.br`, `instrutor@abm.br` (senha padrão `ChangeMe!2026` — **trocar no primeiro acesso**)
- Cria os 30 usuários de alunos com e-mail baseado no nome de guerra (ex.: `silva@abm.br`)
- Vincula cada `auth.users.id` ao `students.id` correspondente via `profiles`

> 🔐 **OBRIGATÓRIO**: trocar todas as senhas iniciais no primeiro acesso. Coord deve avisar cada aluno.

---

## Passo 6 — Configurar Auth no painel Supabase

Em **Authentication → URL Configuration**:

- **Site URL**: `https://SEU_DOMINIO_VERCEL.vercel.app` (ou domínio custom)
- **Redirect URLs**: adicionar TODOS abaixo:
  - `https://SEU_DOMINIO_VERCEL.vercel.app/auth/callback`
  - `https://*.vercel.app/auth/callback` (para deploys preview)
  - `http://localhost:3000/auth/callback` (para dev local)

Em **Authentication → Providers → Email**:
- **Enable signups**: **DESLIGADO** (Coord cria usuários)
- **Confirm email**: ✅ (ou desligado se preferir não exigir confirmação)
- **Secure password change**: ✅

Em **Authentication → Email Templates**:
- Traduzir templates para **PT-BR** (Confirmation, Reset Password, Magic Link)

---

## Passo 7 — Configurar Storage

Em **Storage** no painel:

Os buckets já são criados pela migration `0013_storage.sql`. Confirma que existem:
- `photos` (público — fotos de alunos)
- `documents` (privado — documentos pessoais)

Verifica as policies (devem estar criadas pela migration) ou cria manualmente:
- `photos`: leitura pública, upload restrito ao próprio aluno + Coord/Secretaria
- `documents`: leitura/escrita restritas via RLS

---

## Passo 8 — Habilitar backups (plano Pro)

Plano Free = sem backup automático. Plano Pro ($25/mês) habilita:
- **Point-in-Time Recovery (PITR)** — restaura em qualquer instante dos últimos 7 dias
- Backups diários automáticos

**Forte recomendação**: subir para Pro antes de liberar para alunos.

---

## Passo 9 — Smoke test

1. Acessa `https://SEU_DOMINIO_VERCEL.vercel.app/login`
2. Loga como `coordenacao@abm.br` / `ChangeMe!2026`
3. Vai em **Alunos** → confere se aparecem os 30
4. Abre 1 ficha → confere abas Resumo, Saúde, Materiais
5. Loga como aluno (ex.: `silva@abm.br` / `ChangeMe!2026`)
6. Edita um campo → salva → confere na ficha da Coord

Se passou: produção operante. ✅

---

## Restaurar `.env.local` para dev local

Quando voltar a usar Supabase local:

```powershell
Copy-Item .env.local .env.local.prod.bak     # backup do prod
Copy-Item .env.local.localdev.bak .env.local  # restaura dev
pnpm exec supabase start                      # sobe docker local
```

---

## Procedimentos de emergência

### Resetar senha de algum aluno
Painel → Authentication → Users → encontra o usuário → "Send password reset" ou "Set password manually".

### Aluno reportou bug que apagou dados
1. Se tem plano Pro: Database → Backups → restaurar para timestamp anterior
2. Se plano Free: **dados perdidos**. Reaplica `seed.sql` para recriar registro (mas dados editados se vão).

### Adicionar novo aluno depois do início
Editar `supabase/seed.sql` com o novo registro (UUID `33333333-3333-3333-3333-333333333331` etc.), rodar:
```bash
psql "..." -c "insert into public.students ... on conflict do nothing"
pnpm tsx scripts/seed-users.ts   # vai criar só o novo usuário
```
