# 03 — Mapa de Domínios

## Classificação dos subdomínios

### Core (vantagem competitiva, modelado com riqueza)
- **Equipment Checklist** — diferencial real: nenhum produto de prateleira cobre o enxoval militar com regras de obrigatoriedade, aplicabilidade, fase, dúvida e validação. Concentra a regra de negócio de **pendências**.
- **Student Profile** — agregado central; alimenta praticamente todas as telas e relatórios.
- **Health & Restrictions** — regras LGPD-sensíveis + derivação do *resumo operacional* (não trivial).

### Supporting (necessários, modelagem honesta mas sem invenção)
- **Course Management** — curso, turma, pelotão, número, situação, canga.
- **Documents** — upload, status, validação.
- **Reporting** — exportações Excel.

### Generic (commodities; usar Supabase/libs prontas)
- **Identity & Access** — delegado ao Supabase Auth + RLS.
- **Audit** — append-only log; tabela simples + trigger.

## Diagrama textual

```
                       ┌──────────────────────────┐
                       │  Identity & Access (G)   │
                       │  Supabase Auth + Profile │
                       └────────────┬─────────────┘
                                    │ user_id ↔ student_id
                                    ▼
   ┌──────────────────────┐    ┌──────────────────────┐
   │ Course Management (S)│◄───┤  Student Profile (C) │
   │ Course/Class/Pelotão │    │  Cadastro + Contato  │
   │ Número, Situação,    │    │  Endereço, Veículo,  │
   │ CangaAssignment      │    │  Emergência          │
   └──────────────────────┘    └────────┬─────────────┘
                                        │ student_id
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
   ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
   │ Health & Restr. (C)  │  │   Documents (S)      │  │ Equipment Checklist  │
   │ Dados clínicos +     │  │ Upload + Validação   │  │       (C)            │
   │ resumo operacional   │  │                      │  │ Categoria/Item/      │
   └──────────┬───────────┘  └──────────┬───────────┘  │ Status/Dúvida        │
              │                          │              └──────────┬───────────┘
              │                          │                         │
              └──────────────┬───────────┴─────────────────────────┘
                             ▼
                  ┌──────────────────────┐         ┌──────────────────────┐
                  │  Reporting (S)       │         │   Audit (G)          │
                  │  Exporta Excel       │◄────────┤  Log de alterações   │
                  └──────────────────────┘         └──────────────────────┘

   (C) = Core    (S) = Supporting    (G) = Generic
```

## Relações principais
- **Identity ↔ Student Profile**: 1:1 opcional (uma conta de perfil *Aluno* aponta para 1 `Student`; contas de Coordenação/Secretaria/Instrutor não têm vínculo).
- **Course Management → Student Profile**: turma/pelotão/número compõem o "estado curricular" do aluno; ficam no contexto de *Course Management* porque mudam por ato administrativo, não por edição do aluno.
- **Student Profile → Health, Documents, Equipment**: o `student_id` é o identificador compartilhado; cada contexto mantém seu próprio agregado.
- **Health → Reporting**: somente o **resumo operacional** atravessa fronteiras; dados clínicos brutos não saem do contexto.
- **Tudo → Audit**: alterações sensíveis publicam evento de auditoria (via trigger DB no MVP).

## Direção das dependências
- Nenhum contexto Core depende de Reporting ou Audit (estes ouvem, não comandam).
- Identity é dependência de **todos** os outros (via `auth.uid()` no RLS).
- Course Management e Student Profile compartilham o conceito de "aluno", mas ficam separados porque os dados mudam por **atores diferentes** (admin vs próprio aluno) com **regras de validação diferentes**.

## Riscos de modelagem
- **Tentação CRUD**: o sistema *parece* CRUD. Não é. As regras de pendência, validação, derivação de resumo operacional e cálculo de "está pronto para apresentação" são onde mora o domínio.
- **Overlap Health × Documents**: a declaração médica é documento E sustenta restrição. Decisão: documento vive em *Documents*, com `linked_health_restriction_id` opcional.
- **Overlap Course × Profile**: número/pelotão poderiam estar em `Student`, mas pertencem a *Course Management* — aluno NÃO os edita.
