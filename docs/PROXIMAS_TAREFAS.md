# 12 — Backlog e Próximas Tarefas (PROXIMAS_TAREFAS.md)

Este documento descreve o progresso do backlog técnico do **CFO Alunos** em **23 de Maio de 2026** e as tarefas remanescentes organizadas em ordem prioritária para a continuidade do projeto.

---

## Estado do Backlog

- `[x]` **Tarefa 1: Validar/Concluir Pré-Cadastro Oficial dos 30 Alunos** (CONCLUÍDO)
- `[x]` **Tarefa 2: Ajustar Nomenclatura de Pelotão para Fase do CFO** (CONCLUÍDO)
- `[x]` **Tarefa 3: Integrar Canga à Ficha do Aluno, Sem Tela Exclusiva** (CONCLUÍDO)
- `[x]` **Tarefa 4: Implementar Abas Pendentes: Logística e Veículo/CNH** (CONCLUÍDO)
- `[x]` **Tarefa 5: Implementar Checklist de Materiais (Enxoval)** (CONCLUÍDO)
- `[x]` **Tarefa 6: Implementar Relatórios Excel** (CONCLUÍDO)
- `[x]` **Tarefa 7: Implementar Histórico Visual/Auditoria** (CONCLUÍDO)

---

### Novos Próximos Passos (Refinamento e Testes)

### 1. Validar e Executar Testes E2E (Playwright)
* **Objetivo**: Garantir que as interações do usuário estejam perfeitas através de testes de navegador automatizados.
* **Tarefas Técnicas**:
  * Executar a suite de testes atual usando `pnpm exec playwright test`.
  * Corrigir quaisquer seletores desalinhados após a remoção da aba exclusiva de canga e a introdução da "Fase do CFO".

### 2. Refinar a Barra de Progresso do Aluno
* **Objetivo**: Integrar a barra de progresso no Portal do Aluno com a lógica real de preenchimento de tabelas.
* **Tarefas Técnicas**:
  * Calcular a taxa de preenchimento lendo o estado das tabelas `student_contacts`, `student_addresses`, `student_logistics`, `vehicles` e `health_restrictions`.
  * Refletir dinamicamente a porcentagem no cabeçalho do painel do aluno.

### 3. Auditar Políticas de RLS em Larga Escala
* **Objetivo**: Garantir conformidade rigorosa com a LGPD nos perfis de Aluno, Instrutor e Secretaria.
* **Tarefas Técnicas**:
  * Realizar uma varredura nas permissões de RLS em `supabase/migrations/0012_rls.sql`.
  * Confirmar que dados sensíveis de saúde e anexos de documentos não são expostos a instrutores ou outros alunos.

### 4. Otimizar Service Worker (PWA)
* **Objetivo**: Assegurar suporte offline robusto para visualizações rápidas em dispositivos móveis.
* **Tarefas Técnicas**:
  * Testar o comportamento do `@serwist/next` com o modo offline do navegador.
  * Garantir cache local de listagens operacionais essenciais para os instrutores.
