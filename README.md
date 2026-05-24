# CFO Alunos

Sistema de gestão dos alunos do **Curso de Formação de Oficiais (CFO)** da Academia Bombeiro Militar — **Corpo de Bombeiros Militar do Amapá (CBMAP)**.

> Status: **Fase 2 — Estrutura inicial**. Planejamento completo em [`/docs`](docs/README.md).

## Stack
- **Next.js 14** (App Router) · **TypeScript** estrito
- **Tailwind CSS** + shadcn/ui patterns
- **Supabase** (Postgres + Auth + Storage)
- **PWA** via `@serwist/next`
- **Vitest** (unit) + **Playwright** (e2e)
- Deploy: **Vercel**

## Pré-requisitos
- Node.js 20+
- pnpm 9+
- Conta Supabase (projeto criado, dev e prod separados recomendados)

## Setup local

```bash
# 1. Instalar dependências
pnpm install

# 2. Copiar e preencher variáveis de ambiente
cp .env.example .env.local
# edite .env.local com as chaves do seu projeto Supabase

# 3. Rodar dev server
pnpm dev
# abrir http://localhost:3000

# 4. Comandos úteis
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit
pnpm test         # Vitest (unit)
pnpm e2e          # Playwright (e2e)
pnpm build        # build de produção
pnpm check        # lint + typecheck + test
```

## Estrutura

```
src/
  app/                  # rotas Next.js (App Router)
  components/           # UI compartilhada
  modules/              # bounded contexts DDD (criados em F3)
    identity/
    course-management/
    student-profile/
    health-restrictions/
    documents/
    equipment-checklist/
    reporting/
    audit/
  shared/               # primitivos compartilhados (Result, UniqueId, ...)
  lib/                  # supabase client, env, utils
supabase/               # migrations (criadas em F4)
docs/                   # planejamento (Fase 1 — completo)
tests/                  # setup + e2e
public/                 # manifest PWA, ícones
```

## Roadmap por fase
Ver [`docs/09-implementation-plan.md`](docs/09-implementation-plan.md).

- ✅ **F1** Planejamento
- ✅ **F2** Estrutura do projeto (este commit)
- ⏭️ **F3** Arquitetura DDD — esqueleto dos 8 módulos
- ⏭️ **F4** Banco — migrations + RLS + seed
- ⏭️ **F5** Auth e perfis
- ⏭️ **F6** Ficha do aluno
- ⏭️ **F7** Documentos
- ⏭️ **F8** Canga
- ⏭️ **F9** Checklist de materiais
- ⏭️ **F10** Relatórios Excel
- ⏭️ **F11** PWA/offline
- ⏭️ **F12** Polimento + deploy Vercel

## Deploy (Vercel) — resumo
1. Push para um repositório Git.
2. Importar projeto na Vercel.
3. Configurar variáveis de ambiente (mesmas do `.env.local`).
4. Vercel detecta Next.js e faz build automático.
5. Configurar domínio custom se desejado.

Detalhes completos serão documentados ao final da F12.

## Documentação de domínio
Todos os artefatos DDD estão em [`/docs`](docs/README.md). Comece por [Visão do Produto](docs/01-product-vision.md) e [Linguagem Ubíqua](docs/02-ubiquitous-language.md).
