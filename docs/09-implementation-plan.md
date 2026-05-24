# 09 — Plano de Implementação

## Stack confirmada
- **Front:** Next.js 14+ (App Router) · React 18 · TypeScript estrito · Tailwind CSS · shadcn/ui (Radix) · React Hook Form + Zod.
- **Back-of-front:** Server Actions + Route Handlers do Next.
- **Banco/Auth/Storage:** Supabase (Postgres + RLS + Storage).
- **PWA:** `next-pwa` ou `@serwist/next`.
- **Excel:** `exceljs`.
- **Testes:** Vitest (unit), Playwright (e2e), `@testing-library/react`.
- **Lint/format:** ESLint + Prettier + `tsc --noEmit`.
- **Hospedagem:** Vercel.

## Estrutura de pastas (DDD)
```
src/
  app/                            # Next.js App Router
    (auth)/                       # rotas públicas (login, primeiro-acesso)
    (app)/                        # rotas autenticadas
      coordenacao/
      secretaria/
      instrutor/
      aluno/
    api/                          # route handlers para Excel etc.
    layout.tsx
  components/                     # UI compartilhada (shadcn-based)
  modules/
    identity/         { domain, application, infrastructure, presentation }
    course-management/{ ... }
    student-profile/  { ... }
    health-restrictions/{ ... }
    documents/        { ... }
    equipment-checklist/{ ... }
    reporting/        { ... }
    audit/            { ... }
  shared/             { domain, application, infrastructure, presentation }
  lib/                            # supabase client, utils
  styles/
supabase/
  migrations/
  seed.sql
docs/                             # esta pasta
public/
  icons/                          # PWA icons
```

## Camadas dentro de cada módulo

- **domain/**: entidades, value objects, regras puras, eventos. **Sem** dependências de framework.
- **application/**: casos de uso (use cases), portas (interfaces de repositório), serviços orquestradores. Usa `domain`. Não conhece Supabase.
- **infrastructure/**: implementações de portas (repositórios sobre supabase-js), mappers DB↔domínio.
- **presentation/**: componentes React, server actions, hooks específicos do módulo.

## Convenções de código
- `domain/*.ts` exporta classes puras (`Student`, `HealthRestriction`, …) + VOs (`CPF`, `BloodType`, …).
- Resultados via `Result<T, E>` simples (sem `throw` para erros previsíveis).
- Validação de input com **Zod** na fronteira (server action / route handler).
- Migrations versionadas em `supabase/migrations/NNNN_descricao.sql`.

---

## Fases de implementação (visão executiva)

| Fase | Entrega | Critério de aceite |
|---|---|---|
| **F1** Planejamento | `/docs/*` completos | Este conjunto de documentos aprovado |
| **F2** Estrutura | Projeto Next + Tailwind + Supabase client + PWA básico + ESLint/Prettier/CI | `pnpm dev` roda; `pnpm build` passa |
| **F3** Arquitetura DDD | Esqueleto de módulos em `src/modules/*` + `shared/` + tipos VO | Imports compilam; `tsc --noEmit` limpo |
| **F4** Banco | Migrations completas, RLS, buckets, seed com 30 alunos fictícios | `supabase db reset` funciona; seed visível |
| **F5** Auth & perfis | Login, primeiro acesso, guards por role | E2E: login funciona para cada role |
| **F6** Ficha do aluno | Lista + card + ficha 11 abas + edição (aluno/coordenação) + `PendingChange` saúde/CPF | E2E: aluno edita; coordenação valida |
| **F7** Documentos | Upload, validação, recusa, vínculo com saúde | E2E ciclo completo |
| **F8** Canga | Definição + histórico | Unicidade `is_current` testada |
| **F9** Checklist | Catálogo, status por aluno, dúvidas, validação, cálculo de pendências | Unit: cálculo de pendência; E2E: aluno preenche, coord valida |
| **F10** Relatórios | Geração XLSX para todos os relatórios listados | Snapshot dos XLSX em `tests/__snapshots__` |
| **F11** PWA/offline | Manifest, service worker, cache list+ficha, tela offline | Lighthouse PWA passa critérios mínimos |
| **F12** Polimento | Responsividade, performance, lint, deploy Vercel | Lighthouse mobile ≥ 90; deploy de preview verde |

---

## Backlog técnico ordenado (épicos e tarefas)

### F2 — Estrutura (1-2 dias)
- [ ] Inicializar `pnpm create next-app` (TS, App Router, Tailwind, ESLint).
- [ ] Configurar Tailwind tokens institucionais (cores CBMAP).
- [ ] Instalar shadcn/ui + componentes base (Button, Input, Card, Dialog, Sheet, Tabs).
- [ ] Configurar Supabase client (server + browser) em `src/lib/supabase`.
- [ ] `.env.local` template + `.env.example`.
- [ ] Configurar `next-pwa` (manifest, icons, SW vazio).
- [ ] ESLint + Prettier + `lint-staged` + hooks (`husky` opcional).
- [ ] GitHub Actions: lint + typecheck + build.

### F3 — Arquitetura DDD (1-2 dias)
- [ ] Criar `src/modules/<context>/{domain,application,infrastructure,presentation}` para os 8 contextos.
- [ ] Implementar VOs core: `CPF`, `Email`, `PhoneNumber`, `BloodType`, `VehiclePlate`, `UserRole`, `StudentNumber`, `CourseCode`.
- [ ] Implementar `Result<T,E>`, `DomainEvent`, `UniqueId` em `shared/domain`.
- [ ] Definir interfaces de repositório por agregado.

### F4 — Banco (2-3 dias)
- [ ] Migrations conforme `05-data-model.md`.
- [ ] Triggers `updated_at`.
- [ ] Triggers de auditoria para tabelas sensíveis.
- [ ] RLS policies por tabela (incluindo views).
- [ ] Buckets de Storage + policies.
- [ ] Seed: 1 curso, 1 turma, 2 pelotões, 30 alunos fictícios, catálogo de equipamentos (18 categorias, itens prioritários da quarentena).

### F5 — Auth e perfis (2 dias)
- [ ] Páginas `/login`, `/primeiro-acesso`.
- [ ] Middleware Next que injeta role no contexto.
- [ ] Server actions para troca de senha.
- [ ] Guards por role + redirecionamento por home.

### F6 — Ficha do aluno (5-7 dias)
- [ ] Lista de alunos (server component + busca server-side).
- [ ] Card rápido (drawer compartilhado entre roles, com projeção LGPD).
- [ ] Ficha 11 abas (apresentação) + server actions.
- [ ] Lógica de `PendingChange` para saúde/CPF/RG/foto.
- [ ] Tela de validação para Coordenação.

### F7 — Documentos (2-3 dias)
- [ ] Upload com URL assinada de upload.
- [ ] Listagem por status.
- [ ] Visualizador inline (PDF/imagem).
- [ ] Ações Validar/Recusar com motivo.

### F8 — Canga (1-2 dias)
- [ ] Tela de definição + histórico.
- [ ] Constraints e testes de unicidade `is_current`.

### F9 — Checklist (4-6 dias)
- [ ] Tela do aluno (categorias → itens → ações).
- [ ] Tela da Coordenação (validar, responder dúvidas).
- [ ] Cálculo de pendências (puro, testado).
- [ ] Relatório por aluno × pendências (preparação p/ F10).

### F10 — Relatórios (2-3 dias)
- [ ] `exceljs` em `src/modules/reporting/infrastructure`.
- [ ] Route handler `/api/reports/<tipo>` com auth+role check.
- [ ] 9 relatórios listados.

### F11 — PWA/offline (1-2 dias)
- [ ] Manifest com ícones CBMAP.
- [ ] SW: cache de assets + cache "network-first" para lista/ficha.
- [ ] Tela offline informativa.

### F12 — Polimento (2-3 dias)
- [ ] Responsividade em todas as telas.
- [ ] Performance: lazy-load, image optimization.
- [ ] Lint/typecheck/build limpos.
- [ ] Deploy Vercel + variáveis de ambiente.
- [ ] README.md (rodar local, configurar Supabase, deploy Vercel).

---

## Estratégia de commits sugeridos
- 1 commit por subtarefa do backlog quando possível.
- Convenção: `feat(student-profile): adiciona aba de logística`, `chore(db): migration 0007 documents indexes`, `fix(equipment): corrige cálculo de pendência para itens condicionais`.
- PRs por fase (`F4-database`, `F6-student-profile`, …).

## Decisões abertas que viram backlog (ver `decisions.md`)
- Notificações ao aluno quando documento é validado/recusado (e-mail Resend? push?).
- Importação CSV inicial dos 30 alunos.
- Política exata de retenção pós-curso.
- Exportação LGPD (titular pede seus dados).

## Estimativa total
~22–32 dias de desenvolvedor sênior solo, sem paralelismo. Com revisão e refinamento de UX em campo, considerar **5-6 semanas** corridas.
