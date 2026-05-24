# Supabase — CFO Alunos

## Estrutura

```
supabase/
├── config.toml                          # config local (porta 54321/54322)
├── migrations/
│   ├── 0001_extensions_and_helpers.sql  # extensions + funções RLS (current_role, is_admin)
│   ├── 0002_identity.sql                # profiles
│   ├── 0003_course_management.sql       # courses, classes
│   ├── 0004_student_profile.sql         # students, contacts, addresses, emergency, vehicles
│   ├── 0005_health_restrictions.sql     # health (LGPD-sensitive)
│   ├── 0006_documents.sql               # documents
│   ├── 0007_canga.sql                   # canga_assignments
│   ├── 0008_equipment_checklist.sql     # categories, requirements, status, questions
│   ├── 0009_transversal.sql             # pending_changes, audit_logs
│   ├── 0010_audit_triggers.sql          # triggers append-only de auditoria
│   ├── 0011_views.sql                   # v_student_card_instructor, etc. (LGPD-safe)
│   ├── 0012_rls.sql                     # RLS policies em TODAS as tabelas
│   └── 0013_storage.sql                 # buckets privados + policies
└── seed.sql                             # 30 alunos + catálogo de 18 categorias
```

## Setup local

```bash
# Pré-requisito: Supabase CLI instalada e Docker rodando
# (https://supabase.com/docs/guides/local-development/cli/getting-started)

# Iniciar Supabase local
supabase start

# Aplicar migrations + seed estrutural + seed de usuários
pnpm db:setup

# Acessar Supabase Studio
# → http://localhost:54323
```

## Setup em projeto remoto (produção)

```bash
# 1. Linkar ao projeto remoto
supabase link --project-ref <PROJECT_REF>

# 2. Push das migrations
supabase db push

# 3. Configurar variáveis no .env.local com a URL/keys do projeto remoto

# 4. Rodar seed-users (cria coordenação, secretaria, instrutor, 30 alunos)
pnpm db:seed-users

# 5. Trocar IMEDIATAMENTE as senhas padrão dos usuários administrativos
#    (login com ChangeMe!2026 → forçar troca via UI ou Supabase Studio).
```

## Modelo

Veja [/docs/05-data-model.md](../docs/05-data-model.md) para o modelo conceitual completo.

## RLS — princípios aplicados

| Tabela / View                       | Coordenação | Secretaria | Instrutor              | Aluno              |
|-------------------------------------|:-----------:|:----------:|:----------------------:|:------------------:|
| `students` (tabela)                 | RW          | RW         | R (mas use a view)     | R próprio / W lim. |
| `v_student_card_instructor`         | R           | R          | **R (uso normal)**     | R próprio          |
| `health_restrictions` (tabela)      | RW          | —          | —                      | R/W próprio        |
| `v_health_indicator_secretaria`     | R           | R          | —                      | —                  |
| `documents`                         | RW          | RW         | —                      | R/W próprio        |
| `canga_assignments`                 | RW          | R          | R                      | R próprio          |
| `student_equipment_status`          | RW          | R          | —                      | R/W próprio        |
| `audit_logs`                        | R           | —          | —                      | R do próprio aluno |

> O Instrutor deve sempre consumir a **view** `v_student_card_instructor` em vez da tabela `students` — assim ele recebe somente os campos LGPD-safe.

## Auditoria automática

As tabelas `students`, `health_restrictions`, `documents`, `canga_assignments` e `emergency_contacts` têm trigger `after insert/update/delete` que insere em `audit_logs` com `actor_id = auth.uid()`, `actor_role` e snapshots `before/after`.

A inserção é feita via função `security definer` (bypassa RLS de `audit_logs`), garantindo que nenhum usuário consegue burlar o registro.

## Storage

| Bucket                  | Conteúdo                          | Tamanho máx. | MIME types               |
|-------------------------|-----------------------------------|:------------:|--------------------------|
| `student-photos`        | Foto de perfil                    | 5 MB         | jpg, png, webp           |
| `student-documents`     | RG, CPF, CNH, comprovante, etc.   | 10 MB        | jpg, png, pdf            |
| `equipment-attachments` | Fotos de itens enviadas pelo aluno| 5 MB         | jpg, png, webp           |

**Convenção de path:** `<bucket>/<student_id>/<arquivo>` — o primeiro segmento é o UUID do aluno, usado nas policies (`_storage_student_id(name)`).

## Credenciais de seed (dev only — TROCAR EM PROD)

| E-mail                       | Senha          | Role        |
|------------------------------|----------------|-------------|
| `coordenacao@cbmap.local`    | `ChangeMe!2026`| coordenacao |
| `secretaria@cbmap.local`     | `ChangeMe!2026`| secretaria  |
| `instrutor@cbmap.local`      | `ChangeMe!2026`| instrutor   |
| `aluno01@cbmap.local` … `aluno30@cbmap.local` | `ChangeMe!2026` | aluno |
