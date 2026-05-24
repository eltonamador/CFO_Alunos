# Decisões e Suposições — CFO Alunos

Registro vivo de decisões técnicas/produto e suposições feitas durante o planejamento. Cada item: contexto, decisão, alternativas, consequência.

---

## D-001 — Next.js (App Router) sobre React puro
- **Contexto:** prompt pede "Next.js ou React moderno".
- **Decisão:** Next.js 14+ com App Router.
- **Por quê:** server components reduzem JS no cliente (importante em 3G); server actions simplificam mutação com auth; deploy Vercel é trivial; PWA via `next-pwa`/`@serwist/next` é maduro.
- **Consequência:** algumas libs client-only exigem `'use client'` explícito.

## D-002 — Supabase como BFF
- **Decisão:** usar Supabase para Auth, Postgres e Storage; **não** criar backend Node separado.
- **Por quê:** time pequeno; RLS atende às regras LGPD; menos infra.
- **Consequência:** regras críticas duplicam-se em DB (RLS) e em código (server actions) — aceito.

## D-003 — DDD pragmático, não dogmático
- **Decisão:** módulos com 4 camadas (`domain/application/infrastructure/presentation`), mas sem CQRS, sem event sourcing, sem mediator. Eventos de domínio = funções simples chamadas após use case.
- **Por quê:** time pequeno; turma de 30 alunos não justifica overhead.
- **Consequência:** se o sistema crescer (várias turmas, várias unidades), refatorar para mensageria.

## D-004 — `Number` e `pelotão` pertencem a Course Management
- **Decisão:** apesar de ficarem na tabela `students` por simplicidade de query, **as regras de mutação** estão no contexto `course-management` (use cases `AssignStudentNumber`, `AssignPelotao`).
- **Por quê:** atores diferentes (admin) com regras diferentes.
- **Consequência:** UI da ficha mostra esses campos como read-only para Aluno; edição vive em telas de admin da Coordenação.

## D-005 — Política dual de PendingChange (A vs B)
- **Contexto:** alguns campos sensíveis precisam refletir imediatamente para o aluno (saúde — ele acabou de digitar), outros não devem mudar até validação (CPF — não pode "trocar a identidade" do aluno até confirmação).
- **Decisão:**
  - **Política A (write-then-validate):** saúde, foto, observações de checklist. Valor é gravado mas marcado pendente; instrutor/relatórios não enxergam até validação.
  - **Política B (queue-only):** CPF, RG, PIS, título eleitoral. Valor antigo permanece efetivo; novo fica em `pending_changes.new_value`.
- **Consequência:** UI mostra "Aguardando validação" diferente em cada caso.

## D-006 — Resumo operacional é curado pela Coordenação
- **Decisão:** o instrutor jamais vê texto digitado pelo aluno como "restrição". A Coordenação valida e **escreve** um resumo curto.
- **Por quê:** LGPD (mínima exposição) + qualidade (linguagem operacional, não médica).
- **Consequência:** existe um campo `operational_summary` separado; um aluno pode ter restrição pendente sem nenhum texto exposto.

## D-007 — Storage privado + URLs assinadas
- **Decisão:** todos os 3 buckets são privados; acesso via URL assinada com TTL.
- **TTL sugerido:** 5 minutos para documentos sensíveis, 30 min para fotos no card.
- **Consequência:** mais round-trips, mas controle estrito.

## D-008 — Cálculo de pendências em código puro
- **Decisão:** função pura em `equipment-checklist/domain/computePendingItems.ts` recebe arrays e retorna lista de pendências. DB tem apenas `status`; classificação é responsabilidade do domínio.
- **Por quê:** regra muda; testar puro é trivial; views em DB ficariam frágeis.
- **Consequência:** relatórios calculam em memória — aceitável para 30 alunos × ~150 itens.

## D-009 — Sem mensageria/queue no MVP
- **Decisão:** eventos de domínio são chamados síncronamente; auditoria via trigger DB.
- **Backlog:** se introduzirmos notificações por e-mail (Resend) ou push, considerar fila simples (Supabase queues, ou cron + tabela `outbox`).

## D-010 — Excel via `exceljs`
- **Decisão:** `exceljs` em vez de `xlsx` (SheetJS).
- **Por quê:** API mais ergonômica para formatação, sem licenças confusas.

## D-011 — Sem importação CSV no MVP
- **Suposição:** os 30 alunos serão cadastrados manualmente pela Coordenação (5-10 min de trabalho) ou via seed inicial.
- **Backlog:** importação CSV/XLSX.

## D-012 — Notificações fora do MVP
- **Decisão:** sem e-mail / push. Aluno verifica status no app.
- **Backlog:** quando houver Resend ou Web Push.

## D-013 — Direitos LGPD (eliminação/portabilidade) manuais
- **Decisão:** procedimento manual via Coordenação para o MVP; documentar canal externo.
- **Backlog:** automatizar export de dados do aluno em JSON/PDF.

## D-014 — Idioma do código: inglês para tipos/identifiers técnicos; português para termos de domínio
- **Exemplos:** `class Student`, `WarName`, `Pelotao`, `CangaAssignment`, `StudentNumber`, `EquipmentCategory`.
- **Por quê:** evita tradução errada de termos militares; mantém código legível pra devs internacionais nos genéricos.

## D-015 — Catálogo de equipamentos é editável
- **Decisão:** `equipment_categories` e `equipment_requirements` são gerenciados pela Coordenação na UI (CRUD simples), não hardcoded.
- **Por quê:** lista evolui com o tempo / por turma.
- **Consequência:** seed inicial popula a lista do prompt (18 categorias + itens prioritários), mas tudo é editável.

## D-016 — Aplicabilidade "condicional" requer regra textual
- **Suposição:** "condicional" significa "depende — Coordenação deve decidir se aplica ao aluno X"; no MVP é tratado como opcional por padrão e pode ser **forçado** por Coordenação criando o `student_equipment_status` manualmente.
- **Backlog:** mecanismo declarativo (ex.: "aplica se has_cnh = true").

## D-017 — Migration runner: Supabase CLI
- **Decisão:** versionar SQL em `supabase/migrations/NNNN_*.sql`; aplicar via `supabase db push`.
- **Sem ORM** para o MVP (a abstração se daria nos repositórios em `infrastructure/`).
- **Backlog:** se complexidade aumentar, considerar Drizzle.

## D-018 — Testes: Vitest + Playwright
- **Decisão:** Vitest (rápido, ergonômico); Playwright para e2e cross-browser e mobile-viewport.

## D-019 — Tema visual: vermelho CBMAP + neutros
- **Suposição:** identidade visual sóbria, vermelho como acento, evitar excesso de cores.
- **Validar com Coordenação**: assets oficiais (brasão, paleta exata) — backlog.

## D-020 — Roteamento por role
- **Decisão:** layouts segregados `(app)/coordenacao`, `/secretaria`, `/instrutor`, `/aluno`. Middleware redireciona com base na role.
- **Por quê:** evita render de UI de outras roles + ajuda code-splitting.
