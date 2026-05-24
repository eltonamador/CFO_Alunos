# Plano Tecnico - Escalas Operacionais e Comunicados da Turma

> Status: planejamento aprovado para documentacao. Nenhuma migration, tabela ou codigo funcional foi criado nesta etapa.

## 1. Objetivo

Criar um novo contexto operacional no CFO Alunos para que a Coordenacao gerencie, a partir dos 30 alunos reais cadastrados no Supabase Cloud, as funcoes diarias da turma, os impedimentos temporarios, o painel operacional do dia e os comunicados oficiais.

Os modulos "Escala de Funcoes da Turma", "Impedimentos", "Painel Operacional do Dia" e "Escala com Justica Automatica" devem ser implementados como um unico sistema integrado de escala operacional. O modulo "Comunicados da Turma" deve ser separado no dominio, mas exibido no mesmo painel diario quando houver comunicados pendentes.

## 2. Contexto Verificado

Documentacao lida antes deste plano:

- `docs/02-ubiquitous-language.md`
- `docs/03-domain-map.md`
- `docs/04-bounded-contexts.md`
- `docs/05-data-model.md`
- `docs/06-use-cases.md`
- `docs/STATUS_ATUAL.md`
- `docs/PROXIMAS_TAREFAS.md`

Schema e migrations verificados:

- Migrations locais existentes: `0001` a `0021`, cobrindo identidade, turma, alunos, saude, documentos, canga, enxoval, auditoria, views, RLS e storage.
- Supabase Cloud consultado por leitura real das tabelas atuais: `students` possui 30 alunos, `profiles` possui perfis ativos, `classes` possui a turma, `health_restrictions`, `audit_logs`, `canga_assignments` e `equipment_requirements` existem e respondem.
- Tipos remotos gerados pelo Supabase nao incluem tabelas de escala ou comunicados.
- Consultas reais para `duty_roles`, `duty_rosters`, `duty_assignments`, `duty_impediments`, `duty_assignment_logs`, `announcements`, `announcement_attachments` e `announcement_reads` retornaram ausencia no schema remoto.

Conclusao: as tabelas novas ainda precisam ser criadas em migration futura. Este documento sugere o desenho, mas nao altera banco.

## 3. Linguagem do Modulo

Termos novos propostos:

| Termo | Definicao |
|---|---|
| Escala Operacional | Planejamento de funcoes por data para a turma CFO 2026.1. |
| Funcao da Turma | Papel diario exercido por um aluno, como Aluno de Dia ou Subxerife. |
| Escala do Dia | Conjunto de atribuicoes de uma data especifica. |
| Impedimento | Restricao temporaria que bloqueia ou alerta a escala de um aluno. |
| Substituicao | Troca automatica ou manual de aluno em uma funcao ja atribuida. |
| Justica da Escala | Regra de distribuicao que evita repeticao antes do ciclo da turma e equilibra totais. |
| Comunicado | Mensagem oficial criada pela Coordenacao, geral ou individual, com confirmacao de leitura. |

Padrao de exibicao de aluno:

```text
NOME DE GUERRA - NUMERO
```

No front-end, se o projeto mantiver o padrao visual atual com travessao, renderizar visualmente como `NOME DE GUERRA - NUMERO` ou com o travessao ja usado no sistema. No banco e nos testes, armazenar sempre `student_id`; nunca duplicar nome/numero como fonte de verdade.

## 4. Escopo Funcional

### 4.1 Escala operacional integrada

Funcoes iniciais:

- Aluno de Dia
- Subxerife
- Aluno Alimentacao
- Aluno Logistica

Regras:

- Usar somente alunos reais da tabela `students`.
- Considerar apenas alunos da turma selecionada, sem `deleted_at`, e em situacao elegivel.
- Exibir alunos no formato oficial de identificacao unificada.
- Evitar repetir aluno na mesma funcao antes que todos os elegiveis tenham sido escalados.
- Evitar aluno em duas funcoes no mesmo dia.
- Evitar escala em dias consecutivos quando houver alternativa viavel.
- Contar quantas vezes cada aluno exerceu cada funcao.
- Contar total geral de funcoes por aluno.
- Respeitar impedimentos ativos por data e funcao.
- Permitir edicao manual pela Coordenacao.
- Exigir justificativa em toda troca manual.
- Manter historico append-only das alteracoes.
- Gerar substituto automaticamente quando um impedimento tornar uma atribuicao invalida.

### 4.2 Impedimentos

Tipos iniciais:

- ausencia
- dispensa
- restricao_medica
- missao_externa
- problema_administrativo
- outro

Campos obrigatorios:

- aluno
- tipo
- data inicial
- data final
- motivo
- funcoes afetadas
- responsavel pelo registro
- status ativo/inativo

Regra LGPD: impedimento de tipo `restricao_medica` pode ser exibido para Instrutor como alerta operacional, mas nao deve revelar diagnostico, observacao clinica ou dado sensivel. Quando derivado de saude, usar apenas `health_restrictions.operational_summary` ou texto operacional curado pela Coordenacao.

### 4.3 Painel Operacional do Dia

Tela unica para Coordenacao e Instrutor, com variacao por permissao:

- data atual
- Aluno de Dia
- Subxerife
- Aluno Alimentacao
- Aluno Logistica
- impedimentos ativos
- substituicoes feitas
- alertas da escala
- comunicados pendentes
- botao para baixar escala diaria em PDF
- botao para visualizar escala semanal

### 4.4 Comunicados da Turma

Fluxo:

- Coordenacao cria comunicado.
- Comunicado pode ser geral, por turma, por perfil ou individual.
- Comunicado pode ser apenas texto ou texto acompanhado de materiais.
- Coordenacao pode anexar arquivos PDF, Word, Excel, imagens e videos curtos, com limites de tamanho e tipo.
- Coordenacao pode informar link externo quando o material for pesado, por exemplo video hospedado fora do sistema.
- Aluno visualiza no proprio perfil.
- Aluno baixa ou abre os materiais vinculados ao comunicado, conforme permissao.
- Aluno confirma leitura.
- Coordenacao ve quem leu e quem ainda nao leu.
- Painel mostra percentual de leitura.

Exemplo de indicador:

```text
Comunicado enviado para 30 alunos. Lidos: 24. Pendentes: 6.
```

## 5. Perfis de Acesso

| Perfil | Permissoes |
|---|---|
| Coordenacao | Cria escala, gera escala automatica, registra impedimentos, edita escala com justificativa, cria comunicados, anexa materiais aos comunicados, visualiza relatorios, baixa PDFs, ve historico completo. |
| Instrutor | Visualiza painel do dia, escala, impedimentos operacionalmente relevantes e comunicados operacionais. Nao ve diagnostico medico nem dados administrativos sensiveis. |
| Aluno | Visualiza sua funcao, visualiza escala da turma se autorizado pela Coordenacao, le comunicados, confirma leitura. Nao edita escala nem impedimentos. |
| Secretaria | Fora do escopo operacional inicial. Pode ser considerada no futuro para visualizar comunicados administrativos ou registrar impedimentos administrativos se a Coordenacao aprovar. |

## 6. Telas Necessarias

### Coordenacao

1. `/coordenacao/operacional`
   - Painel Operacional do Dia.
   - Cards das quatro funcoes.
   - Lista de impedimentos ativos.
   - Alertas e substituicoes.
   - Comunicados pendentes.
   - Acoes: gerar escala, baixar PDF, abrir semana.

2. `/coordenacao/operacional/escala`
   - Visao semanal e mensal.
   - Botao "Gerar automaticamente".
   - Edicao manual por celula.
   - Modal de justificativa obrigatoria.
   - Contadores por aluno e por funcao.

3. `/coordenacao/operacional/impedimentos`
   - Cadastro e listagem de impedimentos.
   - Filtros por aluno, tipo, periodo, status.
   - Acao de ativar/inativar.

4. `/coordenacao/comunicados`
   - Criar comunicado.
   - Escrever comunicado simples de texto.
   - Anexar materiais em PDF, Word, Excel, imagem ou video curto.
   - Informar link externo de apoio quando o arquivo for pesado.
   - Visualizar lista de anexos antes de publicar.
   - Selecionar publico.
   - Acompanhar leitura.
   - Reenviar ou destacar pendentes, se aprovado em fase futura.

### Instrutor

1. `/instrutor/operacional`
   - Painel do dia.
   - Escala vigente.
   - Impedimentos relevantes sem dados sensiveis.
   - Comunicados operacionais.

### Aluno

1. `/aluno/operacional`
   - Minha funcao hoje e proximas funcoes.
   - Escala da turma se autorizada.
   - Comunicados pendentes de leitura.

2. `/aluno/comunicados`
   - Caixa de comunicados.
   - Leitura de comunicado com anexos.
   - Download ou abertura de materiais autorizados.
   - Confirmacao de leitura.
   - Historico de comunicados lidos.

## 7. Modelo de Dados Sugerido

As tabelas abaixo devem ser criadas apenas em etapa futura de migration.

### 7.1 `duty_roles`

Catalogo das funcoes escalaveis.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `code` | text unique | `aluno_dia`, `subxerife`, `aluno_alimentacao`, `aluno_logistica` |
| `name` | text | Nome exibido |
| `description` | text null | Explicacao curta |
| `sort_order` | int | Ordem na UI e no PDF |
| `active` | boolean | Default `true` |
| `created_at` | timestamptz | Default `now()` |
| `updated_at` | timestamptz | Trigger `set_updated_at()` |

### 7.2 `duty_rosters`

Cabecalho de uma escala por turma e periodo.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid FK `classes(id)` | Turma CFO 2026.1 no MVP |
| `period_start` | date | Inicio do periodo |
| `period_end` | date | Fim do periodo |
| `status` | text | `rascunho`, `publicada`, `arquivada` |
| `generated_by` | uuid FK `auth.users(id)` | Quem gerou |
| `generated_at` | timestamptz null | Quando gerou |
| `published_by` | uuid FK `auth.users(id)` null | Quem publicou |
| `published_at` | timestamptz null | Quando publicou |
| `notes` | text null | Observacao |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints:

- `period_end >= period_start`
- indice em `(class_id, period_start, period_end)`
- evitar sobreposicao de escalas publicadas para a mesma turma, se a regra for adotada.

### 7.3 `duty_assignments`

Atribuicoes efetivas por data e funcao.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | |
| `roster_id` | uuid FK `duty_rosters(id)` | |
| `class_id` | uuid FK `classes(id)` | Denormalizacao util para RLS/consulta |
| `duty_date` | date | Data da funcao |
| `role_id` | uuid FK `duty_roles(id)` | |
| `student_id` | uuid FK `students(id)` | Aluno escalado |
| `status` | text | `prevista`, `confirmada`, `substituida`, `cancelada` |
| `assignment_source` | text | `automatica`, `manual`, `substituicao_automatica` |
| `manual_reason` | text null | Obrigatorio se `assignment_source='manual'` |
| `replaced_assignment_id` | uuid null FK `duty_assignments(id)` | Liga substituicao ao registro anterior |
| `created_by` | uuid FK `auth.users(id)` | |
| `updated_by` | uuid FK `auth.users(id)` | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints:

- unique `(duty_date, role_id)` para uma funcao por dia.
- unique parcial `(duty_date, student_id)` onde `status in ('prevista','confirmada')` para impedir aluno em duas funcoes no mesmo dia.
- check de justificativa manual: se `assignment_source='manual'`, `manual_reason` nao pode ser vazio.

### 7.4 `duty_impediments`

Impedimentos temporarios por aluno.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | |
| `student_id` | uuid FK `students(id)` | |
| `impediment_type` | text | Tipos definidos no item 4.2 |
| `starts_on` | date | |
| `ends_on` | date | |
| `reason` | text | Motivo administrativo/operacional |
| `affected_role_ids` | uuid[] null | Null ou vazio significa todas as funcoes |
| `operational_note` | text null | Texto LGPD-safe para Instrutor |
| `active` | boolean | Default `true` |
| `registered_by` | uuid FK `auth.users(id)` | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Constraints:

- `ends_on >= starts_on`
- `reason` obrigatorio.
- indice em `(student_id, starts_on, ends_on)` e indice parcial para `active=true`.

### 7.5 `duty_assignment_logs`

Historico append-only especifico da escala.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | |
| `assignment_id` | uuid FK `duty_assignments(id)` null | Pode ser null para geracao em lote |
| `roster_id` | uuid FK `duty_rosters(id)` null | |
| `action` | text | `generated`, `published`, `manual_change`, `auto_substitution`, `cancelled` |
| `actor_id` | uuid FK `auth.users(id)` null | Null se rotina automatica |
| `actor_role` | text null | Snapshot do perfil |
| `before_data` | jsonb null | |
| `after_data` | jsonb null | |
| `reason` | text null | Obrigatorio em `manual_change` |
| `created_at` | timestamptz | Default `now()` |

Regra: sem policies de update/delete. Coordenacao le tudo. Aluno e Instrutor nao precisam ler logs brutos.

### 7.6 `announcements`

Comunicados oficiais.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | |
| `class_id` | uuid FK `classes(id)` null | Null se comunicado institucional amplo |
| `title` | text | |
| `body` | text | |
| `audience_type` | text | `turma`, `individual`, `perfil` |
| `target_role` | text null | Se `audience_type='perfil'` |
| `target_student_ids` | uuid[] null | Se individual |
| `priority` | text | `normal`, `alta`, `urgente` |
| `status` | text | `rascunho`, `publicado`, `arquivado` |
| `published_at` | timestamptz null | |
| `created_by` | uuid FK `auth.users(id)` | Coordenacao |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### 7.7 `announcement_attachments`

Materiais vinculados a comunicados.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | |
| `announcement_id` | uuid FK `announcements(id)` | |
| `storage_path` | text null | Caminho no bucket privado quando for upload |
| `external_url` | text null | Link externo quando nao houver upload |
| `original_filename` | text | Nome exibido ao usuario |
| `mime_type` | text | Tipo real do arquivo |
| `file_size_bytes` | bigint null | Obrigatorio para upload |
| `attachment_type` | text | `documento`, `planilha`, `imagem`, `video`, `link` |
| `sort_order` | int | Ordem na tela |
| `uploaded_by` | uuid FK `auth.users(id)` | Coordenacao |
| `created_at` | timestamptz | |

Constraints:

- exigir exatamente um entre `storage_path` e `external_url`;
- permitir apenas MIME types aprovados;
- limitar tamanho por tipo de arquivo;
- impedir anexos em comunicado `arquivado`, salvo por rotina administrativa da Coordenacao.

Tipos iniciais sugeridos:

- PDF: `application/pdf`
- Word: `.doc`, `.docx`
- Excel: `.xls`, `.xlsx`, `.csv`
- Imagem: `.jpg`, `.jpeg`, `.png`, `.webp`
- Video curto: `.mp4`, `.webm`
- Link externo: URL HTTPS validada

Limites iniciais sugeridos:

- documentos e planilhas: 20 MB;
- imagens: 8 MB;
- videos: 100 MB;
- ate 10 anexos por comunicado.

Storage sugerido:

- bucket privado `announcement-attachments`;
- path: `<announcement_id>/<attachment_id>/<filename>`;
- acesso por URL assinada no servidor para destinatarios autorizados.

### 7.8 `announcement_reads`

Confirmacoes de leitura.

| Coluna | Tipo sugerido | Regra |
|---|---|---|
| `id` | uuid PK | |
| `announcement_id` | uuid FK `announcements(id)` | |
| `student_id` | uuid FK `students(id)` | |
| `read_by` | uuid FK `auth.users(id)` | Conta do aluno |
| `read_at` | timestamptz | Default `now()` |

Constraints:

- unique `(announcement_id, student_id)`
- `read_by` deve corresponder ao perfil vinculado ao `student_id` via validacao de application service ou trigger.

## 8. RLS e Permissoes Sugeridas

### Escala

- `duty_roles`: todos autenticados leem; Coordenacao escreve.
- `duty_rosters`: Coordenacao escreve; Instrutor le escalas publicadas; Aluno le escalas publicadas se a flag de visibilidade for ativada em fase futura.
- `duty_assignments`: Coordenacao escreve; Instrutor le atribuicoes publicadas; Aluno le suas atribuicoes e, se autorizado, a escala da turma.
- `duty_impediments`: Coordenacao escreve e le tudo; Instrutor le apenas impedimentos ativos com `operational_note` ou tipo operacional; Aluno le os proprios impedimentos se a Coordenacao decidir expor.
- `duty_assignment_logs`: Coordenacao le; escrita apenas por server action/trigger; sem update/delete.

### Comunicados

- `announcements`: Coordenacao cria/edita/publica; Instrutor e Aluno leem apenas comunicados publicados destinados a eles.
- `announcement_attachments`: Coordenacao cria/remove anexos antes da publicacao; destinatarios leem apenas anexos de comunicados publicados destinados a eles; acesso ao arquivo deve ser via URL assinada gerada no servidor.
- `announcement_reads`: Aluno insere leitura propria; Coordenacao le agregados e detalhes; Aluno le sua propria leitura.

## 9. Algoritmo de Justica da Escala

### 9.1 Entradas

- `class_id`
- intervalo de datas
- lista de `duty_roles` ativas
- alunos elegiveis da turma
- atribuicoes historicas
- impedimentos ativos ou futuros no periodo
- atribuicoes ja existentes no periodo, se houver edicao incremental

### 9.2 Regras duras

Um aluno nao pode ser candidato se:

- nao pertence a turma;
- esta com `deleted_at` preenchido;
- esta em situacao nao elegivel, como `afastado`, `desligado` ou `concluido`;
- ja esta escalado em outra funcao no mesmo dia;
- possui impedimento ativo para a data e para aquela funcao;
- ja foi atribuido a mesma funcao no mesmo dia por registro ativo.

### 9.3 Regras flexiveis

O algoritmo deve evitar, mas pode aceitar com alerta se nao houver alternativa:

- aluno escalado no dia anterior;
- aluno com total geral maior que os demais;
- aluno com contagem maior naquela funcao;
- aluno que acabou de fazer a mesma funcao em data recente.

### 9.4 Ciclo por funcao

Para cada funcao, calcular `role_count` por aluno. A preferencia primaria e escolher candidatos com a menor contagem daquela funcao.

Exemplo:

```text
Se 26 alunos fizeram Aluno de Dia 1 vez e 4 alunos fizeram 0 vezes,
somente os 4 com 0 entram na primeira faixa de escolha.
```

Se todos os alunos da menor faixa estiverem impedidos ou ja escalados no dia, o algoritmo abre a proxima faixa e registra alerta `cycle_relaxed`.

### 9.5 Score sugerido

Ordenar candidatos elegiveis por menor score:

```text
score =
  role_count * 1000
  + total_count * 100
  + consecutive_penalty
  + same_role_recency_penalty
  + student_number_tiebreaker
```

Penalidades:

- `consecutive_penalty = 10000` se foi escalado no dia anterior e existe outro candidato sem essa condicao.
- `same_role_recency_penalty = 500` se exerceu a mesma funcao nos ultimos 7 dias.
- `student_number_tiebreaker = student_number / 1000` para resultado deterministico.

O algoritmo deve ser deterministico por padrao. Randomizacao so deve existir se a Coordenacao solicitar explicitamente.

### 9.6 Geracao por dia

Para cada data:

1. Buscar impedimentos ativos do dia.
2. Para cada funcao em `sort_order`:
   - montar candidatos elegiveis;
   - aplicar ciclo por funcao;
   - calcular score;
   - escolher menor score;
   - inserir atribuicao como `assignment_source='automatica'`.
3. Se uma funcao ficar sem candidato:
   - nao inventar aluno;
   - criar alerta `sem_candidato`;
   - deixar a celula pendente para decisao manual da Coordenacao.

### 9.7 Substituicao automatica

Quando um impedimento novo conflitar com atribuicao futura:

1. Marcar a atribuicao original como `substituida`.
2. Gerar nova atribuicao na mesma data/funcao usando o algoritmo, excluindo o aluno impedido.
3. Criar log `auto_substitution` com `before_data`, `after_data` e motivo vinculado ao impedimento.
4. Exibir no Painel do Dia em "substituicoes feitas".

Se nao houver substituto elegivel, manter alerta visivel para Coordenacao.

### 9.8 Edicao manual

Toda troca manual deve:

- exigir justificativa;
- validar impedimentos antes de salvar;
- impedir aluno em duas funcoes no mesmo dia;
- registrar `duty_assignment_logs.action='manual_change'`;
- preservar atribuicao anterior no historico.

## 10. Alertas Operacionais

Alertas iniciais:

- `sem_candidato`: nao ha aluno elegivel para uma funcao.
- `impedimento_conflitante`: aluno escalado possui impedimento ativo.
- `ciclo_relaxado`: regra de nao repetir precisou ser flexibilizada.
- `consecutivo_inevitavel`: aluno escalado em dias consecutivos por falta de alternativa.
- `troca_manual_sem_publicacao`: escala alterada apos geracao e ainda nao publicada.
- `comunicados_pendentes`: existem comunicados urgentes sem leitura completa.

## 11. PDFs e Relatorios

Relatorios iniciais:

- Escala diaria em PDF institucional.
- Escala semanal em PDF ou tela imprimivel.
- Relatorio de justica: contagem por aluno, por funcao e total geral.
- Relatorio de impedimentos por periodo.
- Relatorio de leitura de comunicados.

Regras para PDF:

- `Content-Type: application/pdf`.
- Nome claro, por exemplo `escala-diaria-CFO2026-2026-05-24.pdf`.
- Layout em tabela com colunas legiveis.
- Rodape com data de geracao.
- Sem expor dados clinicos brutos.

## 12. Estrutura de Codigo Sugerida para Fase de Implementacao

Seguir o padrao DDD ja usado em `src/modules`.

```text
src/modules/operational-duty/
  domain/
    DutyRole.ts
    DutyRoster.ts
    DutyAssignment.ts
    DutyImpediment.ts
    services/GenerateFairRoster.ts
    services/FindAutomaticSubstitute.ts
  application/
    ports/DutyRosterRepository.ts
    use-cases/GenerateDutyRoster.ts
    use-cases/RegisterDutyImpediment.ts
    use-cases/ManuallyReplaceDutyAssignment.ts
    use-cases/GetDailyOperationalPanel.ts
  infrastructure/
    SupabaseDutyRosterRepository.ts
    mappers.ts
  presentation/
    actions.ts
    validators.ts
    components/

src/modules/announcements/
  domain/
    Announcement.ts
    AnnouncementAttachment.ts
    AnnouncementRead.ts
  application/
    ports/AnnouncementRepository.ts
    use-cases/CreateAnnouncement.ts
    use-cases/AttachAnnouncementMaterial.ts
    use-cases/ConfirmAnnouncementRead.ts
    use-cases/GetAnnouncementReadStats.ts
  infrastructure/
    SupabaseAnnouncementRepository.ts
  presentation/
    actions.ts
    validators.ts
    components/
```

Rotas sugeridas no App Router:

```text
src/app/(app)/coordenacao/operacional/page.tsx
src/app/(app)/coordenacao/operacional/escala/page.tsx
src/app/(app)/coordenacao/operacional/impedimentos/page.tsx
src/app/(app)/coordenacao/comunicados/page.tsx
src/app/(app)/instrutor/operacional/page.tsx
src/app/(app)/aluno/operacional/page.tsx
src/app/(app)/aluno/comunicados/page.tsx
src/app/api/operacional/escala/[id]/pdf/route.ts
```

## 13. Plano de Implementacao em Fases

### Fase 0 - Validacao de Produto

- Confirmar se a escala sera diaria, semanal ou mensal por padrao.
- Confirmar se alunos podem ver a escala completa ou apenas a propria funcao.
- Confirmar se Secretaria tera algum papel em impedimentos administrativos.

### Fase 1 - Banco e RLS

- Criar migration para tabelas `duty_roles`, `duty_rosters`, `duty_assignments`, `duty_impediments`, `duty_assignment_logs`, `announcements`, `announcement_attachments`, `announcement_reads`.
- Criar bucket privado `announcement-attachments` e policies de Storage.
- Criar seed dos quatro `duty_roles` iniciais.
- Criar RLS por perfil.
- Criar indices e constraints de integridade.
- Atualizar `src/lib/supabase/types.ts`.

### Fase 2 - Dominio e Algoritmo

- Implementar entidades e value objects.
- Implementar `GenerateFairRoster`.
- Implementar `FindAutomaticSubstitute`.
- Criar testes unitarios do algoritmo com casos de empate, impedimento, ciclo completo e dia consecutivo.

### Fase 3 - Casos de Uso e Server Actions

- Gerar escala por periodo.
- Registrar impedimento.
- Trocar atribuicao manualmente com justificativa.
- Buscar painel operacional do dia.
- Criar comunicado.
- Confirmar leitura.

### Fase 4 - Interfaces

- Criar painel da Coordenacao.
- Criar visao semanal/mensal.
- Criar CRUD de impedimentos.
- Criar modulo de comunicados.
- Criar painel do Instrutor.
- Criar visualizacao do Aluno.

### Fase 5 - PDF, Relatorios e E2E

- Gerar PDF diario.
- Testar download real de PDF.
- Criar E2E para fluxo Coordenacao: gerar escala, editar com justificativa, registrar impedimento e baixar PDF.
- Criar E2E para Aluno: ler comunicado e confirmar leitura.
- Criar E2E para Instrutor: visualizar painel sem dados sensiveis.

## 14. Criterios de Aceite

Escala:

- Coordenacao gera escala usando somente alunos reais do Supabase.
- Cada aluno aparece no padrao visual de identificacao unificada: `NOME DE GUERRA - NUMERO`.
- Nenhum aluno fica em duas funcoes no mesmo dia.
- Impedimentos ativos bloqueiam escala.
- Troca manual exige justificativa.
- Historico registra geracao, troca manual e substituicao automatica.
- Contadores por funcao e total geral batem com as atribuicoes salvas.
- Algoritmo evita repeticao antes do ciclo completo, salvo falta de candidato.

Impedimentos:

- Coordenacao registra impedimento com periodo, tipo, motivo e funcoes afetadas.
- Impedimento futuro gera substituicao automatica quando conflita com escala publicada ou prevista.
- Instrutor visualiza apenas informacao operacional relevante.

Painel:

- Mostra funcoes do dia, impedimentos ativos, substituicoes, alertas e comunicados pendentes.
- Permite baixar PDF diario real.
- Permite abrir escala semanal.

Comunicados:

- Coordenacao cria comunicado geral ou individual.
- Coordenacao cria comunicado somente texto ou com materiais anexos.
- Coordenacao anexa PDF, Word, Excel, imagem, video curto ou link externo aprovado.
- Aluno visualiza e confirma leitura.
- Aluno acessa apenas anexos de comunicados destinados a ele.
- Coordenacao ve lidos, pendentes e percentual.

Seguranca:

- RLS impede Aluno de alterar escala, impedimentos e comunicados.
- RLS impede Instrutor de acessar dados sensiveis de saude.
- Nenhum mock ou dado fake e usado.

## 15. Riscos e Decisoes Pendentes

| Risco | Impacto | Mitigacao |
|---|---|---|
| Migrations locais divergirem do Cloud | Falhas em deploy ou tipos errados | Gerar tipos remotos antes da implementacao e criar migration unica reconciliada. |
| Exposicao indevida de saude em impedimentos | Risco LGPD | Separar `reason` interno de `operational_note` LGPD-safe. |
| Algoritmo parecer injusto por empate oculto | Perda de confianca da Coordenacao | Exibir contadores e motivo da escolha. |
| Regra "evitar dias consecutivos" ser impossivel em turma pequena/periodo longo | Alertas excessivos | Tratar como regra flexivel e registrar `consecutivo_inevitavel`. |
| Edicao manual quebrar justica | Escala desequilibrada | Recalcular contadores apos cada edicao e exigir justificativa. |
| Comunicados individuais com arrays dificultarem RLS | Politicas complexas | Considerar tabela `announcement_targets` se RLS com array ficar fragil. |
| Anexos de comunicados aumentarem custo e complexidade de Storage | Upload lento, arquivos grandes e risco de permissao errada | Usar bucket privado, URL assinada, MIME allowlist, limite de tamanho e preferir link externo para videos longos. |

Decisoes pendentes antes de implementar:

- Aluno ve escala completa da turma ou apenas sua funcao?
- Escala padrao sera gerada por semana, mes ou intervalo livre?
- Impedimentos de saude serao cadastrados manualmente ou tambem sugeridos a partir de `health_restrictions`?
- Secretaria participa de impedimentos administrativos?
- Quais limites finais de tamanho serao aceitos para PDF, Word, Excel, imagem e video?
- Videos devem ser upload no Supabase Storage ou preferencialmente link externo?
