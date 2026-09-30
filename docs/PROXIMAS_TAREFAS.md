# 12 — Backlog e Próximas Tarefas (PROXIMAS_TAREFAS.md)

Este documento descreve o progresso do backlog técnico do **CFO Alunos** em **24 de Maio de 2026** e as tarefas remanescentes organizadas em ordem prioritária para a continuidade do projeto.

---

## Entrega de 25/09/2026 — rodízio, etapa 1

- [x] Elevar o descanso na prioridade, com teto comparativo de 72h.
- [x] Equilibrar fins de semana comprometidos, consecutivos e horas nesses dias.
- [x] Limitar a três ocorrências de descanso de 24h em qualquer janela móvel de 28 dias, também no banco.
- [x] Mostrar os critérios nas sugestões de estágio e permanência.
- [x] Etapa 2: procurar combinações alternativas antes de deixar vagas vazias na montagem diária/semanal, preservando escolhas manuais.
- [x] Etapa 3: substituição durante o plantão com períodos individualizados, validação e auditoria.
- [x] Etapa 4: versões e identificação de retificações dos PDFs — [detalhes](ESTAGIO_RETIFICACOES_PDF.md).
- [x] Etapa 5: cadastro simples de instruções e revalidação após mudanças — [detalhes](ESTAGIO_INSTRUCOES.md).
- [x] Etapa 6: permanência em sobreaviso de instrução e ajuste de horários de GV, preservando uniforme e descanso — [detalhes](ESTAGIO_SOBREAVISO_E_HORARIOS_GV.md).

Regras, escopo e sequência das melhorias: [Rodízio e descanso](ESTAGIO_RODIZIO_DESCANSO.md).

## Entrega de 23/09/2026 — cinco etapas do estágio

Implementados fluxo validado, fila de pendências, relatórios individuais e termo de carga, permanência de 2 a 4 cadetes e rodízio conjunto. Consulte [funcionalidades, permissões e verificações](ESTAGIO_CINCO_ETAPAS.md).

Decisões de 24/09/2026: Permanência inicia com horário padrão de 06h–18h, ajustável para exceções; Ian Lima, como administrador ativo do estágio, também pode publicar, alterar e cancelar Permanência. QTS, saúde e calendário ficam para depois.

## Prioridades registradas em 23/09/2026 — estágio e permanência

**Registro original: requisitos atendidos pela entrega das cinco etapas acima.** Detalhamento e critérios de aceite na [próxima etapa do plano de estágio](PLANO_MODULO_CONTROLE_ESTAGIO.md#próxima-etapa-registrada-em-23092026--escala-operacional-e-permanência).

1. [x] **PDF operacional da escala:** número e nome do cadete, data/hora de início e término, local, tipo de serviço, uniforme e carga de estágio já cumprida/homologada. Disponível em `/coordenacao/estagio/agenda` e `/api/estagio/escala`.
2. [x] **Escalas na tela inicial:** serviços publicados dos próximos sete dias, lidos diretamente dos registros de estágio nos painéis de cadete, Coordenação, Instrutor e Secretaria, sem importar PDF.
3. [x] **Planejamento da permanência:** Aluno de Dia e Apoios 1, 2 e 3, com composição configurável de 2 a 4 cadetes no total por serviço, conforme interpretação registrada no plano.
4. [x] **Balanceamento conjunto:** cruzar estágio e permanência nos dois sentidos; considerar horários, dias de serviço, carga comprometida e descanso nas sugestões e na publicação. Manter a carga curricular de estágio separada das horas de permanência.

Planejamento da permanência implementado com uniforme e horários preenchidos inicialmente como 06h–18h. Novos pesos ou regras de descanso adicionais dependem de decisão posterior. QTS, saúde e calendário permanecem para uma etapa posterior.

---

## Estado do Backlog

- `[x]` **Tarefa 1: Validar/Concluir Pré-Cadastro Oficial dos 30 Alunos** (CONCLUÍDO)
- `[x]` **Tarefa 2: Ajustar Nomenclatura de Pelotão para Fase do CFO** (CONCLUÍDO)
- `[x]` **Tarefa 3: Integrar Canga à Ficha do Aluno, Sem Tela Exclusiva** (CONCLUÍDO)
- `[x]` **Tarefa 4: Implementar Abas Pendentes: Logística e Veículo/CNH** (CONCLUÍDO)
- `[x]` **Tarefa 5: Implementar Checklist de Materiais (Enxoval)** (CONCLUÍDO)
- `[x]` **Tarefa 6: Implementar Relatórios Excel** (CONCLUÍDO)
- `[x]` **Tarefa 7: Implementar Histórico Visual/Auditoria** (CONCLUÍDO)
- `[x]` **Tarefa 8: Eliminar Dados Mocks/Locais e Integrar Dashboards Reais** (CONCLUÍDO)
- `[x]` **Tarefa 9: Implementar Hub Consolidado de Validações da Coordenação** (CONCLUÍDO)
- `[x]` **Tarefa 10: Padronizar Identificação Unificada (Nome — Número)** (CONCLUÍDO)
- `[x]` **Tarefa 11: Implementar Experiência Profissional e Fluxo de Naturalidade** (CONCLUÍDO)

---

### Novos Próximos Passos (Refinamento e Testes)

### 1. Validar e Executar Testes E2E (Playwright)
* **Objetivo**: Garantir que as interações do usuário estejam perfeitas através de testes de navegador automatizados.
* **Tarefas Técnicas**:
  * Executar a suite de testes atual usando `pnpm exec playwright test`.
  * Corrigir quaisquer seletores desalinhados após as atualizações de layout do Hub de Validações e Identificação Unificada.

### 2. Refinar a Barra de Progresso do Aluno
* **Objetivo**: Integrar a barra de progresso no Portal do Aluno com a lógica real de preenchimento de tabelas.
* **Tarefas Técnicas**:
  * Calcular a taxa de preenchimento lendo o estado das tabelas `student_contacts`, `student_addresses`, `student_logistics`, `vehicles` e `health_restrictions`.
  * Refletir dinamicamente a porcentagem no cabeçalho do painel do aluno.

### 3. Auditar Políticas de RLS em Larga Escala (CONCLUÍDO)
* **Objetivo**: Garantir conformidade rigorosa com a LGPD nos perfis de Aluno, Instrutor e Secretaria.
* **Status**: As validações confirmaram que a tabela `health_restrictions` e o bucket `student-documents` estão totalmente inacessíveis a perfis de Instrutores. A implementação atende 100% dos requisitos de Zero Trust.

### 4. Otimizar Service Worker (PWA)
* **Objetivo**: Assegurar suporte offline robusto para visualizações rápidas em dispositivos móveis.
* **Tarefas Técnicas**:
  * Testar o comportamento do `@serwist/next` com o modo offline do navegador.
  * Garantir cache local de listagens operacionais essenciais para os instrutores.
