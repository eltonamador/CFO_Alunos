# Historico de Peso Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add append-only student weight history with migration from the existing `health_restrictions.peso_kg`, UI in the health tab, and basic report fields.

**Architecture:** Create `student_weight_history` as the source of truth and keep `health_restrictions.peso_kg` synchronized as a compatibility field. Use a dedicated server action for new weight entries, RLS for self/coordenacao inserts, and a small SVG chart component instead of adding a chart dependency.

**Tech Stack:** Next.js App Router, TypeScript, Supabase PostgreSQL/RLS, Server Actions, Tailwind/Shadcn-style UI, Vitest.

---

### Task 1: Domain Helpers

**Files:**
- Create: `src/modules/student-profile/domain/weightHistory.ts`
- Test: `src/modules/student-profile/domain/weightHistory.test.ts`

- [ ] Write failing tests for decimal parsing, range validation, latest weight selection, chart ordering, and summary derivation.
- [ ] Run `pnpm vitest run src/modules/student-profile/domain/weightHistory.test.ts` and confirm failures.
- [ ] Implement helpers: `normalizeWeightInput`, `getLatestWeightEntry`, `sortWeightHistoryForChart`, `buildWeightSummary`.
- [ ] Re-run the focused test and confirm pass.

### Task 2: Supabase Migration

**Files:**
- Create: `supabase/migrations/0031_student_weight_history.sql`

- [ ] Add table, constraints, updated_at trigger, index, RLS policies, audit trigger, and legacy backfill from `health_restrictions.peso_kg`.
- [ ] Keep update/delete blocked by absence of policies.
- [ ] Make the legacy backfill idempotent by skipping students that already have history.

### Task 3: Query Layer and Action

**Files:**
- Modify: `src/lib/supabase/queries/students.ts`
- Modify: `src/modules/student-profile/presentation/actions/studentActions.ts`

- [ ] Add `StudentWeightHistoryRow` type and `fetchStudentWeightHistory`.
- [ ] Add `addStudentWeightAction` with server-derived `source`, `created_by`, and `created_by_role`.
- [ ] Insert into `student_weight_history`, upsert the compatibility `health_restrictions.peso_kg`, and revalidate both ficha routes.

### Task 4: Health Tab UI

**Files:**
- Modify: `src/app/(app)/coordenacao/alunos/[id]/tabs/SaudeTab.tsx`
- Modify: `src/app/(app)/coordenacao/alunos/[id]/page.tsx`
- Modify: `src/app/(app)/aluno/ficha/page.tsx`

- [ ] Pass history rows and session role/name into `SaudeTab`.
- [ ] Remove direct editing of `peso_kg` from the clinical form.
- [ ] Add `Historico de Peso` card with summary, form, SVG line chart, responsive table, and empty states.
- [ ] Ensure aluno cannot alter another `student_id`; UI and action both enforce this.

### Task 5: Reports

**Files:**
- Modify: `src/lib/reports/ficha-personalizada-catalog.ts`
- Modify: `src/lib/reports/pdf-builders.ts`
- Modify: `src/lib/reports/filtros-avancados.ts`
- Modify: `src/app/api/reports/filtros-avancados/route.ts`

- [ ] Add personalized fields: current weight, last measurement date, count.
- [ ] Load history only when requested in personalized reports.
- [ ] Include current weight, last measurement and count in advanced filter exports for coordenacao.

### Task 6: Verification

**Commands:**
- `pnpm vitest run src/modules/student-profile/domain/weightHistory.test.ts`
- `pnpm typecheck`
- `pnpm lint`

- [ ] Run focused unit tests.
- [ ] Run typecheck.
- [ ] Run lint.
- [ ] Report any failures that require follow-up.
