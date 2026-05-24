# 04 — Bounded Contexts

Cada contexto é uma pasta isolada em `src/modules/<context>/{domain,application,infrastructure,presentation}`. A comunicação entre contextos acontece via **IDs compartilhados** (`student_id`, `class_id`) e, quando necessário, via **eventos de domínio** simples (publicados na camada `application`).

---

## 1. Identity & Access Context
**Tipo:** Generic.
**Responsabilidades:**
- Autenticação (e-mail/senha via Supabase Auth).
- Primeiro acesso do aluno (recebe credencial inicial, define senha).
- Modelo de perfil (`UserRole`): `coordenacao`, `secretaria`, `instrutor`, `aluno`.
- Vínculo `User ↔ Student` (apenas para perfil `aluno`).
- Provisão das `claims` que alimentam o RLS.

**NÃO faz:** cadastro do aluno, lista da turma, validação de documento.

**Integrações:** todos os outros contextos consomem `currentUser()`.

---

## 2. Course Management Context
**Tipo:** Supporting.
**Responsabilidades:**
- Definição curricular do curso e da turma.
- Atribuição/alteração de **número de aluno** dentro da turma (com unicidade rígida).
- Mudança da **situação no curso** (matriculado, apresentado, afastado, desligado, concluído).
- Controle da **Fase do CFO** (mapeada internamente na coluna `pelotao` no banco de dados, exposta exclusivamente como **Fase do CFO** no front-end, aceitando `CFO I`, `CFO II` ou `CFO III`).
- `CangaAssignment` — designação atual e histórica (exibida diretamente no card de Identificação do aluno, na aba Resumo).

**Atores que podem mutar:** somente Coordenação.

**Eventos publicados:**
- `StudentEnrolledInClass`
- `StudentSituationChanged`
- `CangaAssigned`

**Política:** o aluno NÃO altera nada aqui, mesmo via API.

---

## 3. Student Profile Context
**Tipo:** Core.
**Responsabilidades:**
- Dados pessoais (nome civil, nome de guerra, CPF, RG, foto de perfil, etc.).
- Histórico anterior: **Graduação militar anterior** (`graduation_name`) e **Experiência Profissional anterior** (`professional_experience`), permitindo o mapeamento de habilidades.
- Origem e Naturalidade: cidade e estado de nascimento do aluno (`naturality_city` e `naturality_state`), editáveis de forma integrada pelo próprio Aluno.
- Contatos (whatsapp, e-mails, telefone secundário).
- Endereço atual + origem (AP / outro estado) + dados de logística (precisa alojamento, residência fixa, familiares no AP).
- Contatos de emergência (lista de 2).
- Veículo / CNH.

**Atores que podem mutar:**
- Aluno: tudo, *exceto* o que pertence a Course Management (bloqueados: *Número, Nome Completo, Nome de Guerra, Curso, Fase do CFO, Canga*).
- Coordenação: tudo.
- Secretaria: dados administrativos (não-saúde).

**Eventos publicados:**
- `StudentProfileUpdated`
- `SensitiveFieldChanged` (CPF, RG, foto se configurado)

---

## 4. Health & Restrictions Context
**Tipo:** Core (LGPD-crítico).
**Responsabilidades:**
- Tipo sanguíneo, fator RH, alergias, medicamento contínuo, doença crônica, restrição física, restrição alimentar, óculos/lente.
- Vínculo opcional com `Document` (declaração médica).
- Derivação do **resumo operacional** (string curta exposta ao instrutor).
- Status de validação (necessita aval da Coordenação para entrar em vigor).

**Atores:**
- Aluno: preenche/atualiza (gera `PendingChange`).
- Coordenação: valida; pode editar diretamente.
- Secretaria: vê apenas indicador "tem restrição? sim/não".
- Instrutor: vê apenas o resumo operacional.

**Regra crítica:** o instrutor jamais recebe diagnóstico textual. O resumo operacional é curado/editável pela Coordenação.

---

## 5. Documents Context
**Tipo:** Supporting.
**Responsabilidades:**
- Tipos de documento (RG/CPF, CNH, comprovante residência, foto 3x4, declaração médica, outros).
- Upload via Supabase Storage (bucket privado).
- Ciclo: *Pendente* → *Enviado* → *Em análise* → *Validado* / *Recusado* (com motivo).
- Vínculo opcional com `HealthRestriction`.

**Atores:**
- Aluno: envia, substitui se recusado.
- Secretaria, Coordenação: valida/recusa.
- Instrutor: nenhum acesso.

---

## 6. Equipment Checklist Context
**Tipo:** Core (maior densidade de regras).
**Responsabilidades:**
- Catálogo de `EquipmentCategory` e `EquipmentRequirement` (definido pela Coordenação).
- `StudentEquipmentStatus` por aluno × item: status, observação, anexo, validação.
- `EquipmentQuestion`: dúvidas e respostas.
- **Cálculo de pendências** (ver regra 10/11 do prompt).

**Atores:**
- Aluno: informa status, observação, anexo, dúvida.
- Coordenação: valida/reprova/responde dúvida; mantém catálogo.
- Secretaria: vê relatórios.
- Instrutor: não acessa.

**Eventos publicados:**
- `EquipmentStatusUpdated`
- `EquipmentQuestionAsked`
- `EquipmentItemValidated`

---

## 7. Reporting Context
**Tipo:** Supporting.
**Responsabilidades:**
- Geração de planilhas XLSX a partir de **views/projeções** dos outros contextos.
- Relatórios: lista geral, contatos, emergência, veículo, fora-de-estado, pendências de doc, pendências de materiais (por aluno e por item), dúvidas abertas.

**Política:** Reporting é *read-only* e respeita as permissões do solicitante — uma exportação por Coordenação tem mais colunas que uma por Secretaria.

---

## 8. Audit Context
**Tipo:** Generic.
**Responsabilidades:**
- Tabela `audit_logs` append-only.
- Triggers em DB para tabelas sensíveis (saúde, documentos, designação de canga, situação no curso, mudanças de número/pelotão).
- API de consulta para a aba *Histórico* da ficha do aluno.

**Política:** somente Coordenação consulta histórico completo; aluno vê apenas alterações dele próprio.

---

## Mapa de Contextos (Context Map)

| De → Para | Relação | Padrão |
|---|---|---|
| Identity → todos | Upstream / Conformist | RLS lê `auth.uid()` e `role` |
| Course Mgmt → Student Profile | Upstream | `student.class_id` |
| Student Profile → Health/Docs/Equipment | Shared kernel: `student_id` (UUID) | Identifier sharing |
| Health → Reporting | Anti-corruption: só resumo operacional sai | Published Language |
| Tudo → Audit | Event publisher → logger | Domain Events (DB trigger no MVP) |
