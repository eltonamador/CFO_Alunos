# 07 — Permissões e LGPD

## Matriz de permissões (alto nível)

Legenda: **R** = ler · **W** = escrever · **V** = validar/recusar · **—** = sem acesso · **Próprio** = só os próprios dados.

| Recurso / Dado | Coordenação | Secretaria | Instrutor | Aluno |
|---|:---:|:---:|:---:|:---:|
| Turma / curso / pelotão | R/W | R | R | R (básico) |
| Lista de alunos (cards) | R completo | R administrativo | R operacional | R básico (turma) |
| Ficha — Cadastro civil (nome, sexo, naturalidade, mãe/pai) | R/W | R/W | R limitado* | R/W próprio |
| Ficha — CPF/RG/PIS/Título | R/W | R/W (com justificativa, audit) | — | R próprio · W próprio com `PendingChange` |
| Ficha — Contato (whatsapp, e-mails) | R/W | R/W | R **WhatsApp** + e-mail institucional | R/W próprio |
| Ficha — Endereço atual | R/W | R/W | — | R/W próprio |
| Ficha — Origem (AP / outro estado) | R/W | R/W | R (apenas flag AP/outro estado) | R/W próprio |
| Ficha — Logística (alojamento, etc.) | R/W | R | — | R/W próprio |
| Emergência (contatos 1 e 2) | R/W | R | R (acesso registrado em audit) | R/W próprio |
| Saúde — Detalhe clínico | R/W | — (apenas indicador "tem? sim/não") | — | R/W próprio (gera pendência) |
| Saúde — **Resumo operacional** | R/W (cura) | R | **R** | R próprio |
| Saúde — Validação | V | — | — | — |
| Veículo / CNH | R/W | R | R (apenas `has_vehicle` sim/não) | R/W próprio |
| Documentos (RG, CPF, CNH, comprovante, foto 3x4, declaração médica) | R/W/V | R/V | — | R/W próprio (upload, substitui se recusado) |
| Canga (atual + histórico) | R/W | R | R (atual) | R próprio (atual) |
| Checklist — Catálogo (categorias, itens) | R/W | R | R | R |
| Checklist — Status por aluno | R/W/V | R | — | R/W próprio |
| Checklist — Dúvidas | R/W (responde) | R | — | R/W próprio (faz pergunta) |
| Pendências de validação (`PendingChange`) | R/V | R/V (escopo) | — | R próprias |
| Relatórios Excel | Todos | Subset administrativo | — | — |
| Auditoria | R total | R do próprio ato | — | R do próprio aluno |

\* "Instrutor R limitado" no cadastro civil = vê **nome completo** + **nome de guerra**; **não** vê CPF/RG/PIS/título/naturalidade detalhada/mãe/pai.

---

## Visão do Card do Instrutor (campos exatos)

> Fonte única da verdade do que o Instrutor enxerga. Qualquer campo fora desta lista exige aprovação explícita.

- foto
- número
- nome de guerra
- nome completo
- pelotão
- WhatsApp + botão de ação
- e-mail institucional
- canga (número + nome de guerra do par)
- veículo: **sim/não** (sem placa, sem modelo)
- origem: **AP / outro estado** (sem cidade detalhada)
- alerta de restrição (badge) + **resumo operacional** (texto curado pela Coordenação)
- botão "Emergência" → mostra contato prioridade 1 (nome, parentesco, telefone) **com log de acesso**

---

## LGPD — Princípios aplicados

### Base legal (`Art. 7º` da LGPD)
- **Execução de políticas públicas** e **legítimo interesse** da corporação: cadastro funcional e operacional.
- **Consentimento** explícito do aluno no primeiro acesso para dados de saúde e contatos de emergência (gravado em `profiles` ou tabela `consents` — *consent tracking* fica em backlog).

### Dados sensíveis identificados
- Dados de saúde: tipo sanguíneo, alergias, medicamento contínuo, doença crônica, restrição física/alimentar.
- Documentos: CPF, RG, CNH, foto, comprovante de residência, declaração médica.
- Contatos de emergência (terceiros) — *dados de terceiros*, requerem que o aluno declare ter coletado autorização.

### Princípios aplicados
1. **Finalidade**: cada campo tem uma razão funcional registrada nesta documentação.
2. **Adequação e necessidade**: instrutor só vê o resumo operacional; secretaria não vê detalhe clínico.
3. **Livre acesso**: o aluno vê tudo o que o sistema sabe sobre ele.
4. **Qualidade**: validação humana antes de dado sensível entrar em vigor.
5. **Transparência**: aba *Histórico* mostra quem alterou o quê.
6. **Segurança**: RLS, URLs assinadas, HTTPS, senhas via Supabase Auth.
7. **Prevenção**: rate limit no Auth (Supabase nativo); auditoria do acesso a contato de emergência.
8. **Não-discriminação**: dados de saúde não são exibidos em listas; alerta no card é binário + frase curada.
9. **Responsabilização**: `AuditLog` imutável.

### Direitos do titular (operacionalização mínima no MVP)
- **Acesso**: aluno vê todos os próprios dados.
- **Correção**: aluno edita; pendências sensíveis vão para validação.
- **Eliminação / portabilidade**: não automatizadas no MVP — solicitar à Coordenação por canal externo (procedimento documentado no /docs/decisions.md).
- **Revogação de consentimento**: idem — backlog.

### Retenção
- Dados ficam vinculados ao **curso/turma**. Após o término do curso: regra a definir com a Coordenação (mover para arquivo histórico). Backlog.

---

## Implementação técnica (RLS Supabase)

### Função auxiliar
```sql
create or replace function public.current_role()
returns text language sql stable as $$
  select role from profiles where id = auth.uid()
$$;

create or replace function public.current_student_id()
returns uuid language sql stable as $$
  select student_id from profiles where id = auth.uid()
$$;
```

### Padrão de policies por tabela
- `coordenacao`: `using (current_role() = 'coordenacao')` para SELECT/INSERT/UPDATE.
- `secretaria`: scoped por tabela (sem health_restrictions detalhe).
- `instrutor`: SELECT apenas em colunas/viewparas operacionais (uso de **view** para card do instrutor).
- `aluno`: `using (student_id = current_student_id())`.

### Views específicas para LGPD
- `v_student_card_instructor` — projeção segura (campos do card, com `operational_summary` mas sem detalhe clínico).
- `v_student_class_basic` — lista da turma para o aluno (sem contato/sensível).

### Storage policies
- `student-documents`: `aluno` pode listar/baixar próprios arquivos; `coordenacao` e `secretaria` tudo; `instrutor` nada.
- `student-photos`: leitura mais permissiva (foto é exibida em cards), via URLs assinadas com TTL.
- `equipment-attachments`: aluno (próprio), coordenação (tudo).

---

## Acesso ao contato de emergência (caso especial)
- Disponível ao Instrutor **no card rápido**.
- Toda visualização gera `AuditLog` com `action='view_emergency_contact'`.
- A própria Coordenação pode auditar quem acessou quais contatos.
