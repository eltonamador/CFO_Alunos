# Codex de Transição Técnica (HANDOFF_CODEX.md)

Este documento descreve o estado técnico atual do projeto **CFO Alunos** em 23 de Maio de 2026. Serve como guia de transição técnica detalhado para desenvolvedores e agentes.

---

## 1. Mapeamento do Banco de Dados (Supabase/Postgres)

As migrações do banco estão localizadas em `supabase/migrations/` e definem o seguinte modelo de dados:

### Tabelas Principais e de Agregados

#### `public.students` (Ficha do Aluno)
Contém os dados cadastrais básicos de identificação civil e militar do aluno.
* **Campos Críticos**:
  * `id` (`uuid`, PK)
  * `class_id` (`uuid`, FK -> `public.classes`)
  * `student_number` (`int`): Número do aluno na turma.
  * `pelotao` (`text`, default `'CFO I'`): Representa a **Fase do CFO** (`CFO I`, `CFO II`, `CFO III`).
  * `full_name` (`text`): Nome completo do aluno.
  * `war_name` (`text`): Nome de guerra.
  * `situation` (`text`, default `'matriculado'`): Enum de situação.
* **Constraints Ativas**:
  * `chk_students_pelotao`: Garante que `pelotao` seja apenas `'CFO I'`, `'CFO II'` ou `'CFO III'`.
  * `unique (class_id, student_number)`: Impede números duplicados na mesma turma.
  * `unique (class_id, war_name)`: Impede nomes de guerra duplicados na mesma turma.

#### Sub-tabelas do Agregado `Student`
* **`public.student_contacts`**: WhatsApp, e-mail pessoal e institucional, fones.
* **`public.student_addresses`**: Endereço completo, estado de origem.
* **`public.student_logistics`**: Residência fixa, necessidade de alojamento, contato local.
* **`public.emergency_contacts`**: Contatos de emergência do aluno (prioridades 1 e 2).
* **`public.vehicles`**: Informações de CNH, veículos (placa, tipo) para apoio operacional.
* **`public.health_restrictions`**: Informações clínicas, alergias, restrições e sumário operacional.

### Tabelas de Negócio e Auditoria

#### `public.canga_assignments` (Cangas)
Gerencia o histórico de atribuição de cangas (parceiros de instrução).
* **Campos**: `id`, `student_id` (FK), `canga_student_id` (FK), `assigned_at`, `assigned_by` (FK), `is_current` (boolean).
* **Constraint**: `student_id <> canga_student_id` (aluno não pode ser canga de si mesmo).
* **Índice Único**: `uniq_canga_current` garante apenas uma canga ativa (`is_current = true`) por aluno.

#### `public.audit_logs` (Histórico de Auditoria)
Log append-only imutável de alterações.
* **Campos**: `id`, `actor_id` (FK), `actor_role`, `entity`, `entity_id`, `action`, `before_data` (`jsonb`), `after_data` (`jsonb`), `reason`, `created_at`.
* **Mecanismo**: Triggers automáticos disparados após `INSERT/UPDATE/DELETE` nas tabelas `students`, `canga_assignments`, `health_restrictions`, `documents` e `emergency_contacts` (definidos em `0010_audit_triggers.sql`).

---

## 2. Pontos Críticos Resolvidos e Soluções Adotadas

Os problemas identificados no diagnóstico inicial foram 100% corrigidos com as seguintes soluções técnicas:

1. **Correção e Idempotência do `seed.sql`**:
   * O arquivo `supabase/seed.sql` foi atualizado para remover os 30 alunos fictícios e a query aleatória de inserção.
   * Os **30 alunos oficiais do CFO 2026.1** foram inseridos de forma estática com UUIDs fixos e determinísticos (`33333333-3333-3333-3333-333333333301` a `33333333-3333-3333-3333-333333333330`).
   * A coluna `pelotao` de todos os alunos no seed foi definida como `'CFO I'` (Fase inicial), eliminando o erro de constraint que ocorria ao tentar inserir valores antigos (`"1º Pelotão"`/`"2º Pelotão"`).
2. **Carga Inicial dos Alunos Oficiais**:
   * O pré-cadastro oficial da turma foi finalizado no seed. Todos os alunos reais constam na base, associados à turma `'CFO 2026.1'` e ao curso `'CFO-2026'`.
3. **Nomenclatura Corrigida ("Fase do CFO")**:
   * O termo `"Pelotão"` foi completamente removido dos componentes de visualização da UI, sendo substituído por **"Fase do CFO"** em `ResumoTab.tsx` e no cabeçalho do aluno.
   * A coluna no banco de dados continua denominada `pelotao` para evitar refatoração estrutural desnecessária no Supabase, mas no front-end é tratada exclusivamente como Fase do CFO, aceitando as opções válidas: `CFO I`, `CFO II` e `CFO III`.
4. **Remoção de Tela/Aba Exclusiva e Integração de Canga**:
   * A aba exclusiva e vazia `"Canga"` na ficha do aluno foi removida das abas da Coordenação e do Aluno.
   * O link `/coordenacao/canga` foi removido do menu de navegação do `AppShell.tsx`.
   * A canga do aluno foi integrada diretamente no card de **Identificação** da aba **Resumo**. Se o aluno tiver uma canga ativa, ela será mostrada como `(Nº) Nome de guerra`, senão mostrará `"Não atribuído"`.
   * Apenas a **Coordenação** pode gerenciar as cangas dos alunos através de um formulário de edição em linha (Inline Edit Form) integrado diretamente na aba Resumo da visualização da Coordenação. A action correspondente é `updateStudentAdminAction` e roda de forma auditada no servidor.
5. **Porcentagem de Conclusão**:
   * A barra de progresso no Portal do Aluno continua como placeholder em `0%` e será integrada dinamicamente quando a lógica de pendências por campos/tabelas for totalmente acoplada.

---

## 3. Guia de Estrutura de Diretórios

O desenvolvimento de novas funcionalidades deve respeitar rigorosamente a separação de responsabilidades (DDD):

* **Ajustar UI/Visualização**: Modificar arquivos em `presentation` ou diretamente nas rotas em `src/app/(app)/`.
* **Novas Regras de Negócio**: Inserir as validações e comportamentos em `domain` (classes puras ou VOs).
* **Comunicação com Supabase**: Mapear novas tabelas/views e consultas em `infrastructure` e atualizar repositórios correspondentes.

### Convenções Importantes
* **Componentes de UI**: Baseados no padrão `shadcn/ui` localizados em `src/components/ui/`.
* **Controle de Permissão**: Utilize `requireRole` dentro de rotas/ações no servidor para restringir operações confidenciais a perfis não autorizados (ex: alunos editando número ou canga).
