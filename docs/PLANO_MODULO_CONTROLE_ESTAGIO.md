# Plano funcional e técnico — Controle de Estágio Supervisionado

> Status: módulo publicado online; códigos de serviço `ar` e `usb` mantidos, com os rótulos atuais **AR — Salvamento** e **USB — APH**. Os horários de fim de semana e os 18 plantões de 26/27 de setembro foram remanejados com histórico. Decisões funcionais do item 18 registradas. Os cinco locais e o horário de guarda-vida foram confirmados. A escala é criada pela Coordenação dentro do módulo, sem depender de arquivo externo. O documento operacional é informado ao publicar o guarda-vida; o supervisor pode ser identificado após o serviço.

### Avaliação por plantão — implementação de 23/09/2026

A ficha aprovada foi incorporada à participação do cadete. Coordenação e administradores do módulo geram um convite individual com validade, copiam/compartilham o link e acompanham as versões. O oficial responde sem login, após o serviço. O token é aleatório, armazenado somente como hash, e não permite consultar outras fichas nem editar respostas enviadas. Alterações do contexto do plantão invalidam o convite para nova emissão.

São seis critérios: pontualidade e responsabilidade; segurança; execução técnica e materiais; comunicação e trabalho em equipe; postura profissional e respeito; iniciativa e aprendizagem. Respostas: necessita de reforço, atende ao esperado, acima do esperado e não observado. Não há nota automática nem resposta pré-marcada. Reforço exige orientação; situação relevante exige descrição. A opção impressa e sua transcrição seguem os mesmos critérios.

A administração confere o avaliador antes de liberar o resultado ao cadete. Notas administrativas não são exibidas ao aluno. Revisões preservam a resposta original. A ficha existente de presença e horas mantém as datas/carga previstas e passa a sugerir a referência da avaliação liberada e o nome do oficial; a homologação continua explícita e independente. Migration `0080`, com RLS, RPCs de escopo limitado e auditoria. Validações: 44 verificações transacionais de banco e testes de impressão contra conteúdo HTML injetado.

### Primeira entrega incremental

- Núcleo de domínio em `src/modules/internship-management`, migration `0068` com RLS e histórico append-only, além de testes Vitest e pgTAP.
- Coordenação: inicia o programa CFO 2026.1 em rascunho com os cinco locais de praia, publica o programa, cria plantão de USB/AR em GBM pelos oito padrões operacionais ou publica os cinco postos de guarda-vida de um sábado/domingo de forma atômica, lança a ficha física e homologa ou corrige a carga com justificativa.
- Cadete: consulta os próprios plantões e as cargas prevista, realizada e homologada; confirma presença e relata saída antecipada sem alterar horários oficiais.
- Controle central: a Coordenação consulta todos os cadetes em uma fonte consolidada, com carga prevista, realizada e homologada, saldo para 250 h, integralização, fichas pendentes e ocorrências abertas; pode filtrar o quadro e abrir todas as fichas de um cadete.
- Movimentações: a Coordenação cancela participação sem execução, substitui o cadete no mesmo turno, remaneja plantão GBM ou cria reposição vinculada a uma carga parcial, sempre com motivo e histórico.
- Agenda interna: a Coordenação filtra plantões e participações por período, situação, modalidade e cadete, visualizando lado a lado carga prevista, realizada e homologada, inclusive o histórico de movimentações.
- A configuração inicial cria 1º, 2º e 5º GBM, vagas adicionais USB/AR, os postos Fazendinha, Santa Inês, Araxá, Cidade Nova e Curiaú, reserva do Círio Fluvial e bloqueio estruturado de sexta/sábado para Silva Nunes. Ela não cria turnos nem horas.
- Relatórios: Excel e PDF da Coordenação usam a mesma consolidação oficial do painel, com resumo por cadete e agenda detalhada. O Excel mantém fórmulas auditáveis para saldos e integralização.
- Montagem semanal implementada localmente: seleção de GBMs e padrões para os sete dias, guarda-vida nos dois dias do fim de semana, prévia com rodízio, alterações manuais, retirada de serviços e publicação atômica com proteção contra repetição (migration `0069`).
- Rodízio implementado localmente: consulta de sugestões para USB/AR e guarda-vida, com carga homologada, reserva pendente, descanso antes/depois e impedimentos; preenchimento de um cadete ou cinco postos distintos, com escolha final pela Coordenação. Próximas entregas: agenda recorrente, demais operações DOP, consultas administrativas, termo de integralização, notificações e testes E2E. Conflitos recíprocos com ABM e integração QTS/saúde/calendário ficam para a etapa posterior definida pela Coordenação.

## 1. Objetivo

### Revisão de horários — decisão confirmada de 23/09/2026

- Segunda a sexta: preservar os padrões DU-USB-12 e DU-AR-12 devido às aulas. Saída ABM 18h, chegada estimada OBM 18h30, saída estimada OBM 05h30 e retorno ABM 06h do dia seguinte; carga de 12h incluindo deslocamento.
- Sábados e domingos: USB diurna das 07h45 às 19h45; USB noturna das 19h45 às 07h45 do dia seguinte; AR de 24h das 07h45 às 07h45 do dia seguinte. A carga começa na apresentação/passagem na OBM, sem deslocamento. A referência de rendição às 08h não adiciona nem subtrai minutos dessas jornadas.
- Guarda-vida mantém 10h–18h, com 8h.
- Novos padrões são versionados: registros anteriores conservam seus horários e referências. A regra nova vale para novos plantões, montagem semanal e rodízio. Os 18 plantões de 26/27 de setembro foram expressamente autorizados para remanejamento: novas participações preservam cadetes, locais e jornadas e se vinculam às anteriores, agora substituídas/canceladas.
- Contagem prevista e homologação permanecem distintas: horas oficiais dependem da ficha e da decisão administrativa.

Criar no CFO Alunos um módulo próprio para planejar, acompanhar, validar e consolidar a carga horária do Estágio Supervisionado do CFO, com rastreabilidade por cadete, data, horário, GBM, viatura, operação, supervisor e documento oficial.

O módulo deve responder, com poucos cliques:

- quanto cada cadete tem de carga prevista, realizada e validada;
- quanto falta para o mínimo curricular e para a meta de planejamento;
- onde, quando, em qual modalidade e sob qual supervisão cada carga foi cumprida;
- quais lançamentos aguardam validação ou apresentam conflito;
- quais cadetes correm risco de não concluir no prazo;
- quais remanejamentos, cancelamentos ou reposições ocorreram;
- como a carga está distribuída entre APH, Salvamento, GBMs e operações da DOP;
- quais registros sustentam a consolidação final e os relatórios oficiais.

## 2. Contexto verificado no repositório

O CFO Alunos usa Next.js 14, TypeScript estrito, Supabase/PostgreSQL, RLS, Server Actions, arquitetura DDD pragmática, relatórios com ExcelJS e suporte PWA.

Já existem componentes que devem ser integrados ao módulo:

- cadastro oficial dos 30 cadetes em `students` e `classes`;
- perfis e permissões em `profiles`;
- serviço interno e impedimentos em `duty_assignments` e `duty_impediments`;
- escalas importadas de PDF em `schedule_documents` e `schedule_assignments`;
- calendário integrado de cadetes e oficiais;
- QTS e calendário acadêmico;
- restrições operacionais de saúde;
- notificações, comunicados e alertas no painel;
- auditoria append-only e relatórios Excel/PDF.

O novo contexto deve ser criado em `src/modules/internship-management`. Ele poderá consultar os módulos existentes, mas deverá ter suas próprias entidades porque estágio exige horário real, carga validada, supervisor, avaliação, plano operacional e evidência documental — informações que não existem nas escalas atuais.

## 3. Regras oficiais do estágio CFO 2026

### 3.1 Período e carga

- Período operacional: 26/09/2026 a 13/12/2026.
- Carga curricular mínima: 250 horas por cadete.
- Meta nominal adotada: 252 horas por cadete.
- Total nominal da turma: 7.560 horas-cadete.
- O sistema deve registrar as 252 horas efetivamente validadas, exibindo separadamente:
  - mínimo exigido: 250 h;
  - carga validada: por exemplo, 252 h;
  - excedente: por exemplo, 2 h.
- Nenhum cadete poderá ser marcado como concluinte com menos de 250 horas validadas.
- Horas previstas ou apenas realizadas, mas ainda não validadas, não concluem o requisito curricular.

### 3.2 Locais e modalidades nos GBMs

- Unidades autorizadas nesta edição: 1º, 2º e 5º GBM.
- Emprego nos GBMs exclusivamente em:
  - USB — APH;
  - AR — Salvamento.
- Dia útil:
  - USB de 12 horas, uma vaga adicional por GBM;
  - AR de 12 horas, uma vaga adicional por GBM.
- Sábado e domingo:
  - USB com dois turnos de 12 horas por GBM e por dia;
  - AR com um plantão de 24 horas por GBM e por dia.

Esses parâmetros devem ser configuráveis por programa de estágio. Não devem ficar fixos no código, pois turmas futuras poderão usar outras unidades, períodos ou modalidades.

Os oito padrões operacionais da primeira edição ficam no catálogo `internship_shift_templates`:

| Código      | Dias de início  | Serviço     | Jornada | Saída ABM | Chegada OBM | Saída OBM | Retorno ABM |
| ----------- | --------------- | ----------- | ------: | --------: | ----------: | --------: | ----------: |
| DU-USB-12   | Segunda a sexta | USB         |    12 h |       18h |       18h30 |     05h30 |         06h |
| DU-AR-12   | Segunda a sexta | AR         |    12 h |       18h |       18h30 |     05h30 |         06h |
| SAB-USB-D12 | Sábado | USB diurna | 12 h | — | 07h45 | 19h45 | — |
| SAB-USB-N12 | Sábado | USB noturna | 12 h | — | 19h45 | 07h45 (domingo) | — |
| DOM-USB-D12 | Domingo | USB diurna | 12 h | — | 07h45 | 19h45 | — |
| DOM-USB-N12 | Domingo | USB noturna | 12 h | — | 19h45 | 07h45 (segunda) | — |
| SAB-AR-24 | Sábado | AR | 24 h | — | 07h45 | 07h45 (domingo) | — |
| DOM-AR-24 | Domingo | AR | 24 h | — | 07h45 | 07h45 (segunda) | — |

Nos dias úteis, a carga prevista começa na saída da ABM e termina no retorno à ABM. No fim de semana, começa na apresentação na OBM e termina na passagem ao próximo turno, sem deslocamento. Os campos ABM dos novos padrões de fim de semana ficam sem horário definido; não são usados para calcular carga. A Coordenação informa somente padrão, GBM, data, cadete e
supervisor; os horários são derivados e validados no banco.

### 3.3 Operações da DOP

- Guarda-vida aos sábados e domingos:
  - cinco cadetes por dia;
  - oito horas por cadete;
  - das 10h às 18h, horário confirmado em relatório operacional;
  - Fazendinha, Santa Inês, Araxá, Cidade Nova e Curiaú;
  - um cadete em cada local;
  - cada cadete será o quarto integrante adicional de um trio preexistente;
  - supervisão obrigatória por oficial.
- Círio Fluvial em 10/10/2026:
  - reserva para equalização da DOP;
  - quantidade de cadetes e horário ainda dependem da definição da DOP;
  - não deve gerar carga prevista ou validada antes da formalização.
- Círio Terrestre e outros planos ou eventos poderão ser cadastrados posteriormente.
- Toda operação que gerar carga deverá possuir ordem de serviço, plano operacional ou documento equivalente e oficial supervisor identificado.
- Os cadetes permanecem adicionais ao efetivo planejado pela DOP e não concorrem à escala extra.

### 3.4 Condição de emprego

- O cadete é sempre membro adicional.
- A presença do cadete não pode completar o efetivo mínimo de USB, AR ou equipe operacional.
- O cadete não substitui militar regularmente escalado.
- Não há atribuição de comando gerencial nesta fase.
- As tarefas devem ser compatíveis com conteúdos ensinados, treinados e autorizados.
- A atuação deve ser ampliada progressivamente conforme a conclusão de APH e Salvamento.

### 3.5 Supervisão

- Em USB ou AR: comandante da guarnição, acompanhado pela cadeia de comando da unidade.
- Em operação da DOP: oficial designado na ordem de serviço ou no plano operacional.
- Coordenação do CFO: controla escala, carga, remanejamentos, avaliações, pendências e consolidação.
- O supervisor deve ser identificável na ficha física e no lançamento da Coordenação, mesmo sem conta ou assinatura exigida para este fluxo.
- Nesta fase, a Coordenação recebe a ficha física e lança presença, horários, avaliação e eventuais ocorrências. O supervisor não acessa o módulo.

### 3.6 Conflitos e impedimentos

- Preservar dois cadetes de serviço na ABM por dia.
- O cadete de serviço na ABM não realiza estágio no dia anterior, no próprio dia nem no dia seguinte.
- A previsão-base deve evitar plantões de estágio em dias consecutivos.
- O QTS, avaliações, afastamentos, restrições médicas, indisponibilidade de viaturas e determinações superiores devem ser considerados.
- A restrição religiosa do Cadete Silva Nunes impede estágio e serviço da ABM às sextas-feiras e aos sábados; a carga deve ser equalizada nos demais dias.
- Remanejamentos são permitidos, mas exigem motivo, autor, data e preservação das regras de supervisão, segurança e carga mínima.

## 4. Princípios do módulo

### 4.1 Três cargas diferentes

O módulo nunca deve misturar:

1. **Carga prevista**: soma dos plantões publicados para o cadete.
2. **Carga realizada**: tempo efetivamente cumprido, ainda sujeito à conferência.
3. **Carga validada**: minutos homologados pela Coordenação a partir da ficha física e da análise de ocorrências; é a única carga oficial.

Cada painel e relatório deve identificar claramente qual dessas cargas está sendo mostrada.

### 4.2 Minutos como unidade de cálculo

- Armazenar e calcular carga em minutos inteiros.
- Exibir horas e minutos na interface.
- Não converter 60 minutos operacionais em tempo-aula de 50 minutos.
- Plantões que atravessam a meia-noite devem possuir data/hora inicial e final completas com fuso `America/Belem`.
- O sistema deve calcular a duração efetivamente realizada a partir dos horários, sem depender de número digitado livremente. Minutos homologados diferentes dos minutos realizados exigem decisão e justificativa da Coordenação.

### 4.3 Evidência e imutabilidade

- A escala prevista pode ser corrigida ou remanejada com histórico.
- Um registro validado não deve ser sobrescrito silenciosamente.
- Correção posterior deve criar revisão vinculada ao registro anterior, com justificativa.
- Referência ou cópia da ficha física, identificação do supervisor, horários, decisão sobre divergências e autor da homologação devem permanecer auditáveis.

### 4.4 Configuração em vez de regras fixas

Unidades, modalidades, capacidade diária, duração, período, mínimo curricular e meta nominal pertencem ao programa de estágio. A configuração inicial reproduzirá o projeto CFO 2026, mas o modelo deverá servir às turmas futuras.

## 5. Linguagem do domínio

| Termo                | Definição                                                               |
| -------------------- | ----------------------------------------------------------------------- |
| Programa de Estágio  | Configuração do estágio de uma turma e fase do CFO.                     |
| Modalidade           | USB, AR, guarda-vida ou operação especial.                             |
| Local de Estágio     | GBM, posto de praia ou local definido em plano operacional.             |
| Turno                | Janela planejada com início, fim, modalidade, local e capacidade.       |
| Escala de Estágio    | Conjunto de atribuições publicadas para um período.                     |
| Participação         | Vínculo entre um cadete e um turno.                                     |
| Registro de Execução | Presença, horários reais, carga apurada e observações.                  |
| Validação            | Aprovação que torna a carga contabilizável.                             |
| Supervisor           | Oficial responsável pela atuação e avaliação no turno.                  |
| Plano Operacional    | Documento da DOP que autoriza e organiza uma operação.                  |
| Remanejamento        | Alteração de data, local, modalidade ou cadete após a previsão inicial. |
| Reposição            | Participação destinada a recuperar carga não cumprida ou não validada.  |
| Equalização          | Redistribuição de oportunidades para reduzir diferenças de carga.       |
| Pendência            | Falta de informação, validação, documento ou carga que exige ação.      |

## 6. Fluxo funcional completo

### 6.1 Configuração do programa

1. Coordenação cria o programa para a turma e a fase do CFO.
2. Informa período, mínimo de 250 h e meta de 252 h.
3. Habilita modalidades, unidades, viaturas, durações e capacidades.
4. Define regras de conflito, descanso, supervisão e validação.
5. Registra marcos de formação: preparação essencial de APH, conclusão de APH I e conteúdos de Salvamento.
6. Publica o programa.

### 6.2 Planejamento e publicação

1. Coordenação escolhe datas, serviços, locais e cadetes e cria a escala no próprio módulo. As sugestões de rodízio apoiam essa escolha; a repetição semanal será uma evolução posterior.
2. O sistema verifica os conflitos já implementados. Integrações diretas com QTS, saúde e calendário ficam para uma etapa posterior.
3. O sistema classifica conflitos como bloqueio ou alerta justificável.
4. Coordenação atribui cadetes, GBM, viatura/modalidade e supervisor previsto.
5. Uma prévia mostra carga por cadete e capacidade remanescente.
6. A escala é publicada e passa a aparecer para cadetes e Coordenação.

### 6.3 Execução do plantão

1. O turno aparece no painel da Coordenação e na escala individual do cadete.
2. O cadete pode confirmar a própria presença e comunicar saída antecipada ou outra ocorrência, informando horário declarado e motivo. Esses dados são relato do cadete, sem alterar os horários e a carga oficiais.
3. A Coordenação recebe a ficha física, identifica o supervisor nela indicado e lança presença e horários reais.
4. A Coordenação registra saída antecipada, extensão, falta, dispensa, cancelamento ou substituição e transcreve avaliação e observações pertinentes.
5. A Coordenação anexa ou referencia a ficha física e a ordem de serviço ou plano operacional quando aplicável.
6. O lançamento segue para conferência e homologação pela Coordenação, com autoria rastreável.

### 6.4 Validação e contabilização

1. O sistema calcula os minutos realizados a partir dos horários informados na ficha.
2. Destaca divergências entre carga prevista e realizada, sem impor automaticamente o mesmo limite de minutos para todos os casos.
3. Em caso de saída antecipada ou extensão, a Coordenação registra motivo, decide se o justifica e define os minutos homologados, inclusive se considera a carga prevista. A decisão e a diferença entre minutos realizados e homologados ficam explícitas e auditáveis.
4. A Coordenação homologa ou devolve o lançamento para correção; confirmação do cadete não substitui essa homologação.
5. Somente após homologação os minutos aprovados passam à carga validada e atualizam saldo, projeção e alertas.

### 6.5 Correção, remanejamento e reposição

- Cancelamento mantém a ocorrência e seu motivo no histórico.
- Substituição cria nova participação vinculada à anterior.
- Remanejamento exige justificativa e nova verificação de conflito.
- Reposição deve indicar a pendência que pretende compensar.
- Horas de operação de reserva só entram após execução e formalização.

## 7. Estados recomendados

### Programa

`rascunho → publicado → encerrado`

### Turno

`rascunho → publicado → em_execucao → concluido`

Saídas alternativas: `cancelado`, `remanejado`.

### Participação

`prevista → lancada_pela_coordenacao → aguardando_homologacao → validada`

A confirmação do cadete é um evento opcional e independente; não é pré-requisito para o lançamento nem para a homologação.

Saídas alternativas: `falta`, `dispensada`, `substituida`, `cancelada`, `rejeitada`.

### Plano operacional

`reserva → em_definicao → autorizado → executado → encerrado`

Somente planos `autorizado` ou `executado` podem sustentar turnos contabilizáveis.

## 8. Modelo de dados proposto

Os nomes abaixo são sugestões. O desenho final deve ser criado em migrations posteriores à `0067`.

### 8.1 `internship_programs`

Cabeçalho e políticas do estágio.

Campos essenciais:

- `id`, `class_id`, `course_phase`;
- `name`, `description`;
- `starts_on`, `ends_on`;
- `required_minutes` — 15.000 para 250 h;
- `target_minutes` — 15.120 para 252 h;
- `status`;
- `timezone` — `America/Belem`;
- `created_by`, `published_by`, `closed_by` e respectivos horários;
- política de validação, descanso, conflito e excedente em colunas explícitas ou configuração versionada.

### 8.2 `internship_activity_types`

Catálogo configurável de modalidades.

Campos:

- `code`: `usb`, `ar`, `guarda_vida`, `operacao_especial`;
- `name`;
- `training_axis`: `aph`, `salvamento`, `integrado`;
- `default_minutes`;
- `requires_vehicle`, `requires_operation_plan`, `requires_officer_supervisor`;
- `active`.

### 8.3 `internship_sites`

Locais autorizados por programa.

Campos:

- `program_id`;
- `site_type`: `gbm`, `praia`, `evento`, `outro`;
- `code`, `name`;
- `gbm_number`, quando aplicável;
- `address_or_reference`;
- `active`.

Configuração inicial: 1º, 2º e 5º GBM e os cinco postos de guarda-vida confirmados: Fazendinha, Santa Inês, Araxá, Cidade Nova e Curiaú.

### 8.4 `internship_resources`

Viaturas ou posições de estágio.

Campos:

- `site_id`;
- `resource_type`: `usb`, `ar`, `posto_guarda_vida`, `equipe_operacional`;
- `code`, `display_name`;
- `regular_team_size`: três militares por posto de guarda-vida nesta edição;
- `capacity_per_shift`;
- `active`.

O recurso representa a vaga adicional de estágio, sem alterar o efetivo mínimo da guarnição.

### 8.5 `internship_shift_templates`

Catálogo de jornadas operacionais por programa.

Campos:

- `program_id`, `activity_type_id`;
- `code`, `name`;
- `start_weekdays` no padrão ISO, de segunda-feira `1` a domingo `7`;
- `journey_minutes`;
- `abm_departure_time`, `obm_arrival_time`, `obm_departure_time`, `abm_return_time`;
- `end_day_offset` e `active`.

O vínculo do turno com o padrão permite auditar qual regra gerou a previsão e impede alterações
incompatíveis de data, modalidade, horário ou duração.

### 8.6 `operation_plans`

Planos e ordens de serviço da DOP.

Campos:

- `program_id`;
- `code_or_number`, `title`;
- `operation_type`;
- `starts_at`, `ends_at`;
- `status`;
- `document_id` ou referência a arquivo privado;
- `issuing_unit`;
- `coordinator_name` e, quando disponível, `coordinator_profile_id`;
- `notes`;
- `created_by`, `authorized_by`, `authorized_at`.

O Círio Fluvial de 10/10 deve iniciar como `reserva`, sem quantidade, horário ou carga contabilizável.

### 8.7 `internship_shifts`

Ocorrência planejada de estágio.

Campos:

- `program_id`, `activity_type_id`, `site_id`, `resource_id`;
- `operation_plan_id`, quando aplicável;
- `starts_at`, `ends_at`, `planned_minutes`;
- `capacity`;
- `status`;
- `supervisor_required`;
- identificação prevista do supervisor, quando conhecida, sem exigir conta ou cadastro prévio específico;
- `additional_member_required` com valor obrigatório `true` para o programa CFO 2026;
- `source_type` e `source_id` para rastrear a origem da criação ou do remanejamento;
- `created_by`, `published_by` e auditoria temporal.

### 8.8 `internship_assignments`

Cadete previsto em um turno.

Campos:

- `shift_id`, `student_id`;
- `status`;
- `assignment_source`: `manual`, `geracao`, `remanejamento`, `reposicao` no fluxo previsto; o valor técnico `importacao` não implica uma funcionalidade de importação nesta etapa;
- `replaces_assignment_id`;
- `reason`, obrigatório para mudança manual, remanejamento ou reposição;
- `created_by`, `updated_by`;
- unicidade ativa de `shift_id + student_id`;
- bloqueio de sobreposição de turnos ativos para o mesmo cadete.

### 8.9 `internship_execution_records`

Fonte da carga realizada e validada.

Campos:

- `assignment_id`;
- `attendance_status`;
- `actual_starts_at`, `actual_ends_at`;
- `calculated_minutes`;
- `approved_minutes`;
- `validation_status`;
- identificação estruturada do supervisor informada na ficha (nome, posto/graduação, unidade e matrícula funcional quando disponível), sem exigir conta ou cadastro prévio no sistema;
- `paper_record_reference` e eventual arquivo privado da ficha física;
- `entered_by`, `entered_at`, `cadet_confirmed_at`;
- relato opcional do cadete: `cadet_reported_exit_at`, `cadet_occurrence_reason`, `cadet_reported_at`, mantido separado dos horários reais lançados pela Coordenação;
- `coordination_validated_by`, `coordination_validated_at`;
- `occurrence_type`, `occurrence_reason`, `occurrence_justified`, `decision_reason` e autor/data da decisão para divergência entre carga prevista, realizada e homologada;
- `notes`;
- `revision_of_id` para correção append-only.

Somente `approved_minutes` de registros homologados entram no total oficial. Diferenças entre `approved_minutes` e `calculated_minutes` exigem justificativa e decisão explícita da Coordenação; a duração realizada nunca é sobrescrita para simular horas homologadas.

### 8.10 `internship_evaluations`

Avaliação formativa por participação, implementada na migration `0080`. Este desenho substitui a lista inicial de nove critérios e o resultado de aptidão previstos no rascunho.

- Seis critérios e quatro respostas conforme a ficha aprovada descrita no início deste plano.
- Contexto do cadete/serviço, versão, origem digital ou papel, avaliador e unidade.
- Convite com hash do token, validade, destinatário/contato conferido e opção de revogação.
- Estados: `aguardando`, `respondida`, `liberada`, `devolvida` e `revogada`.
- Orientações, relato relevante e datas/autores de envio e revisão.
- Sem nota, classificação automática de aptidão ou alteração de carga horária.
- RLS para gestores; RPC pública limitada ao convite; RPC do cadete retorna somente suas avaliações liberadas, sem notas administrativas.

Avaliações não devem expor dados clínicos ou informações pessoais desnecessárias.

### 8.11 `internship_qualifications`

Marcos de formação que limitam tarefas autorizadas.

Campos:

- `program_id`, `student_id` ou aplicação coletiva;
- `qualification_code`: `aph_essencial`, `aph_i_concluido`, `salvamento_terrestre`, `salvamento_altura` etc.;
- `status`, `achieved_at`, `verified_by`, `evidence`.

O marco não deve impedir automaticamente a presença quando o projeto autorizar atuação básica; ele limita o tipo de tarefa e gera alertas para a Coordenação transcrever ou comunicar ao supervisor.

### 8.12 Pendências e auditoria

- Alertas dinâmicos devem ser calculados por consultas e funções de domínio.
- Ações de reconhecer, justificar ou resolver alertas podem ser registradas em `internship_alert_actions`.
- Alterações relevantes devem gerar eventos append-only em `internship_audit_events` ou usar o padrão global de `audit_logs`.
- Não permitir exclusão física de programas publicados, turnos publicados, participações realizadas ou registros validados.

## 9. Motor de conflitos

Antes de publicar ou remanejar uma participação, o serviço de domínio deve consultar:

- serviço interno em `duty_assignments`;
- escalas importadas e calendário em `schedule_assignments`;
- QTS e avaliações acadêmicas;
- `duty_impediments`;
- restrições operacionais de saúde;
- restrições religiosas cadastradas;
- outros turnos de estágio;
- intervalo de descanso configurado;
- qualificação/formação aplicável;
- disponibilidade do GBM, recurso e supervisor.

### Bloqueios duros

- sobreposição de horários;
- cadete afastado ou com impedimento impeditivo;
- sexta ou sábado para cadete com restrição religiosa correspondente;
- unidade/modalidade não autorizada no programa;
- capacidade do turno excedida;
- operação sem plano autorizado quando o plano for obrigatório;
- serviço ABM do cadete no dia anterior, no próprio dia ou no dia seguinte, no programa CFO 2026;
- registro sem supervisor identificável na ficha física;
- carga validada com horário inválido ou duração negativa;
- diferença entre minutos realizados e homologados sem decisão justificada da Coordenação;
- tentativa de validar o mesmo período duas vezes.

### Alertas justificáveis pela Coordenação

- estágio em dias consecutivos;
- incompatibilidade potencial com QTS ou avaliação;
- supervisor previsto ainda não identificado na ficha;
- carga realizada acima ou abaixo da duração planejada;
- desequilíbrio entre modalidades ou unidades;
- risco de descanso insuficiente;
- cadete próximo de ultrapassar a meta nominal.

No CFO 2026, o bloqueio ABM `D-1/D/D+1` deve ser tratado como regra forte. Exceções futuras somente poderão ser permitidas por configuração expressa, justificativa e auditoria.

## 10. Alertas e pendências

### Operacionais

- turno próximo sem supervisor previsto identificado;
- operação sem plano ou ordem de serviço;
- recurso/viatura indisponível;
- cadete impedido, afastado ou em conflito;
- vaga acima da capacidade;
- cancelamento sem reposição sugerida.

### De validação

- ficha física aguardando lançamento pela Coordenação;
- execução lançada aguardando homologação da Coordenação;
- horário real incompleto;
- carga divergente do turno;
- saída antecipada ou extensão aguardando decisão sobre a carga homologada;
- avaliação obrigatória ausente;
- documento oficial ausente;
- correção devolvida ao responsável.

### De carga e prazo

- cadete abaixo da trajetória esperada;
- carga validada insuficiente diante dos turnos restantes;
- diferença excessiva entre o maior e o menor saldo da turma;
- excesso de carga sem justificativa;
- pouca diversidade entre USB, AR e operações;
- concentração em apenas um GBM;
- risco de não atingir 250 h até 13/12;
- concluinte com menos de 250 h — bloqueio de encerramento.

### Política de alerta

- Cada alerta deve ter severidade, responsável, ação recomendada e link direto para resolução.
- Alertas iguais devem ser agrupados para evitar excesso de notificações.
- O painel deve priorizar: bloqueios, risco de prazo, validações vencidas e inconsistências de carga.
- Prazo sugerido: Coordenação lançar e homologar a ficha até 48 h após seu recebimento. O prazo de entrega da ficha física deve ser definido no procedimento administrativo.

## 11. Perfis e permissões

| Ação                                                     |                      Coordenação |                 Secretaria |                                   Cadete |
| -------------------------------------------------------- | -------------------------------: | -------------------------: | ---------------------------------------: |
| Configurar programa e criar/publicar escala              |                              Sim |                        Não |                                      Não |
| Remanejar/cancelar                                       |                              Sim |                        Não |                                      Não |
| Ver escala                                               |                    Turma inteira |     Leitura administrativa |                           Própria escala |
| Confirmar presença própria e relatar saída ou ocorrência |                    Não se aplica |                        Não | Sim, sem alterar horários/carga oficiais |
| Lançar ficha física, presença, horários e avaliação      |                              Sim |                        Não |                                      Não |
| Justificar ocorrência e definir minutos homologados      |                              Sim |                        Não |                                      Não |
| Homologar carga                                          |                              Sim |                        Não |                                      Não |
| Ver dados individuais                                    |                              Sim |       Carga administrativa |                           Próprios dados |
| Gerar relatórios                                         |                    Turma inteira | Relatórios administrativos |                       Extrato individual |
| Corrigir carga validada                                  | Sim, com justificativa e revisão |                        Não |                         Solicita revisão |

O supervisor permanece responsável operacional pela atuação e pela informação registrada na ficha física, mas não recebe acesso ao módulo nesta fase. Sua identificação estruturada é transcrita da ficha; não são exigidos conta, assinatura nem cadastro prévio específico no CFO Alunos. O módulo não cria quinto papel global.

## 12. Telas propostas

### Coordenação

1. `/coordenacao/estagio`
   - visão geral da turma;
   - carga validada, pendente e prevista;
   - cadetes em risco;
   - validações pendentes;
   - próximos turnos e alertas críticos.

2. `/coordenacao/estagio/agenda`
   - calendário diário, semanal e mensal;
   - filtros por modalidade, GBM, operação, supervisor e status;
   - criação, repetição, remanejamento e cancelamento.

3. `/coordenacao/estagio/cadetes`
   - ranking de saldo sem caráter competitivo;
   - previsto, realizado, validado, faltante e projeção;
   - distribuição por USB, AR, guarda-vida, GBM e operação.

4. `/coordenacao/estagio/cadetes/[id]`
   - extrato cronológico;
   - totais por categoria;
   - avaliações;
   - faltas, cancelamentos, reposições e histórico de correções.

5. `/coordenacao/estagio/operacoes`
   - planos DOP;
   - documentos, locais, horários, supervisores e capacidade;
   - reserva de equalização e posterior conversão em operação autorizada.

6. `/coordenacao/estagio/validacoes`
   - fila por antiguidade e severidade;
   - aprovação individual ou em lote somente quando não houver inconsistência;
   - devolução com motivo.

7. `/coordenacao/estagio/configuracao`
   - programa, período, cargas, unidades, modalidades, capacidades e regras.

8. `/coordenacao/estagio/relatorios`
   - relatórios Excel e PDF.

### Cadete

1. `/aluno/estagio`
   - próxima escala;
   - carga prevista, realizada, validada e faltante;
   - distribuição por modalidade;
   - registros aguardando validação;
   - confirmação própria de presença, relato de saída ou ocorrência, histórico e opção de solicitar revisão.

### Secretaria

1. `/secretaria/estagio`
   - consulta administrativa;
   - situação de integralização;
   - emissão de extratos e relatórios autorizados.

O resumo do estágio também deve aparecer como aba na ficha do aluno da Coordenação.

## 13. Painel e indicadores

Indicadores mínimos:

- cadetes com pelo menos 250 h validadas;
- cadetes com 252 h ou mais;
- média, menor e maior carga validada;
- horas previstas, realizadas, pendentes e validadas da turma;
- horas por USB, AR, guarda-vida e operações especiais;
- horas por GBM e por supervisor;
- número de validações vencidas;
- cancelamentos sem reposição;
- cadetes com risco de não conclusão;
- margem operacional disponível;
- projeção de conclusão pela capacidade dos turnos já publicados.

O indicador de progresso individual deve mostrar duas referências: linha mínima de 250 h e meta nominal de 252 h.

## 14. Relatórios

### Relatórios individuais

- extrato completo de estágio;
- ficha individual com data, horário, modalidade, GBM/local, viatura/posto, supervisor e carga;
- resumo por modalidade e unidade;
- avaliações e orientações;
- pendências, faltas, cancelamentos e reposições;
- termo de integralização com carga validada e excedente.

### Relatórios da turma

- mapa geral das 30 cargas;
- previsto × realizado × validado;
- equalização e risco de déficit;
- distribuição por modalidade, GBM, operação e período;
- lista de pendências de validação;
- cancelamentos e remanejamentos;
- supervisores e turnos acompanhados;
- operações DOP e carga gerada;
- consolidação final de 7.560 horas-cadete.

### Formatos

- Excel para tratamento administrativo e filtros;
- PDF para assinatura, despacho e arquivo;
- CSV apenas como formato auxiliar de exportação.

## 15. Integrações

### Serviço da ABM e outras escalas

Criar um serviço de leitura de conflitos que agregue `duty_assignments`, `schedule_assignments` e turnos de estágio. O estágio não deve duplicar essas tabelas nem depender de texto livre para identificar um serviço.

### QTS e gestão acadêmica

Consultar atividades, provas e janelas de aula para alertar incompatibilidades. O QTS não deve ser copiado para o estágio.

### Saúde e impedimentos

Usar apenas o resumo operacional autorizado. Diagnósticos e detalhes clínicos não entram no módulo.

### Documentos

Planos operacionais, ordens de serviço e comprovantes devem usar armazenamento privado e URLs assinadas. O módulo pode reutilizar a infraestrutura de documentos, mantendo categoria e vínculo próprios.

### Notificações

Reutilizar o padrão existente de eventos idempotentes para:

- escala publicada ou alterada;
- turno no dia seguinte;
- validação pendente;
- registro devolvido;
- risco de não conclusão;
- reposição atribuída.

## 16. Criação da escala e rodízio progressivo

A Coordenação cria a escala dentro do módulo, escolhendo os cadetes e os serviços. Não existe escala externa prévia a importar. A criação manual e as sugestões de rodízio descritas abaixo estão implementadas localmente para os padrões USB/AR e para os cinco postos de guarda-vida.

Fluxo disponível:

1. escolher a data, o serviço e o local; ou montar uma semana inteira em `/coordenacao/estagio/semana`;
2. selecionar cadetes manualmente ou consultar sugestões entre os elegíveis;
3. visualizar, por candidato, carga acumulada, plantões já previstos, último serviço e intervalo de descanso;
4. mostrar o efeito das escolhas sobre a distribuição de horas e folgas da turma e explicar cada sugestão;
5. revisar conflitos e ajustar a escala pela Coordenação antes da publicação;
6. registrar a escala publicada e atualizar as próximas sugestões a partir das atribuições, cancelamentos, substituições e homologações.

O rodízio deve comparar minutos, pois serviços de 8 h, 12 h e 24 h têm pesos distintos. A carga comprometida para planejamento considera, uma única vez por participação, os minutos homologados quando disponíveis ou os previstos enquanto a participação ativa aguarda homologação. Essa projeção não altera o total oficial, composto exclusivamente por horas homologadas. Participações canceladas sem execução deixam de reservar carga; o histórico permanece preservado.

O descanso deve considerar o fim do serviço anterior e o início do seguinte, inclusive plantões noturnos e compromissos futuros. A geração mantém o bloqueio de dias consecutivos já aprovado e respeita os impedimentos existentes. O desempate usa o maior intervalo livre mínimo entre o plantão anterior e o seguinte, seguido pelo número do cadete e identificador estável. Esses critérios ficam visíveis na tela. Um intervalo mínimo adicional ainda depende de definição da Coordenação. O descanso exibido usa os horários dos estágios publicados; as regras de ABM existentes atuam como bloqueio de disponibilidade.

As sugestões devem buscar equilíbrio de carga e folgas ao longo das escalas, mostrando diferenças e restrições que impeçam a equalização. A decisão final continua com a Coordenação. Uma saída antecipada só modifica a carga oficial após sua análise e homologação; não deve provocar uma reposição automática que desconsidere o descanso.

## 17. Plano de implementação

### Fase 0 — decisões e protótipo

- validar as decisões do item 18;
- criar wireframes das três experiências: Coordenação, cadete e Secretaria;
- confirmar os campos de identificação do supervisor na ficha física;
- validar critérios de rodízio, descanso e desempate para as sugestões de cadetes.

### Fase 1 — domínio e banco

- criar `src/modules/internship-management/domain`;
- implementar cálculo de minutos, estados, saldo, projeção e conflitos como funções puras;
- criar migrations `0068+` com tabelas, constraints, índices, RLS e auditoria;
- gerar tipos Supabase;
- escrever pgTAP para permissões, imutabilidade, dupla contagem e carga validada.

### Fase 2 — configuração e planejamento

- configurar o programa CFO 2026;
- cadastrar 1º, 2º e 5º GBM, USB, AR e guarda-vida;
- criar agenda e seleção de serviços/cadetes com prévia e sugestões de rodízio; acrescentar turnos recorrentes posteriormente;
- aplicar os conflitos existentes; ampliar integrações com ABM, QTS, saúde e calendário após validar o núcleo;
- publicar a escala inicial.

### Fase 3 — execução e validação

- criar lançamento da ficha física pela Coordenação e confirmação opcional de presença e relato de ocorrência pelo cadete;
- registrar presença, horários, avaliação e ocorrências, mantendo distintos os minutos previstos, realizados e homologados;
- criar fila de homologação da Coordenação;
- contabilizar carga validada;
- implementar revisão append-only.

### Fase 4 — painéis, alertas e relatórios

- dashboard da turma e extrato individual implementados;
- implementar alertas de prazo, conflito e validação;
- Excel e PDF consolidados implementados;
- incluir estágio na ficha do aluno e no painel inicial.

### Fase 5 — operações, notificações e uso móvel

- fluxo completo de planos da DOP;
- notificações idempotentes;
- operação offline limitada para consulta e rascunho de presença;
- sincronização segura quando a conexão retornar.

### Fase 6 — homologação

- criar e publicar uma escala dentro do módulo e conferir as sugestões das escalas seguintes;
- executar testes com cenários reais de cancelamento, substituição e carga parcial;
- validar perfis e RLS;
- conferir totais de todos os 30 cadetes;
- gerar relatório final de teste;
- implantar em ambiente de homologação antes da produção.

## 18. Decisões da Coordenação — 22/09/2026

1. **Validação da carga.** Nesta fase não haverá acesso do supervisor ao sistema nem dupla validação digital. A Coordenação recebe a ficha física, lança as informações e homologa a carga. Somente a homologação contabiliza.
2. **Confirmação do cadete.** O cadete pode confirmar a própria presença no sistema e relatar saída antecipada ou outra ocorrência. Seu relato não define horário nem carga oficial e não substitui o lançamento ou a homologação da Coordenação.
3. **Carga acima ou abaixo da prevista.** Não aplicar limite automático rígido que impeça a análise do caso. Registrar horários reais e a ocorrência. A Coordenação decide, com justificativa auditável, quantos minutos homologar.
4. **Saída antecipada e carga parcial.** O cadete informa a saída ou ocorrência; a Coordenação avalia se a retirada foi justificada e decide se considera os minutos efetivamente cumpridos, os minutos previstos ou outra quantidade fundamentada. O relato do cadete, os horários da ficha, a carga prevista e os minutos homologados permanecem separados. A decisão sobre o tratamento administrativo de situações concretas é caso a caso.
5. **Assinatura do supervisor.** Não exigir assinatura do supervisor nem confirmação dele no sistema nesta fase. A ficha física recebida pela Coordenação é a fonte da informação lançada.
6. **Oficial sem conta.** Não exigir conta nem cadastro prévio específico do supervisor no CFO Alunos. Registrar sua identificação estruturada conforme a ficha física, suficiente para rastrear a supervisão, e manter a homologação com a Coordenação.
7. **Dias consecutivos.** Bloquear na geração da previsão-base; permitir exceção apenas em remanejamento justificado e autorizado administrativamente.
8. **Regra ABM D-1/D/D+1.** Bloqueio duro para o programa CFO 2026.
9. **Avaliações ao cadete.** Mostrar resultado e orientação após homologação; manter observações administrativas restritas.
10. **Conclusão.** Concluinte a partir de 250 h validadas; meta de planejamento de 252 h. Registrar integralmente o excedente homologado.
11. **Origem da escala e rodízio.** A Coordenação escolhe cadetes e serviços e cria a escala no sistema. O histórico deve subsidiar sugestões para as próximas escalas, buscando equilíbrio de horas e descanso. Não há arquivo externo de escala inicial a importar. As sugestões estão implementadas localmente e devem ser validadas pela Coordenação.

As decisões 3 e 4 exigem que cada divergência tenha horário real, motivo, decisão fundamentada, minutos homologados e autor/data da homologação. O sistema deve permitir a análise, sem presumir que horas previstas foram trabalhadas.

## 19. Critérios de aceite

O módulo estará apto para homologação quando:

- os 30 cadetes estiverem vinculados ao programa correto;
- a Coordenação puder criar e publicar a escala escolhendo cadetes e serviços, sem duplicidade;
- as sugestões de rodízio explicarem carga comprometida e descanso, incluindo plantões futuros e respeitando impedimentos;
- nenhum conflito duro puder ser publicado;
- cada plantão informar data/hora, modalidade, local/recurso e supervisor;
- a Coordenação conseguir lançar a ficha física sem conta ou assinatura do supervisor;
- o cadete poder confirmar a própria presença e relatar saída ou ocorrência, sem alterar horários ou carga oficiais;
- somente carga homologada compuser o total oficial;
- saídas antecipadas e extensões mostrarem carga prevista, realizada e homologada, com decisão auditável quando divergirem;
- a soma individual puder ser reproduzida a partir dos registros detalhados;
- o sistema mostrar mínimo de 250 h e meta de 252 h;
- guarda-vida exigir cinco cadetes por sábado e domingo na configuração vigente;
- operações de reserva não gerarem carga antes de autorizadas e executadas;
- remanejamentos e correções manterem histórico completo;
- RLS impedir acesso indevido e alteração pelo cadete;
- Coordenação conseguir identificar imediatamente pendências e risco de déficit;
- relatórios individuais e da turma coincidirem com o painel;
- testes unitários, de banco, integração e Playwright cobrirem os fluxos críticos.

## 20. Testes indispensáveis

- cálculo de turno de 8 h, 12 h e 24 h, inclusive atravessando a meia-noite;
- carga parcial, saída antecipada e extensão com homologação justificada de minutos menores, iguais ou maiores que os realizados;
- total individual de 252 h e turma de 7.560 h;
- conclusão bloqueada abaixo de 250 h;
- separação entre previsto, realizado e validado;
- cinco guarda-vidas por sábado e domingo;
- bloqueio ABM D-1/D/D+1;
- bloqueio de sexta/sábado para a restrição religiosa cadastrada;
- conflito com QTS, impedimento e outro turno;
- ausência de identificação do supervisor na ficha ou plano operacional obrigatório;
- cancelamento, substituição, remanejamento e reposição;
- revisão append-only de registro validado;
- RLS de Coordenação, Secretaria e cadete, sem acesso digital de supervisor;
- relatórios reproduzindo os mesmos totais do domínio;
- criação da escala sem atribuições duplicadas;
- rodízio entre serviços de 8 h, 12 h e 24 h, sem contar duas vezes a mesma participação;
- sugestões considerando compromissos futuros, descanso, cancelamentos, substituições e homologação parcial.

## 21. Arquivos previstos para a implementação

```text
src/modules/internship-management/
  domain/
    internshipProgram.ts
    workload.ts
    conflicts.ts
    validation.ts
    alerts.ts
  application/
    types.ts
    planning.ts
    execution.ts
    reporting.ts
  infrastructure/
    database.ts
    queries.ts
    conflictSources.ts
    reports.ts
  presentation/
    actions.ts

src/components/app/internship/
src/app/(app)/coordenacao/estagio/
src/app/(app)/secretaria/estagio/
src/app/(app)/aluno/estagio/
src/app/api/reports/estagio/
supabase/migrations/0068_*.sql
supabase/tests/internship.test.sql
```

O módulo deve seguir os padrões atuais de `schedule-repository`, `operational-duty`, `academic-management`, relatórios e auditoria, sem transformar as escalas existentes em fonte de carga oficial.

### Verificação da entrega de rodízio — 22/09/2026

- Consultas restritas à Coordenação ativa, usando cliente autenticado e RLS.
- Histórico paginado completo; falhas impedem exibir sugestões calculadas com dados parciais.
- Publicação mantém as validações transacionais existentes de conflito e capacidade.
- Testes de domínio, paginação, autorização e interação cobrem reserva futura, homologação zero/parcial, cancelamento, descanso, cinco cadetes distintos e descarte de resposta antiga após mudar a data.
- Entrega local; não aplicada ao ambiente remoto.

### Entrega da montagem semanal — 22/09/2026

A Coordenação escolhe a segunda-feira, os GBMs e os padrões operacionais; a prévia inclui somente serviços compatíveis com os dias e o período do programa. O guarda-vida acrescenta os cinco postos de cada dia do fim de semana. As escolhas desta prévia reservam carga e disponibilidade umas para as outras. A distribuição mostra horas e dias sem estágio, incluindo retornos noturnos. Esses dias não representam folga de outros serviços.

A Coordenação pode ajustar cadetes e supervisores, informar o documento e oficial de cada dia de guarda-vida e retirar serviços (no guarda-vida, os cinco postos do dia juntos). Nenhuma vaga vazia pode ser publicada. A publicação da semana usa uma única transação; falha em qualquer plantão desfaz todo o lote. O identificador da solicitação impede duplicar o lote em uma repetição do envio. A prévia permanece no navegador até publicar ou sair da página.

O bloqueio de dias consecutivos também cobre plantões noturnos iniciados em dias seguidos. Serviços com capacidade já ocupada são sinalizados na prévia. Sugestões são sequenciais e podem deixar vagas sem cadete disponível; a Coordenação revisa a configuração antes de publicar.

## Próxima etapa registrada em 23/09/2026 — escala operacional e permanência

**Solicitação da Coordenação: implementação progressiva. O PDF operacional e a escala de estágio na tela inicial foram concluídos; permanência e balanceamento conjunto permanecem pendentes.** Complementa os relatórios administrativos existentes e prioriza a integração entre estágio e permanência. QTS, saúde e calendário continuam adiados.

### 1. PDF operacional para impressão

Disponibilizar uma escala de serviço por período selecionado, com uma linha por participação e os seguintes campos:

| Campo | Regra de apresentação |
| --- | --- |
| Número | Número do cadete na turma. |
| Nome do cadete | Identificação operacional pelo nome de guerra, coerente com as demais escalas. |
| Início e término | Data e horário de ambos, em America/Belem, inclusive a virada de dia. |
| Local | GBM, posto ou local atribuído ao serviço. |
| Tipo de serviço | USB, AR, guarda-vida ou função da permanência, quando integrada. |
| Uniforme | Um dos quatro uniformes informados pela Coordenação, configurado no serviço e exibido na escala. |
| Situação de carga | Carga de estágio já cumprida e homologada pelo cadete, identificada como **Carga de estágio homologada**, sem incluir horas futuras apenas previstas. |

Proposta de implementação: aproveitar os dados e a infraestrutura de PDF já existentes, acrescentar o uniforme ao planejamento e uma consulta operacional comum ao PDF e à tela inicial. Incluir período e data/hora da emissão; a carga exibida corresponde à apuração na emissão. O arquivo emitido conserva esse retrato, e uma nova emissão usa os dados atualizados.

**Aceite:** informações essenciais legíveis na impressão, cabeçalhos repetidos quando houver mais de uma página, horários noturnos corretos, carga igual à consolidação oficial e escala vigente respeitando cancelamentos e substituições.

#### Uniformes informados pela Coordenação

| Código | Denominação | Aplicação inicial na escala |
| --- | --- | --- |
| **3º A** | Operacional / Prontidão | Seleção inicial para USB e AR, sujeita a ajuste no serviço. |
| **2º C** | Passeio / Representação | Disponível para seleção em serviço que exija apresentação/representação. |
| **4º A** | Educação Física | Disponível para seleção em atividade física. |
| **4º D** | Operações Aquáticas / Serviço de Guarda-Vidas | Seleção inicial para guarda-vida. |

O campo da escala deve guardar o uniforme escolhido para aquela publicação, permitindo revisão antes de publicar e preservando o valor usado em impressões históricas. A permanência não terá um uniforme fixado só pelo nome da função: a administração selecionará uma das quatro opções conforme a missão. A correspondência inicial de USB/AR e guarda-vida acima decorre das denominações recebidas; poderá ser ajustada pela Coordenação na escala.

### 2. Exibição automática na tela inicial do CFO Alunos

- Mostrar os serviços publicados junto às escalas já aparentes, como Oficial de Academia e Aluno de Dia, com os campos operacionais acima.
- Alimentar a tela diretamente das escalas criadas no sistema; a impressão PDF será uma saída opcional da mesma fonte de dados.
- Refletir publicação, alteração, substituição e cancelamento, evitando duplicar registros também presentes em fontes antigas de escalas.
- Respeitar a visibilidade de cada perfil; a consulta para a tela inicial deve expor somente os campos operacionais necessários.

**Aceite:** uma escala publicada aparece na tela inicial sem anexar PDF; a mesma participação tem cadete, serviço, uniforme, local e horários coerentes na tela e em uma nova impressão.

### 3. Escala adjacente de permanência

Planejar e gerenciar a permanência junto ao estágio, aproveitando o contexto existente de serviço operacional (`operational-duty`) e seus registros. A implementação deverá mapear os cargos legados para as funções desejadas, preservando o histórico e evitando um segundo cadastro concorrente de permanência.

**Decisão de 24/09/2026 para o efetivo:** **2 cadetes por turno**, sendo um Aluno de Dia e um Apoio 1. A composição anterior de até quatro foi substituída para preservar cadetes disponíveis para USB, AR e guarda-vidas. Na escala recebida para 21–27/09, os Apoios 2 e 3 foram cancelados com registro de auditoria; os dois primeiros nomes permaneceram em cada turno.

| Efetivo | Composição |
| --- | --- |
| 2 | Aluno de Dia + Apoio 1 |

A administração escolhe data, início, término, local, uniforme e os dois cadetes. Pode revisar sugestões, publicar, substituir, remanejar e cancelar com histórico. Um cadete não ocupa duas funções no mesmo serviço. O horário padrão é 06h–18h; na escala recebida, os segundos turnos de sábado e domingo são 18h–06h do dia seguinte.

As permissões de gestão da permanência devem ser definidas explicitamente antes da implantação; a delegação atual de administrador do estágio não concede automaticamente acesso a outros módulos. O cadete consulta os serviços publicados conforme o acesso definido.

### 4. Distribuição equilibrada entre estágio e permanência

- Consultar os compromissos de ambos os serviços ao sugerir e ao publicar qualquer uma das escalas: o bloqueio deve funcionar nos dois sentidos, inclusive após alterações.
- Comparar horas comprometidas, quantidade de dias de serviço e intervalos reais de descanso antes/depois de cada jornada, considerando a passagem da meia-noite e as reservas futuras.
- No rodízio do estágio, entre cadetes com a mesma carga comprometida, sugerir primeiro quem teve menos plantões do tipo escolhido (USB, AR ou guarda-vidas) e menos passagens pelo GBM escolhido. Restrições e descanso vêm antes da preferência de rodízio; a cobertura integral de todos os tipos e GBMs depende das vagas futuras.
- Preservar as regras atuais de impedimento: serviço ABM bloqueia estágio em D−1, D e D+1; alterações dessa regra dependem de decisão específica.
- Apresentar ao planejador os totais de estágio, os totais de permanência e a ocupação conjunta, explicando o motivo das sugestões. Cancelamentos e substituições devem atualizar as reservas sem dupla contagem.
- Manter a homologação curricular do estágio separada da permanência. A ocupação conjunta serve ao rodízio e ao descanso; horas de permanência não passam a compor as 250 horas por esta integração.
- A Coordenação revisa o rodízio e decide a publicação. Intervalos mínimos adicionais, janela de comparação e eventuais pesos diferentes por função ou jornada ainda precisam ser definidos, sem criar coeficientes arbitrários.

**Aceite:** o mesmo conflito é impedido independentemente de qual escala foi criada primeiro; as sugestões consideram os dois históricos e os serviços futuros; substituições não duplicam carga; a permanência não altera os saldos curriculares do estágio.

### Ordem de entrega proposta

1. Cadastro de uniforme, consulta operacional e PDF da escala de estágio.
2. Reuso dessa consulta na tela inicial, com atualização após as mudanças de escala.
3. Planejamento da permanência com composição de 2 a 4 cadetes e verificação de conflitos nos dois sentidos desde a primeira publicação.
4. Rodízio conjunto, indicadores de equilíbrio e validação da distribuição com a Coordenação.

### Entrega da escala operacional em PDF — 23/09/2026

- Disponível para administradores do estágio na página de gestão e na agenda, com impressão em `/api/estagio/escala?inicio=AAAA-MM-DD&fim=AAAA-MM-DD`. O período padrão é o do programa.
- Traz somente participações vigentes de turnos publicados no período, com número, nome de guerra, serviço, local/recurso, início, término, uniforme e carga curricular já homologada. Horários usam o fuso de Belém; cancelamentos e substituições não aparecem como serviço ativo.
- As quatro opções de uniforme foram cadastradas. Criação individual e montagem semanal permitem selecionar o uniforme; USB/AR sugere 3º A e guarda-vida sugere 4º D. A agenda permite conferir ou ajustar uniformes de plantões já publicados, com histórico de auditoria. Plantões antigos sem escolha gravada exibem a opção inicial correspondente ao tipo de serviço até serem conferidos.
- Implementação usa a consolidação oficial de carga e de agenda do módulo. O PDF é A4 paisagem, com cabeçalho e títulos de coluna em cada página.
- Migration 0075 aplicada no Supabase online com RLS. Publicação ativa: `dpl_GDZmKygjGXtDtCwbaeMgfX8hV9ac` em `https://cfo-alunos.vercel.app`. Conferência remota: 18 plantões publicados e 288 horas previstas; assinaturas dos plantões e participações idênticas antes/depois da migração.
- Validação: 54 testes de aplicação/relatórios, 107 verificações centrais de banco e 29 da escala/uniforme; TypeScript, build de produção, geração local autenticada de PDF com dados existentes, extração textual e revisão visual de amostra paginada.

### Entrega da escala de estágio na tela inicial — 23/09/2026

- Painéis de Cadete, Coordenação, Instrutor e Secretaria exibem os plantões publicados dos próximos sete dias diretamente do banco, ao lado dos demais quadros de serviço. Cadete logado tem seu próprio plantão em destaque.
- Cada participação mostra número e nome de guerra, tipo de serviço, local/recurso, início e término no fuso de Belém, uniforme e carga curricular já homologada. Horários que cruzam a meia-noite mostram as duas datas.
- A leitura é limitada a perfis ativos e entrega apenas dados operacionais. Plantões cancelados, substituídos ou não publicados não aparecem. A carga usa os registros de execução homologados vigentes; plantões futuros não são contados como cumpridos.
- Migration 0076 aplicada no Supabase online e deployment `dpl_3si14yQmh8gniiNKtqnpyeqgVoke` ativado em `https://cfo-alunos.vercel.app`. Conferência remota: 18 plantões e 288 horas previstas, sem mudança nas assinaturas dos plantões e participações.
- Validação: dez verificações SQL de autorização e conteúdo, TypeScript, build de produção, teste autenticado local dos painéis de Cadete e Coordenação e resposta do login público. A consulta de tela inicial usa os mesmos registros oficiais do PDF, sem importar arquivo.

### Rótulos de serviço e efetivo ativo — 23/09/2026

- As descrições exibidas de AR e USB passaram a **AR — Salvamento** e **USB — APH**. Os códigos técnicos, jornadas, plantões e horas não mudaram. A alteração do catálogo foi auditada na migration 0077; a 0079 ajusta a inicialização em novos ambientes.
- A Milena, nº 27, já tinha `course_status='excluido'`, situação `desligado` e nenhum perfil ativo. A migration 0078 fez o controle de carga, os relatórios derivados e o seletor de planejamento considerarem apenas `course_status='matriculado'`; novas atribuições a cadetes inativos são bloqueadas.
- O registro histórico da Milena continua no banco. Verificação online: 30 cadetes no controle e no planejamento, Milena ausente; 18 plantões publicados e 288 horas previstas preservados.

### Registro de publicação — avaliação do estágio

- Publicado em 23/09/2026 em `https://cfo-alunos.vercel.app`, deployment `dpl_3XZmT5p9xYk2py5ratqvZPknMbtD`; migration `0080` aplicada no banco online e local.
- Verificações: 44 testes de banco da avaliação; 107 verificações de regressão do núcleo em transação isolada; 5 testes de impressão/homologação; TypeScript e build de produção aprovados.
- Navegador local: convite, resposta sem login, seis respostas inicialmente vazias, orientação obrigatória para reforço, revisão, privacidade do cadete, revogação e impressão A4 em uma página. Contas e dados fictícios removidos.
- Conferência online: RLS ativa, acesso anônimo direto à tabela bloqueado, criação de convites restrita; 18 plantões e 288 horas previstas preservados, com assinaturas dos registros idênticas às anteriores. Botão de envio e ficha de homologação adaptada conferidos na sessão autenticada da Coordenação.

### Demonstração de passado, presente e futuro — 23/09/2026

- Nova área administrativa em `/coordenacao/estagio/teste`, acessível à Coordenação e aos administradores do estágio. Botão **Testar passado, presente e futuro** no painel.
- Cadete fictício, três plantões relativos à criação (12h passadas, 24h em andamento e 12h futuras), relógio simulado que avança por ação explícita. Permite experimentar entrada/saída, avaliação, revisão, homologação, visão do cadete e contador de horas sem aguardar o fim de semana.
- Reutiliza formulário e validação da avaliação, cálculo de minutos, soma e saldo do domínio oficial. A simulação grava apenas no armazenamento local, por conta e navegador. Não cria alunos, turnos, convites nem avaliações no banco e não altera os relatórios oficiais.
- Exclusão local integral pelo botão **Excluir todos os dados deste teste**, seguida de criação opcional do zero. Resumo impresso identificado como teste. O GPS é simulado, sem captura da localização.
- Verificação automatizada: bloqueios antes do término, revisão sem soma automática, impossibilidade de dupla homologação, sequência 12 → 36 → 48 horas e saldo de 202h, exigência de orientação para reforço, recuperação após reabrir e exclusão sem remover outros dados do navegador. O teste de interface também impede chamadas à gravação oficial.
- Conferência no navegador online: avaliação fictícia enviada/revisada, contador 12 → 36 → 48 horas, saldo de 202h, plantão futuro bloqueado antes do avanço, persistência ao recarregar e exclusão confirmada após reabertura. Demonstração deixada na conta atual com apenas o passado avaliado e 12h homologadas, presente em andamento e futuro agendado. Formulários simultâneos têm identificadores distintos para acessibilidade.
- Publicação final da demonstração: `dpl_8WntSrFLsT7zteU5waJNSivHMCK9`, ativada em `https://cfo-alunos.vercel.app` em 23/09/2026. Sem migração ou inclusão de dados de teste no banco oficial.
