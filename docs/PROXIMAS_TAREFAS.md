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

## Próximos Passos Detalhados

### 4. Implementar Abas Pendentes: Logística e Veículo/CNH
* **Objetivo**: Criar as telas e fluxos de preenchimento para as informações de logística (estadia/alojamento) e dados de veículos.
* **Tarefas Técnicas**:
  * Substituir os placeholders correspondentes em `page.tsx` pelas abas funcionais:
    * `LogisticaTab.tsx` conectada à tabela `public.student_logistics` (endereço no curso, necessidade de alojamento, fone de contato no Amapá).
    * `VeiculoTab.tsx` conectada à tabela `public.vehicles` (posse de veículo, tipo, placa, posse e validade da CNH, anexo de CNH).
  * Criar os respectivos formulários utilizando `react-hook-form` e validações `zod` mapeadas contra a infraestrutura do Supabase.

### 5. Implementar Checklist de Materiais (Enxoval)
* **Objetivo**: Viabilizar o fluxo de conferência de enxovais, materiais e equipamentos (18 categorias, priorizando itens de quarentena).
* **Tarefas Técnicas**:
  * Criar a aba `MateriaisTab.tsx` (substituindo o placeholder).
  * Implementar interface visual dinâmica dividida pelas 18 categorias de equipamentos registradas na tabela `public.equipment_categories`.
  * Permitir que o Aluno marque os itens possuídos e tire dúvidas sobre os requisitos.
  * Permitir que a Coordenação valide visualmente o checklist individual ou geral de cada aluno.

### 6. Implementar Relatórios Excel
* **Objetivo**: Desenvolver o motor de exportação de dados analíticos para a coordenação em formato Excel estruturado.
* **Tarefas Técnicas**:
  * Utilizar a biblioteca `exceljs` na infraestrutura para construir as planilhas.
  * Criar os Route Handlers no Next.js (`src/app/api/reports/...`) protegidos por autenticação e restritos a perfil de Coordenação e Secretaria.
  * Implementar os relatórios-chave: Ficha Completa da Turma, Pendências de Enxoval, Restrições Médicas/Saúde, e Contatos de Emergência.

### 7. Implementar Histórico Visual/Auditoria
* **Objetivo**: Renderizar a trilha de auditoria e pendências diretamente na aba de histórico do aluno na Coordenação.
* **Tarefas Técnicas**:
  * Substituir o placeholder `Historico` pela aba `HistoricoTab.tsx`.
  * Realizar query em `public.audit_logs` filtrando pelo `entity_id` correspondente ao UUID do aluno.
  * Exibir timeline contendo: data da modificação, autor da alteração (quem alterou), ação realizada, e a comparação visual (*antes* x *depois*) para alterações de número, fase do CFO e canga.
