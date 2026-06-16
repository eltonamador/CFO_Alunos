# Historico de Peso do Aluno - Design

## Objetivo

Implementar um historico de peso por aluno, com novos lancamentos periodicos, consulta completa da evolucao e exibicao grafica na aba `Saude`, preservando compatibilidade com o campo legado `health_restrictions.peso_kg`.

## Decisao principal

A funcionalidade seguira o modelo `append-only`:

- Nenhum registro historico sera sobrescrito.
- Correcoes feitas pela Coordenacao serao registradas como novos lancamentos.
- O peso atual da ficha sera sempre derivado do registro mais recente do historico.
- O campo legado `health_restrictions.peso_kg` sera mantido em sincronia com o ultimo registro valido para evitar quebra de consultas, relatorios e componentes existentes.

## Contexto atual

O sistema ja possui:

- Campo unico `peso_kg` em `public.health_restrictions`.
- Formulario de saude em [SaudeTab.tsx](/C:/Projetos/CFO_Alunos/src/app/(app)/coordenacao/alunos/[id]/tabs/SaudeTab.tsx).
- Server action `updateHealthAction` em [studentActions.ts](/C:/Projetos/CFO_Alunos/src/modules/student-profile/presentation/actions/studentActions.ts).
- Queries centralizadas de ficha do aluno em [students.ts](/C:/Projetos/CFO_Alunos/src/lib/supabase/queries/students.ts).
- Relatorios e filtros que leem `health_restrictions.peso_kg` em [builders.ts](/C:/Projetos/CFO_Alunos/src/lib/reports/builders.ts), [pdf-builders.ts](/C:/Projetos/CFO_Alunos/src/lib/reports/pdf-builders.ts), [filtros-avancados.ts](/C:/Projetos/CFO_Alunos/src/lib/reports/filtros-avancados.ts) e [route.ts](/C:/Projetos/CFO_Alunos/src/app/api/reports/filtros-avancados/route.ts).

Isso torna a estrategia de tabela nova + sincronizacao a opcao de menor risco.

## Modelo de dados

Criar a tabela `public.student_weight_history` com os campos:

- `id uuid primary key default gen_random_uuid()`
- `student_id uuid not null references public.students(id) on delete cascade`
- `weight_kg numeric(5,2) not null`
- `measured_at date not null`
- `created_by uuid null references public.profiles(id) on delete set null`
- `created_by_role text null`
- `source text not null check (source in ('aluno', 'coordenacao'))`
- `notes text null`
- `created_at timestamptz not null default timezone('utc', now())`
- `updated_at timestamptz not null default timezone('utc', now())`

Indices e restricoes:

- Indice por `student_id, measured_at desc, created_at desc`
- Check constraint para manter `weight_kg > 0`
- Check constraint para limitar peso a uma faixa coerente, alinhada com a regra atual de interface

Faixa recomendada:

- minimo `30`
- maximo `300`

## Migracao de dados existentes

Como ja existe um primeiro peso lancado, a migracao devera:

- Criar a tabela nova.
- Inserir um registro inicial em `student_weight_history` para cada aluno que tenha `health_restrictions.peso_kg` preenchido.
- Usar `measured_at` como a melhor data disponivel do registro de saude:
  `health_restrictions.last_updated_at::date`, com fallback para `current_date` caso necessario.
- Marcar `source = 'coordenacao'` para o dado migrado.
- Preencher `notes` com uma observacao tecnica curta, indicando migracao do campo legado.

Esse seed de migracao sera idempotente por verificacao de existencia de historico para o aluno antes da insercao.

## Permissoes e RLS

Adicionar RLS para `student_weight_history` com a seguinte regra:

- Aluno:
  `select` e `insert` apenas do proprio `student_id`
- Coordenacao:
  `select` e `insert` em qualquer aluno
- Coordenacao:
  `update` e `delete` nao sao necessarios para a regra de negocio aprovada e devem permanecer bloqueados
- Secretaria:
  sem acesso direto por padrao, a menos que uma necessidade de relatorio especifica exija leitura controlada
- Instrutor:
  sem acesso direto

Essa politica mantem o historico imutavel por permissao de banco, e nao apenas por convencao de interface.

## Fluxo de aplicacao

### 1. Novo lancamento de peso

Criar uma server action especifica para peso, separada de `updateHealthAction`, para evitar misturar atualizacao de historico com edicao do restante da ficha medica.

Responsabilidades da action:

- Validar permissao do usuario
- Validar `studentId`
- Validar `weight_kg`
- Validar `measured_at`
- Derivar `source` no servidor a partir da sessao
- Derivar `created_by` e `created_by_role` no servidor
- Inserir novo registro em `student_weight_history`
- Atualizar `health_restrictions.peso_kg` com o ultimo valor do historico
- Garantir existencia de linha em `health_restrictions` quando necessario
- Revalidar a ficha da Coordenacao e do Aluno

Regra de preenchimento:

- Aluno:
  `measured_at` inicia com a data atual e permanece editavel apenas no formulario se isso for exigencia funcional explicita no produto
- Coordenacao:
  pode ajustar `measured_at`

Decisao recomendada para esta entrega:

- O formulario mostra `measured_at` preenchido com a data atual para todos.
- A action rejeita alteracao retroativa para aluno caso o produto queira restringir isso depois.
- Como o requisito so explicitou ajuste pela Coordenacao, a interface do aluno pode enviar a data atual sem campo editavel.

### 2. Peso atual da ficha

O peso atual exibido na aba `Saude` deixara de ser um input independente de `health_restrictions` e passara a ser apresentado como derivado do historico:

- valor atual = ultimo item de `student_weight_history` ordenado por `measured_at desc, created_at desc`

Compatibilidade:

- `health_restrictions.peso_kg` continuara sendo atualizado pela action de historico
- consultas legadas continuam funcionando
- relatorios existentes continuam operando enquanto a camada nova e adotada gradualmente

### 3. Consulta historica

Adicionar carregamento do historico completo do aluno nas paginas:

- [page.tsx](/C:/Projetos/CFO_Alunos/src/app/(app)/coordenacao/alunos/[id]/page.tsx)
- [page.tsx](/C:/Projetos/CFO_Alunos/src/app/(app)/aluno/ficha/page.tsx)

Criar query dedicada em [students.ts](/C:/Projetos/CFO_Alunos/src/lib/supabase/queries/students.ts):

- `fetchStudentWeightHistory(supabase, studentId)`

Ordenacao recomendada:

- tabela visual: mais recente para mais antigo
- grafico: mais antigo para mais recente

### 4. Grafico

Adicionar um grafico de linha simples na aba `Saude`, sem introduzir dependencia pesada nova.

Abordagem recomendada:

- componente local em React com `svg`
- pontos clicaveis/tocaveis
- tooltip simples com data e peso
- layout responsivo por `viewBox`

Razao:

- o projeto nao possui biblioteca de grafico instalada
- a necessidade visual e pequena
- reduz risco de bundle e de divergencia visual

## Estrutura de interface

Na aba `Saude`, a area deve ficar organizada nesta ordem:

1. Card de dados clinicos existentes
2. Card `Historico de Peso`
3. Card de `Resumo operacional` para Coordenacao

O card `Historico de Peso` tera:

- resumo do peso atual e ultima medicao
- formulario de novo lancamento
- grafico de evolucao
- tabela de historico

Comportamentos:

- sem historico:
  mostrar mensagem amigavel e ocultar grafico vazio
- com um unico registro:
  mostrar ponto unico sem linha quebrada
- mobile:
  tabela com colunas legiveis e scroll horizontal controlado

## Campos do formulario

Campos do novo lancamento:

- `Peso`
- `Data da medicao`
- `Responsavel pelo lancamento`
- `Origem do lancamento`
- `Observacao opcional`

Origem:

- `Aluno`
- `Coordenacao`

Preenchimento automatico:

- `Responsavel pelo lancamento` vira somente leitura na interface, baseado na sessao atual
- `Origem` pode ser inferida automaticamente da role atual e enviada pela action como valor confiavel do servidor

Decisao recomendada:

- nao confiar em `created_by_role` nem em `source` vindos do cliente
- derivar ambos no servidor a partir da sessao

## Regras de validacao

Validacoes de dominio:

- peso obrigatorio
- peso maior que zero
- peso dentro de faixa coerente
- data obrigatoria
- observacao opcional com limite de tamanho razoavel

Validacoes de interface:

- aceitar decimal com passo `0.1`
- exibir unidade `kg`
- mensagem clara para valor invalido

Validacoes de servidor:

- normalizar decimal
- impedir `NaN`
- impedir data invalida
- impedir insercao para aluno em outro `student_id`

## Auditoria

O historico em si ja preserva a trilha de medicao. Ainda assim, os inserts em `student_weight_history` devem entrar na trilha de auditoria geral do sistema.

Recomendacao:

- incluir trigger de auditoria para a nova tabela em `public.audit_logs`

Como a tabela usa `id` proprio, ela pode reutilizar `public.audit_trigger()`.

## Impacto em relatorios

Entrega minima desta funcionalidade:

- `Peso atual`
- `Ultima data de medicao`
- `Quantidade de registros de peso`

Entrega opcional na mesma rodada, se o custo permanecer baixo:

- `Variacao de peso no periodo`

Estrategia:

- manter relatorios atuais lendo `health_restrictions.peso_kg`
- ampliar catalogos e builders para incluir campos novos derivados do historico
- aplicar LGPD e role checks existentes para qualquer campo de saude novo

## Impacto em filtros avancados

Nao e obrigatorio adicionar filtros novos de peso nesta primeira entrega. O requisito pede disponibilidade em relatorios por filtro e personalizados, nao necessariamente novos filtros por faixa de peso.

Portanto:

- incluir colunas derivadas de peso no payload de exportacao quando a selecao pedir
- evitar expandir a UI de filtros avancados alem do necessario nesta rodada

## Componentes e limites de responsabilidade

### Banco

- migration nova em `supabase/migrations`
- policies novas em RLS
- trigger de auditoria nova

### Query layer

- ampliar [students.ts](/C:/Projetos/CFO_Alunos/src/lib/supabase/queries/students.ts) com tipos e query do historico

### Server actions

- nova action dedicada para inserir peso
- possivel action futura para consultas administrativas, mas nao necessaria agora

### UI

- evoluir [SaudeTab.tsx](/C:/Projetos/CFO_Alunos/src/app/(app)/coordenacao/alunos/[id]/tabs/SaudeTab.tsx)
- criar componentes focados para formulario, grafico e tabela do historico

### Relatorios

- atualizar catalogos e builders apenas onde o historico realmente aparecer

## Erros e estados vazios

Estados obrigatorios:

- sem historico
- historico com 1 item
- historico com varios itens
- erro de validacao do formulario
- erro de permissao
- erro de persistencia

Mensagens:

- usar texto amigavel e curto
- manter o padrao visual atual de `Alert`

## Testes

### Banco

- migracao cria tabela, policies e trigger sem quebrar reset
- migracao popula primeiro lancamento a partir de `peso_kg` legado

### Unitarios

- validacao de payload da action
- ordenacao do historico
- calculo do peso atual
- transformacao para dados do grafico

### Integracao

- inserir novo peso atualiza historico e sincroniza `health_restrictions.peso_kg`
- aluno nao insere para outro aluno
- coordenacao insere para qualquer aluno

### E2E

- aluno acessa aba `Saude`, ve historico e insere novo peso proprio
- coordenacao acessa ficha de aluno, insere novo peso e ve tabela atualizada
- estado vazio sem grafico

## Riscos e mitigacoes

- Risco:
  duplicar regra de "peso atual" em varios lugares
  Mitigacao:
  centralizar leitura do ultimo peso em query/helper dedicado

- Risco:
  divergencia entre historico e `health_restrictions.peso_kg`
  Mitigacao:
  toda insercao passa pela action dedicada e sincroniza o legado no mesmo fluxo

- Risco:
  aluno manipular `source` ou `created_by_role`
  Mitigacao:
  derivar esses campos exclusivamente no servidor

- Risco:
  expandir demais a entrega com filtros novos complexos
  Mitigacao:
  focar em historico, grafico, sincronizacao e campos de relatorio

## Escopo aprovado para implementacao

Entram nesta entrega:

- nova tabela `student_weight_history`
- migracao do primeiro peso ja existente
- RLS append-only
- action para novo lancamento
- ficha do aluno e da Coordenacao com card de historico
- grafico de linha simples
- tabela historica
- sincronizacao de `health_restrictions.peso_kg`
- campos derivados basicos em relatorios
- testes focados

Ficam fora por agora:

- edicao ou exclusao de registros historicos
- filtros avancados por faixa de peso
- analytics mais complexas de variacao por janela arbitraria
