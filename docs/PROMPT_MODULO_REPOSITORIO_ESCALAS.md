# Prompt de Execução — Módulo de Repositório e Leitura Automática de Escalas (PDF)

> Uso: cole este documento inteiro como prompt inicial para o agente (Claude Code ou outro) que for implementar a funcionalidade. Ele já contém contexto do projeto, escopo, restrições e formato de saída esperado — não precisa ser reescrito a cada sessão, apenas atualizado se o escopo mudar.

> Nota de nomenclatura: este é um módulo **diferente** do já planejado em `docs/PLANO_ESCALAS_OPERACIONAIS_COMUNICADOS.md` (que trata de escalas geradas *internamente* pelo sistema — Aluno de Dia, Subxerife etc., com algoritmo de justiça). Este módulo trata de **escalas externas prontas, publicadas em PDF por outras fontes** (oficialato, CFSD etc.), que a Coordenação sobe para o sistema e o sistema lê, interpreta e avisa o cadete individualmente.
>
> **Decisão registrada (2026-09-10):** os dois módulos **não devem ser fundidos nem se sobrepor**. Este módulo é totalmente independente do módulo de Escala Operacional. O usuário sinalizou que o módulo de Escala Operacional (`operational-duty`) pode vir a ser **removido** futuramente — isso não faz parte do escopo deste prompt; não mexer nele aqui, apenas não reutilizar seus nomes/tabelas.

---

## 1. Papel

Você é um engenheiro de software sênior, responsável por evoluir o **CFO Alunos**, sistema de gestão de cadetes do Curso de Formação de Oficiais (CFO) do Corpo de Bombeiros Militar do Amapá (CBMAP). Você segue rigorosamente a arquitetura em camadas já estabelecida no projeto (domain / application / infrastructure / presentation, ver `src/modules/*`), a linguagem ubíqua definida em `docs/02-ubiquitous-language.md`, e as regras de LGPD e auditoria de `docs/07-permissions-and-lgpd.md`.

Antes de escrever qualquer código, você lê a documentação existente e propõe um plano. Você não cria migrations, RLS ou código de produção sem antes validar o modelo de dados com o usuário quando houver ambiguidade real (ver seção 9).

## 2. Contexto do projeto (não redescubra isso — apenas confirme se mudou)

- Stack: Next.js (App Router) + TypeScript + Supabase (Postgres + Storage + RLS) + Tailwind. Testes com Vitest/Playwright.
- Toolchain local: `pnpm` só funciona via `corepack` (não está direto no PATH); build exige `.env.local`; **não há Supabase CLI/Docker local** — migrations e testes contra schema real dependem do Supabase Cloud.
- Módulos existentes relevantes como referência de padrão:
  - `src/modules/documents` — upload/validação de documentos (PDF, etc.) — reaproveitar padrão de storage e validação.
  - `src/modules/notifications` — envio de notificações — reaproveitar infraestrutura de disparo.
  - `src/modules/cadet-followup` — já implementa "avisar o cadete" com estatísticas e regras de prazo — é a referência mais próxima para "avisar o cadete do seu serviço".
  - `src/modules/operational-duty` — escala gerada internamente (algoritmo de justiça) — módulo irmão, não confundir escopo.
- Identificação oficial do aluno em qualquer UI: `NOME DE GUERRA — NÚMERO` (nunca nome civil isolado). Fonte de verdade é sempre `student_id`, nunca nome/número duplicados como chave.
- Todo dado sensível de saúde não pode ser exposto além de resumo operacional curado (`health_restrictions.operational_summary`), mesmo que aluno apareça em escala médica.
- Alterações cadastrais/operacionais relevantes são registradas em log append-only com snapshot `before`/`after` (ver `docs/STATUS_ATUAL.md`).

## 3. Objetivo geral

Criar um **módulo de escalas** onde:

1. Todo aluno tem acesso a um repositório central de escalas em PDF, organizado por **tipo de escala**.
2. A Coordenação consegue cadastrar novos **tipos de escala** dinamicamente (não fixos em código) e fazer upload dos PDFs correspondentes.
3. O sistema **processa e analisa** cada PDF publicado, extraindo as atribuições (quem, quando, em que função) e casando o nome encontrado no PDF com o cadete correspondente no cadastro (`students`).
4. Cada aluno recebe um **alerta individual e imediato** dizendo se e quando ele está escalado, e em qual função — sem precisar abrir e ler o PDF inteiro.

## 4. Escopo funcional detalhado

### 4.1 Repositório de escalas (todos os alunos)

- Tela de repositório, acessível a todo aluno, listando os PDFs disponíveis agrupados por tipo de escala, mais recentes primeiro.
- Cada item mostra: tipo de escala, período/data de vigência, data de publicação, quem publicou, e ação de abrir/baixar o PDF original.
- Download do PDF original sempre disponível — a leitura automática é um complemento, nunca uma substituição da fonte oficial.

### 4.2 Tipos de escala iniciais

**Confirmado pelo usuário**: são exatamente estes quatro tipos no lançamento inicial, sem sigla institucional anexada ao nome (o termo ouvido anteriormente como "IBM" não se aplica — usar apenas "Escala de Oficial de Dia"). Mais tipos podem ser adicionados depois, mas não fazem parte do escopo inicial:

- Escala de Aluno de Dia
- Escala de Acompanhante do Oficial
- Escala de Oficial de Dia
- Escala dos Alunos CFSD

**Formato padrão confirmado**: PDF é o único formato de entrada a suportar no lançamento inicial (não prever upload de outros formatos de arquivo agora).

O cadastro de tipos **não pode ser fixo em enum de código** — a Coordenação precisa poder criar novos tipos pelo painel gerencial sem deploy (é assim que os tipos futuros, além destes quatro, serão adicionados). Modele como tabela (`schedule_types` ou nome equivalente na linguagem ubíqua do projeto), não como enum de banco.

### 4.3 Gestão pela Coordenação

- CRUD de tipo de escala (nome, descrição, ativo/inativo).
- Upload de novo PDF vinculado a um tipo, com período de vigência.
- Reprocessar um PDF (nova tentativa de extração) sem precisar re-upload.
- **Tela de acompanhamento da extração após publicação** (não é gate bloqueante — ver decisão na seção 5): mostra o que foi lido e casado automaticamente, para a Coordenação auditar e corrigir a qualquer momento.
- Histórico append-only de publicações e reprocessamentos.

### 4.4 Alerta individual ao aluno

- Cada aluno, ao entrar no sistema (ou em painel dedicado), vê um indicativo direto: "Você está escalado em [data] como [função]" — sem precisar procurar no PDF.
- Deve cobrir múltiplas escalas simultâneas do mesmo aluno em datas próximas (ex.: aparece em duas escalas diferentes na mesma semana).
- Reaproveitar a infraestrutura de `cadet-followup`/`notifications` para o disparo do aviso (push/e-mail/painel, conforme já implementado nesses módulos).

## 5. Pipeline de processamento do PDF

**Decisão registrada (2026-09-10): publicação é automática, sem revisão manual bloqueante antes de notificar o aluno.** Isso inverte a recomendação original deste documento (que sugeria gate humano obrigatório) — o usuário optou explicitamente por publicar e notificar assim que o processamento terminar, para ganhar velocidade. Compensar o risco de erro de leitura com transparência e correção posterior, não com bloqueio prévio:

1. **Ingestão**: upload do PDF, associado a um `schedule_type` e período de vigência. Armazenar em Storage seguindo padrão de `documents`, mantendo o arquivo original retido indefinidamente (ver seção 8 — retenção).
2. **Extração de texto/tabela**: extrair texto do PDF (tabelas estruturadas quando possível); se o PDF for digitalizado/imagem, aplicar OCR. Registrar qual método foi usado (texto nativo vs. OCR), pois afeta a confiança do resultado.
3. **Parsing estruturado**: converter o texto bruto em uma lista de registros candidatos `{ nome_lido, data, função, texto_original_da_linha }`. Não tente inferir função/data quando o layout for ambíguo — marque como `precisa_revisão` em vez de adivinhar.
4. **Casamento com cadastro**: para cada `nome_lido`, buscar candidato em `students` considerando nome de guerra, variações de acento/caixa e abreviações comuns. Sempre produzir um score/confiança, nunca um match silencioso "melhor esforço" sem indicação de incerteza.
   - Match exato de nome de guerra → confiança alta → segue para publicação e notificação automáticas.
   - Match ambíguo (mais de um candidato, ou similaridade parcial) → marcar como `precisa_revisão` e **não notificar ninguém para essa linha** até a Coordenação corrigir; as demais linhas do mesmo PDF publicam normalmente.
   - Nome não encontrado no cadastro da turma vigente → marcar como `não_encontrado`; naturalmente não há aluno para notificar, mas a linha deve ficar visível para a Coordenação corrigir.
5. **Publicação e notificação automáticas**: assim que uma linha é classificada com confiança alta, ela é publicada e o aluno correspondente é notificado imediatamente via módulo de notificações — sem esperar aprovação humana.
6. **Acompanhamento e correção pela Coordenação (pós-publicação)**: tela mostrando todos os registros extraídos com seu status (`confirmado automaticamente` / `precisa_revisão` / `não_encontrado`), permitindo à Coordenação corrigir vínculos errados a qualquer momento. Uma correção manual deve dar o gatilho para notificar o aluno certo (e, se aplicável, avisar quem foi notificado por engano).
7. **Reprocessamento**: qualquer PDF pode ser reprocessado (ex.: após ajuste no parser) sem perder o histórico de publicações anteriores.

## 6. Modelo de dados (ponto de partida para discussão — não é a versão final)

Proposto em linha com o padrão de `student_id` como chave e sem duplicar nome/número:

- `schedule_types` — tipo de escala cadastrado pela Coordenação (nome, descrição, ativo).
- `schedule_documents` — um PDF publicado (tipo, storage path, período de vigência, status de processamento, publicado_por, publicado_em).
- `schedule_assignments` — uma atribuição extraída (`schedule_document_id`, `student_id` nullable até confirmação, `data`, `função`, `texto_original`, `status`: `confirmado` | `precisa_revisão` | `não_encontrado`, `confiança`).
- `schedule_assignment_logs` — append-only, para auditoria de quem confirmou/alterou cada atribuição.

Ajuste nomes para bater com a linguagem ubíqua já usada no projeto (ex.: ver como `duty_*` foi nomeado em `docs/PLANO_ESCALAS_OPERACIONAIS_COMUNICADOS.md` e mantenha consistência ou justifique divergência).

## 7. Permissões (RLS)

| Perfil | Permissões |
|---|---|
| Coordenação | Cria/edita tipos de escala, faz upload, reprocessa, corrige vínculos aluno↔atribuição a qualquer momento, vê histórico completo e status de confiança de toda extração. |
| Instrutor | Visualiza repositório e escalas publicadas. |
| Aluno | Visualiza repositório de PDFs liberados, vê apenas seu próprio alerta individual; não edita nada. |
| Secretaria | Fora de escopo inicial, igual ao módulo de escalas operacionais. |

## 8. Requisitos não funcionais

- LGPD: PDFs de escala normalmente não contêm dado sensível de saúde, mas se algum tipo de escala vier a conter (ex.: escala médica), aplicar a mesma regra de resumo operacional curado usada em `health_restrictions`.
- Auditoria append-only para toda publicação automática e toda correção manual de vínculo aluno↔atribuição — mesmo sem gate humano prévio, é preciso reconstruir depois "o que foi lido, casado e notificado, e quando".
- **Retenção confirmada pelo usuário: manter todos os PDFs publicados indefinidamente** (nunca apagar), justamente para permitir conferência posterior caso um match automático tenha saído errado. Sem soft-delete silencioso — se um PDF for substituído/corrigido, manter o histórico, não sobrescrever.
- Migrations não devem ser aplicadas localmente sem confirmação — não há Supabase CLI/Docker local; qualquer migration deve ser proposta como SQL versionado e testada contra o Cloud com aprovação do usuário antes de aplicar.
- Cobertura de testes unitários para: parsing de texto → registros candidatos, lógica de matching/confiança, e regras de disparo de alerta — seguindo o padrão de testes já usado em `operational-duty` e `cadet-followup` (arquivos `*.test.ts` ao lado do código de domínio).

## 9. Decisões confirmadas pelo usuário (2026-09-10)

Estes pontos já foram respondidos e não devem ser reabertos sem novo pedido explícito do usuário:

1. **Sigla institucional**: não existe sigla — o tipo se chama apenas "Escala de Oficial de Dia". O termo "IBM" ouvido anteriormente não se aplica.
2. **Lista de tipos no lançamento inicial**: exatamente os 4 citados (Aluno de Dia, Acompanhante do Oficial, Oficial de Dia, CFSD). Formato de entrada: PDF é o único suportado. Mais tipos podem ser cadastrados depois pela Coordenação, sem novo deploy.
3. **Publicação**: automática, sem revisão manual bloqueante antes de notificar o aluno (ver pipeline revisado na seção 5). A Coordenação corrige depois, se necessário — a correção não é um pré-requisito para publicar.
4. **Sobreposição com Escala Operacional**: não incorporar, não fundir. Módulos independentes. O módulo de Escala Operacional (`operational-duty`) pode vir a ser removido futuramente pelo usuário — isso é decisão futura e separada, fora do escopo deste prompt.
5. **Retenção**: manter todos os PDFs publicados indefinidamente no Storage, para permitir conferência/auditoria posterior.

Se alguma dessas decisões parecer inconsistente com o restante do plano ao implementar, sinalize ao usuário em vez de silenciosamente escolher uma interpretação.

## 10. Fluxo de trabalho esperado do agente

1. Ler `docs/02-ubiquitous-language.md`, `docs/05-data-model.md`, `docs/07-permissions-and-lgpd.md` e `docs/PLANO_ESCALAS_OPERACIONAIS_COMUNICADOS.md` antes de propor qualquer schema.
2. As decisões da seção 9 já estão fechadas — não perguntar de novo, apenas aplicá-las.
3. Apresentar um plano curto (schema proposto, camadas de código, telas) para aprovação — não implementar direto.
4. Implementar por camada, seguindo o padrão `domain → application → infrastructure → presentation` já usado nos módulos existentes.
5. Escrever migrations como SQL versionado, sem aplicar localmente; sinalizar claramente o que precisa ser rodado no Supabase Cloud e esperar confirmação.
6. Escrever testes unitários para as regras de negócio (parsing, matching, confiança, disparo de alerta) antes ou junto da implementação.
7. Atualizar `docs/STATUS_ATUAL.md` e `docs/02-ubiquitous-language.md` com os novos termos introduzidos.

## 11. Critérios de aceite (Definition of Done)

- [ ] Coordenação cria um novo tipo de escala pela UI, sem precisar de deploy.
- [ ] Coordenação sobe um PDF (dos 4 tipos iniciais) e o sistema extrai, casa e **publica automaticamente** as linhas de alta confiança, sem esperar aprovação manual.
- [ ] Aluno correspondente é notificado assim que sua linha é publicada.
- [ ] Linhas ambíguas ou não encontradas ficam visíveis para a Coordenação corrigir depois, sem bloquear a publicação das demais linhas do mesmo PDF.
- [ ] Aluno vê, em um único lugar, se/quando está escalado e em qual função, sem precisar abrir o PDF.
- [ ] Aluno consegue baixar o PDF original de qualquer escala do repositório; PDFs nunca são apagados.
- [ ] Toda publicação automática e toda correção manual de vínculo aluno↔atribuição fica registrada em log append-only.
- [ ] Testes cobrindo parsing, matching e regra de disparo de alerta.
- [ ] Nenhuma migration foi aplicada sem confirmação explícita do usuário.
- [ ] Nenhum código novo referencia ou reaproveita tabelas do módulo `operational-duty`.
