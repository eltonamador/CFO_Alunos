# Plano de implementação do Repositório de Escalas em PDF

Status: **mudança planejada e ainda não implementada**.

Este plano organiza a evolução do CFO Alunos para receber escalas oficiais em PDF, conservar os documentos, identificar automaticamente as atribuições dos cadetes e emitir avisos individuais. O módulo será independente da **Escala Operacional**, que gera internamente funções da turma. Nenhuma tabela, regra ou tela de `operational-duty` será reutilizada como fonte deste novo domínio.

## 1. Resultado esperado

A Coordenação cadastra tipos de escala e publica um PDF oficial vinculado a uma turma e a um período. O documento fica imediatamente disponível no repositório. O processamento extrai linhas, datas e funções; somente correspondências únicas e de alta confiança geram atribuição e notificação automáticas. Linhas ambíguas ou sem correspondência ficam visíveis para correção sem bloquear as demais. O PDF original, as execuções de processamento, as decisões automáticas, as correções e as notificações permanecem auditáveis.

Tipos iniciais:

1. Escala de Aluno de Dia.
2. Escala de Acompanhante do Oficial.
3. Escala de Oficial de Dia.
4. Escala dos Alunos CFSD.

Novos tipos serão cadastrados pela Coordenação, sem alteração de código. O único formato de entrada inicial será PDF.

## 2. Limites do módulo

- O PDF original é a fonte oficial e sempre poderá ser aberto ou baixado.
- A extração automática complementa a leitura do documento; não substitui o PDF.
- `student_id` identifica o cadete. Nome lido e linha original são evidências da extração, nunca chaves cadastrais.
- O aluno é exibido como `NOME DE GUERRA — NÚMERO`.
- Correspondência parcial ou ambígua não notifica automaticamente.
- A publicação do PDF não depende de revisão prévia. Cada atribuição de alta confiança é publicada ao concluir o processamento.
- Correções não apagam notificações anteriores: geram evento corretivo para o destinatário errado e novo aviso para o destinatário correto, quando aplicável.
- PDFs e registros históricos não serão apagados. Substituição gera nova versão.
- Dados de saúde não serão extraídos para campos comuns. Eventual informação operacional sensível seguirá apenas o resumo curado de `health_restrictions.operational_summary`.
- Secretaria fica sem acesso no lançamento inicial. Coordenação administra; Instrutor consulta o repositório; Aluno consulta o repositório e suas próprias atribuições.

## 3. Modelo de dados proposto para validação

O modelo será validado antes da primeira migration.

| Tabela                         | Responsabilidade                              | Decisões principais                                                                                               |
| ------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `schedule_types`               | Catálogo dinâmico dos tipos                   | Nome único entre ativos; inativação em vez de exclusão quando houver uso                                          |
| `schedule_documents`           | Metadados e caminho do PDF oficial            | `class_id`, tipo, vigência, SHA-256, versão anterior, autor e data de publicação; registro imutável após publicar |
| `schedule_processing_runs`     | Cada tentativa de extração ou reprocessamento | Método `native_text` ou `ocr`, versão do parser, início/fim, estado, erro técnico e métricas                      |
| `schedule_candidates`          | Linhas candidatas produzidas por uma execução | Nome lido, data, função, linha original, confiança, motivos e candidatos encontrados                              |
| `schedule_assignments`         | Atribuições publicadas ou corrigidas          | `student_id`, candidato de origem, data, função, estado e versão; sem duplicar identidade do aluno como chave     |
| `schedule_notification_events` | Caixa de saída idempotente                    | Tipo do aviso, destinatário, chave de idempotência, tentativas, canal e resultado                                 |
| `schedule_audit_events`        | Histórico append-only do módulo               | Antes/depois, origem automática ou humana, ator, motivo e horário                                                 |

Estados propostos:

- Documento: `uploaded`, `processing`, `processed`, `processed_with_issues`, `failed`, `superseded`.
- Candidato: `auto_confirmed`, `needs_review`, `not_found`, `manually_confirmed`, `superseded`.
- Atribuição: `published`, `corrected`, `cancelled`, `superseded`.
- Notificação: `pending`, `sent`, `failed`, `cancelled`.

O documento também precisa de `class_id`. Sem o recorte da turma, dois cadetes de cursos diferentes podem produzir uma correspondência aparentemente exata. O arquivo será identificado por checksum para detectar reenvio do mesmo conteúdo, sem impedir uma nova versão formalmente publicada.

## 4. Regras de casamento e publicação

O fluxo normaliza caixa, espaços e acentos apenas para comparação. O valor original permanece guardado.

1. Número e nome de guerra compatíveis com um único cadete da turma: confiança alta e publicação automática.
2. Nome de guerra normalizado compatível com um único cadete da turma: confiança alta, desde que não haja colisão cadastral.
3. Nome completo ou abreviação com similaridade parcial: `needs_review`, sem notificação.
4. Mais de um candidato possível: `needs_review`, sem escolher automaticamente.
5. Nenhum candidato: `not_found`.
6. Data ou função ambígua: `needs_review`, mesmo que o nome corresponda.

A confiança não será um número sem explicação. Cada candidato guardará os sinais usados, como correspondência de número, nome de guerra, nome completo, turma e qualidade da extração. A primeira versão automática aceitará somente regras determinísticas e únicas. Ajustes futuros do algoritmo ocorrerão por versão de parser e reprocessamento auditado.

## 5. Arquitetura proposta

```text
src/modules/schedule-repository/
  domain/
    scheduleDocument.ts
    scheduleCandidate.ts
    studentMatching.ts
    notificationDecision.ts
  application/
    uploadSchedule.ts
    processSchedule.ts
    correctAssignment.ts
    reprocessSchedule.ts
  infrastructure/
    scheduleRepository.ts
    pdfTextExtractor.ts
    ocrExtractor.ts
    notificationOutbox.ts
  presentation/
    actions.ts
    queries.ts
```

O upload seguirá o padrão de `documents`, com bucket privado, validação de MIME, extensão, tamanho e assinatura `%PDF`. O processamento ficará atrás de uma interface de extração para permitir texto nativo e OCR sem acoplar o domínio ao fornecedor. Notificações serão registradas primeiro em uma caixa de saída transacional e enviadas pela infraestrutura existente; isso evita aviso sem atribuição persistida e permite repetição segura.

## 6. Telas planejadas

### Coordenação

- `/coordenacao/escalas`: repositório, filtros por tipo, turma, vigência e situação.
- `/coordenacao/escalas/tipos`: criar, editar e inativar tipos.
- `/coordenacao/escalas/nova`: selecionar turma, tipo, vigência e publicar PDF.
- `/coordenacao/escalas/[id]`: visualizar PDF, processamento, candidatos, correspondências, erros, histórico e reprocessar.
- `/coordenacao/escalas/[id]/revisao`: corrigir linhas ambíguas, não encontradas ou vinculadas incorretamente.

### Instrutor

- `/instrutor/escalas`: consultar PDFs publicados, sem dados internos de confiança ou auditoria.

### Aluno

- `/aluno/escalas`: aviso direto das próximas atribuições e repositório dos PDFs publicados.
- O painel inicial poderá mostrar “Você está escalado em [data] como [função]”, incluindo múltiplas escalas próximas.

## 7. Ordem das implementações

### Sprint E0 — amostras e contrato de extração

Objetivo: reduzir risco antes do banco.

- Reunir ao menos um PDF real de cada um dos quatro tipos.
- Identificar layouts, campos obrigatórios, PDFs nativos e digitalizados.
- Definir tamanho máximo, período obrigatório e tratamento de PDF protegido ou ilegível.
- Especificar saídas do parser e critérios determinísticos de alta confiança.
- Criar fixtures anonimizadas e testes do domínio.

Checkpoint: relatório dos quatro layouts e exemplos esperados de candidatos. Nenhuma migration.

### Sprint E1 — domínio, parser nativo e matching

Objetivo: provar a extração sem publicar nada.

- Implementar entidades, estados e invariantes em `domain`.
- Extrair texto e tabelas de PDFs digitais.
- Produzir candidatos com linha original, data e função.
- Implementar casamento restrito à turma e decisão de notificação.
- Testar acentos, caixa, abreviações, duplicidade, ausência de data/função e nomes não encontrados.

Checkpoint: execução local com fixtures e relatório de precisão. Nenhuma integração com Storage ou notificações.

### Sprint E2 — schema, RLS, Storage e auditoria

Objetivo: tornar o modelo revisável e seguro.

- Preparar migration aditiva com as sete tabelas propostas.
- Criar bucket privado e políticas de acesso.
- Criar RPCs transacionais para publicação, correção e reprocessamento.
- Impedir `UPDATE` e `DELETE` direto de documentos publicados, logs e notificações.
- Testar RLS para Coordenação, Instrutor, Aluno, Secretaria, conta inativa e acesso cruzado entre alunos.

Checkpoint: SQL versionado e testes em banco descartável. Aplicação no Supabase somente após autorização específica.

### Sprint E3 — repositório e publicação de PDF

Objetivo: entregar valor mesmo antes do OCR.

- CRUD de tipos pela Coordenação.
- Upload de PDF com turma, tipo e vigência.
- Listagem para os perfis autorizados.
- Abertura e download do original por URL assinada.
- Versionamento de documento substituto e retenção do anterior.

Checkpoint: um PDF digital publicado e acessível nos três perfis autorizados.

### Sprint E4 — processamento assíncrono e OCR

Objetivo: processar arquivos sem bloquear a interface.

- Executar extração após o upload.
- Acrescentar OCR para documento digitalizado.
- Registrar método, versão, duração, erro e métricas da execução.
- Permitir reprocessamento sem apagar execuções anteriores.
- Exibir progresso e falhas recuperáveis à Coordenação.

Checkpoint: PDFs nativo e digitalizado processados com histórico de tentativas.

### Sprint E5 — publicação automática e notificações

Objetivo: avisar apenas correspondências seguras.

- Publicar automaticamente candidatos de alta confiança.
- Criar evento idempotente de notificação na mesma transação.
- Integrar painel e canais disponíveis em `notifications` e `cadet-followup`.
- Exibir múltiplas atribuições futuras no painel do aluno.
- Confirmar que linhas problemáticas não bloqueiam as válidas.

Checkpoint: uma escala com casos confirmado, ambíguo e não encontrado; somente o confirmado gera aviso.

### Sprint E6 — correção posterior e reprocessamento

Objetivo: corrigir erros sem perder a cadeia de eventos.

- Corrigir vínculo, data ou função com motivo obrigatório.
- Notificar o destinatário correto.
- Emitir correção para destinatário anteriormente avisado, quando houver.
- Comparar execuções de parser e marcar resultados superados.
- Mostrar histórico completo de publicação, notificação e correção.

Checkpoint: reconstrução auditável de um vínculo automático incorreto e sua correção.

### Sprint E7 — endurecimento e piloto

Objetivo: liberar gradualmente.

- Testes E2E dos perfis e acesso direto às APIs.
- Concorrência de reprocessamento e correção.
- Limites de arquivo, PDF malicioso, timeout de OCR e falha de canal.
- Métricas de precisão, linhas pendentes e notificações com falha.
- Piloto com um tipo e uma turma antes de habilitar os quatro tipos.

Checkpoint: aceite operacional e plano de retorno que desative o módulo sem apagar documentos.

## 8. Dependências e decisões após a Sprint E2

Estas decisões não alteram o objetivo, mas precisam ser fechadas antes do schema definitivo:

- Confirmar ou alterar o limite provisório de 20 MiB por PDF definido na migration de Storage.
- Provedor ou runtime de OCR disponível na implantação.
- Canais de notificação já habilitados no ambiente real.
- Prazo considerado “próximo” no painel do aluno.
- Se o repositório mostrará PDFs de todas as turmas ou somente da turma do aluno. A regra de menor exposição recomenda somente a própria turma, salvo ato institucional que determine acesso amplo.
- Procedimento institucional para mensagem corretiva após notificação equivocada.

## 9. Registro da Sprint E2 — migrations

Situação: concluída localmente em 10/09/2026; nada aplicado no Supabase real.

Arquivos adicionados:

- `supabase/migrations/0040_schedule_repository.sql`: sete tabelas, catálogo inicial, invariantes, RLS, auditoria e RPCs transacionais.
- `supabase/migrations/0041_schedule_repository_storage.sql`: bucket privado `schedule-pdfs`, limite provisório de 20 MiB, PDF obrigatório e acesso sem sobrescrita/exclusão.
- `supabase/tests/schedule_repository.test.sql`: cenários de permissão, publicação, matching, correção, notificações e imutabilidade.
- `scripts/test-schedule-repository-db.mjs`: executor PostgreSQL descartável para o teste do núcleo.

Arquivo alterado:

- `package.json`: comando `pnpm db:test:schedules`.

Validação executada:

- `pnpm db:test:schedules`: 62 verificações pgTAP aprovadas após incluir o ciclo seguro de upload e as policies do objeto.
- `git diff --check`: sem erros de whitespace.

Pendências para homologação:

- confirmar o limite de 20 MiB e as demais decisões desta seção.

## 10. Registro da Sprint E3 — repositório e publicação

Situação: concluída localmente em 10/09/2026; nada aplicado no Supabase real.

Entregas:

- migration `0042_schedule_upload_lifecycle.sql`, com reserva invisível, confirmação do objeto no Storage, publicação e falha auditável;
- módulo independente `schedule-repository`, sem dependências das tabelas de escala operacional;
- publicação direta do navegador no bucket privado, com assinatura PDF, SHA-256 e limite de 20 MiB;
- cadastro, inativação e reativação de tipos pela Coordenação;
- filtros por turma, tipo, vigência e situação;
- download por URL assinada e histórico das versões substituídas;
- páginas em `/coordenacao/escalas`, `/instrutor/escalas` e `/aluno/escalas`;
- geração dos tipos Supabase atualizada.

Validação executada:

- reset completo com as 42 migrations e políticas reais de Storage;
- 199 testes pgTAP aprovados na suíte integrada;
- smoke test pela API: Coordenação, Instrutor e cadete da turma visualizaram a publicação; Secretaria recebeu zero registros;
- 205 testes unitários aprovados;
- lint, typecheck e build de produção aprovados.

Pendências:

- confirmação institucional do limite provisório de 20 MiB;
- implantação das migrations pendentes somente após autorização;
- amostras reais dos quatro tipos de PDF para iniciar parser e OCR.

Próximo passo: Sprint E4, com extração assíncrona, parser de PDF nativo, OCR e histórico de tentativas.

## 11. Registro da Sprint E4 — processamento assíncrono

Situação: concluída localmente em 10/09/2026; nada aplicado no Supabase real.

Entregas:

- migration `0043_schedule_processing_pipeline.sql`, com fila exclusiva por documento, claim usando `FOR UPDATE SKIP LOCKED`, conclusão atômica e cancelamento de itens de versões superadas;
- upload passa a solicitar o processamento automaticamente, de modo idempotente;
- job `/api/jobs/schedule-processing`, protegido por `CRON_SECRET`, executado a cada dez minutos e limitado a três documentos por rodada;
- extração de texto nativo com PDF.js em runtime Node/serverless;
- adaptador opcional `local_tesseract` para OCR, habilitado por `SCHEDULE_OCR_PROVIDER` somente em servidor com `pdftoppm`, Tesseract e idioma português;
- parser versionado e conservador: publicação automática exige nome único da turma, data válida e função derivada do tipo oficial da escala;
- métricas, método, revisão do parser, erro e histórico de tentativas visíveis para a Coordenação;
- reprocessamento pela tela sem apagar a execução anterior;
- publicação automática e evento de notificação permanecem na mesma transação do resultado do parser.

Validação executada:

- PDF sintético com texto nativo extraído e PDF sem texto suficiente classificado como `OCR_REQUIRED`;
- smoke test local do adaptador OCR com `pdftoppm`, Tesseract e idioma configurável;
- 211 testes unitários aprovados;
- 213 verificações pgTAP aprovadas na suíte integrada;
- 76 verificações pgTAP aprovadas no teste isolado do repositório;
- lint, typecheck e build de produção aprovados.

Pendências:

- validar o parser com amostras reais anonimizadas dos quatro tipos de escala;
- escolher um provedor de OCR compatível com a hospedagem, caso os binários locais não estejam disponíveis;
- implementar a mesa de revisão dos candidatos ambíguos e a entrega externa das notificações na Sprint E5.

Próximo passo: Sprint E5, com mesa de revisão, painel de atribuições do cadete e entrega idempotente das notificações.

## 12. Registro da Sprint E5 — revisão e notificações

Situação: concluída localmente em 10/09/2026; nada aplicado no Supabase real.

Entregas:

- migration `0044_schedule_review_notifications.sql`, com ledger por evento, canal e destino;
- claim concorrente e recuperação de notificações interrompidas;
- reenvio apenas das entregas recuperáveis, preservando canais já concluídos;
- cancelamento de assinaturas Web Push inválidas e retenção do histórico;
- mesa de revisão para candidatos ambíguos ou não encontrados, restrita à Coordenação;
- confirmação manual com seleção limitada aos cadetes da turma e justificativa obrigatória;
- bloqueio de confirmação para candidatos pertencentes a versões superadas;
- lista de próximas atribuições na página de escalas e no painel inicial do cadete;
- mensagens distintas para nova atribuição, correção, destinatário incorreto e cancelamento;
- job `/api/jobs/schedule-notifications`, protegido por `CRON_SECRET`, com execução periódica independente do parser.

Validação executada:

- 213 testes unitários aprovados e um smoke de OCR local disponível sob demanda;
- 227 verificações pgTAP aprovadas na suíte integrada;
- 90 verificações pgTAP no teste isolado do repositório, incluindo RLS, revisão histórica e ledger idempotente;
- migration aplicada somente no Supabase local e tipos TypeScript regenerados;
- lint, typecheck e build de produção aprovados.

Pendências:

- validar a mesa de revisão com PDFs reais anonimizados;
- configurar VAPID e/ou Resend no ambiente implantado para efetivar os canais externos;
- implementar a interface de correção posterior de destinatário, data e função na Sprint E6.

Próximo passo: Sprint E6, com correção versionada, notificações compensatórias e histórico completo por atribuição.

## 13. Registro da Sprint E6 — correções e histórico

Situação: concluída localmente em 10/09/2026; nada aplicado no Supabase real.

Entregas:

- migration `0045_schedule_assignment_history.sql`, com encerramento automático das atribuições do PDF substituído;
- avisos compensatórios para os cadetes afetados pela substituição, correção ou cancelamento;
- correção de cadete, data e função por nova versão, com justificativa obrigatória e vínculo com a versão anterior;
- cancelamento lógico de atribuição vigente, sem exclusão do registro original;
- bloqueio de correções e cancelamentos em documentos superados;
- painel da Coordenação para corrigir ou cancelar atribuições e consultar o histórico preservado;
- indicação do estado mais recente da notificação associada a cada atribuição;
- tipos Supabase regenerados a partir do banco local.

Validação executada:

- reset completo do Supabase local com as migrations `0001` a `0045`;
- 213 testes unitários aprovados e um smoke de OCR opcional;
- 235 verificações pgTAP aprovadas na suíte integrada;
- 98 verificações pgTAP no teste isolado do repositório, incluindo substituição, correção, cancelamento, histórico, RLS e notificações compensatórias;
- lint, typecheck, `git diff --check` e build de produção aprovados.

Pendências:

- validar os textos e o fluxo de correção com a Coordenação em homologação;
- configurar VAPID e/ou Resend no ambiente implantado para efetivar os canais externos;
- validar o parser e o histórico com PDFs reais anonimizados;
- implantar as migrations pendentes somente após autorização explícita.

Próximo passo: Sprint E7, com filtros operacionais no painel de atribuições, indicadores de pendências de notificação e testes de interface do fluxo de correção.

## 14. Critérios de aceite consolidados

- Tipo de escala criado pela UI, sem deploy.
- PDF original publicado, retido e disponível para download.
- Extração nativa e OCR registrados por método e versão.
- Linha segura publicada e notificada automaticamente.
- Linha ambígua ou não encontrada visível para correção, sem bloquear as demais.
- Aluno vê todas as próprias atribuições próximas em um único lugar.
- Correção produz histórico e notificações compensatórias.
- Reprocessamento não apaga execuções ou atribuições anteriores.
- RLS impede acesso indevido a atribuições individuais e dados de processamento.
- Testes cobrem parsing, matching, decisão de publicação, idempotência e permissões.
- Nenhuma tabela de `operational-duty` é usada pelo módulo.
