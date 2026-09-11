# Gestão Acadêmica — registro de sprints

Base: `75fdc30`, checkout isolado `feat/gestao-academica`, iniciado em 10/09/2026. O checkout original, o arquivo não rastreado `lista.txt` e os documentos em `sources/` foram preservados. O banco remoto foi consultado somente por dry-run; nenhuma migration foi aplicada.

## Sprint 0 — inspeção e diagnóstico

Concluída antes de editar o código. Entrega: `GESTAO_ACADEMICA_DIAGNOSTICO.md`, com diagnóstico, proposta de arquitetura, modelo de dados, regras, fluxos, migração, riscos e checkpoints. Foram lidos o repositório, as instruções locais, PPC e RI, sem usar afirmações da conversa anterior como prova normativa.

Baseline executado no checkout isolado: **102 testes Vitest em 13 arquivos passaram**. Não houve mudança de dependências do produto.

## Sprint 1 — catálogo, regras e persistência

Concluída. Commit local do núcleo: `82e6376`. Arquivos criados:

- `src/modules/academic-management/domain/academic.ts`: contrato de política explícita e motor puro de cálculo.
- `src/modules/academic-management/domain/academic.test.ts`: testes dos limites e decisões normativas.
- `src/modules/academic-management/domain/catalog.ts`: catálogo CFO I/II/III com fonte e conflitos.
- `supabase/migrations/0036_academic_management.sql`: oito tabelas, RLS, invariantes, RPCs e auditoria atômica.
- `supabase/migrations/0037_academic_catalog.sql`: 82 componentes, com seed idempotente.
- `supabase/tests/academic.test.sql`: segurança, integridade, auditoria e revisão concorrente.
- `scripts/test-academic-db.mjs`: banco descartável PostgreSQL WASM/pgTAP.
- `docs/GESTAO_ACADEMICA_NORMAS.md`: evidências, conflitos, decisões e limites das fontes.

Verificação inicial: **49 testes de domínio passaram**; **71 asserções pgTAP passaram**, aplicando migrations legadas necessárias e ambas as novas. A revisão integrada ampliou a cobertura para **58 testes de domínio e 82 asserções pgTAP**, incluindo TCC, estágio de comparação, VF efetiva, reassociação e frequência histórica. TypeScript sem emissão passou nesta etapa.

O banco de teste usa PGlite 0.5.8 e pgTAP 0.0.9 instalados fora do produto. Simula `auth.uid()` e papéis; não substitui integração com Supabase Auth/PostgREST/Storage nem teste de corrida entre conexões. A revisão obsoleta é testada. Nenhuma migration foi aplicada ao banco em uso.

Pendências de decisão: quantidade de VCs, piso VF, CH divergentes, base de frequência, ordem do desconto, precisão intermediária e ato de aprovação. Componentes especiais e média ponderada de curso permanecem sem cálculo presumido.

Próximo passo realizado: integrar consultas, ações e telas por perfil.

## Sprint 2 — operação por perfil

Concluída. Commit local das telas/integrações: `0f180c4`. Implementação: catálogo/ofertas, política aprovada por ato, designação, matrícula, VC/VF, lançamento/correção de nota, frequência consolidada e histórico. Consulta do cadete limitada à própria matrícula; instrutor limitado a ofertas designadas; secretaria somente leitura.

Arquivos: `src/modules/academic-management/{application,infrastructure,presentation}/`, `src/components/app/academic/`, rotas `src/app/(app)/{coordenacao,instrutor,secretaria,aluno}/academico/`, `src/components/app/AppShell.tsx`.

Verificações: **22 testes de comandos e ações** e **6 testes de interface** passaram; lint e TypeScript passaram. Migrations: nenhuma adicional nesta sprint. Depois de vinculada, a política não oferece uma ação de substituição que o banco recusaria. Histórico é carregado integralmente por páginas do banco e apresentado em páginas de 25 eventos.

Próximo passo realizado: validação integrada da interface, cálculos e histórico, build e regressão.

## Sprint 3 — integração e entrega

Concluída para entrega do código local. Arquivos de integração: `src/app/sw.ts`, `application/summary.ts` e seu teste, `infrastructure/queries.ts` e seu teste, `docs/GESTAO_ACADEMICA_IMPLANTACAO.md` e este registro.

Revisão independente corrigiu: espaços não viram nota zero; TCC não usa fórmula comum; VF mínima efetiva considera redutor/desconto; política permite cortes exatos ou arredondados; histórico não fica truncado em 100 eventos; cadetes excluídos não aparecem para matrícula; disciplinas repetidas não duplicam o contador de VF; transferência de turma no mesmo curso não reinicia o contador; oferta inativa não oferece edição; política aprovada é imutável; designação encerrada pode ser sucedida por nova designação; falha de auditoria cancela a nota.

Verificação integrada: **198 testes Vitest em 19 arquivos**, **91 asserções pgTAP**, lint sem warnings, TypeScript e build Next.js passaram. Os 102 testes legados permanecem aprovados. O build foi executado com endereço de Supabase local e chave fictícia; nenhum dado de produção foi consultado. Os testes de banco passaram no PostgreSQL WASM descartável. O guia de implantação descreve como reproduzir os testes e os limites do ambiente.

Conferência visual adicional: dashboard, notas, política e histórico em 390 e 1440 px (8 cenários), sem extrapolação horizontal ou erros de renderização. Usou dados artificiais, mocks de ações/autenticação/banco e tipografia fallback em harness separado, sem criar rota de bypass no produto. Não equivale a E2E autenticado. Evidências locais: `../academic-qa/findings.json` e imagens `../academic-qa/{dashboard,notes,policy,history}-{390,1440}.png`, a partir da raiz do checkout. O servidor temporário foi encerrado.

Migrations: 0036, 0037 e 0038; nenhum banco em uso foi alterado. A 0038 aplica automaticamente a política provisória do RI às novas ofertas, mantendo uma cópia versionada por oferta. O projeto original continua no `main` original e conserva apenas o `lista.txt` que já estava não rastreado. As fontes PPC/RI permaneceram somente leitura.

Pendências: homologação no Supabase real (Auth/PostgREST, sessões e corrida real de duas conexões), decisões normativas da coordenação e implantação. A suíte Playwright legada não foi executada contra o banco real. Média ponderada/frequência global, componentes VC/VI, comportamento, critérios TCC/estágio/atividades, recursos, boletins homologados e materiais didáticos ficam explicitamente para as próximas sprints descritas no guia.

Próximo checkpoint: aplicar em homologação, registrar ato de política e comparar uma oferta piloto CFO I com apuração manual. Só então publicar e ampliar o uso aos demais componentes.

## Sprint 4 — RI revisado de 2026 e Portaria 550

Concluída no código local. Foram lidos integralmente a Portaria nº 550/2026, com seis páginas, e os trechos acadêmicos pertinentes do RI ABM 2026 revisado, renderizado em 55 páginas. O DOCX não contém alterações controladas ou comentários e não apresenta prova de publicação; por isso, suas regras permanecem identificadas como provisórias.

A política versão2 corrige o piso da VF para5, remove o desconto de faltas da nota e adota as quatro faixas de VC do art.15:1 até20 h/a,2 entre21–40,3 entre41–60 e4 acima de60 h/a. Políticas versão1 continuam válidas e reproduzíveis. A migration `0039_academic_ri_2026_policy.sql` atualiza o contrato de parâmetros e a criação transacional de novas ofertas sem modificar políticas históricas.

A Portaria nº 550 foi convertida em catálogo de referência com24 linhas. Para CFO I de2026, a criação da oferta sugere a carga do ato específico, inclusive38 h/a para Legislação Bombeiro Militar. A página da oferta exibe os instrutores e monitores exatamente como constam do ato, mas exige confirmação antes de criar vínculo ou conceder acesso. Ética e Cidadania e Atividades Socioculturais continuam sem designação; o código26 usado pela Portaria para Estágio é mapeado ao CFO1-25 por nome, com o desalinhamento documentado.

Verificação: **205 testes Vitest em20 arquivos**, **92 asserções pgTAP**, TypeScript, lint e build Next.js passaram. O build usou endereço Supabase local e chave fictícia. Nenhum banco remoto foi acessado ou alterado.

Próximo checkpoint: confirmar o ato de publicação do RI revisado e testar em homologação uma oferta CFO1-09 de2026, verificando carga38 h/a, duas VCs, piso5 para VF e ausência de desconto de faltas.

## Sprint 5 — homologação local automatizada

Concluída no ambiente Supabase local. O Chromium gerenciado pelo Playwright foi instalado e a suíte E2E passou a tratar o primeiro acesso obrigatório sem desativar a troca de senha do produto. Como os cenários compartilham contas locais, o Playwright agora usa um worker; isso remove a corrida em que vários testes alteravam simultaneamente a senha do mesmo usuário.

Foram acrescentados dois cenários acadêmicos repetíveis. O primeiro autentica a Coordenação e percorre oferta, política provisória, matrícula de cadete, cadastro de VC, lançamento ou retificação de nota e conferência da auditoria. O segundo cria ou reutiliza a oferta piloto CFO1-09/2026 e confirma na interface a carga38 h/a definida pela Portaria550, duas VCs, o conflito30×38 preservado, piso5 para VF e ausência de desconto de faltas da política RI revisada. A verificação antiga do painel do aluno deixou de presumir cadastro100% completo e agora valida os quatro percentuais no intervalo0–100. Os relatórios PDF são conferidos pela resposta HTTP, assinatura `%PDF`, tipo e nome do arquivo, evitando depender do comportamento do Chromium de abrir ou baixar o documento.

Verificação: **11 cenários Playwright aprovados em Chromium**, incluindo Gestão Acadêmica, autenticação, primeiro acesso, portal do aluno e quatro relatórios em XLSX/PDF. Os cenários acadêmicos também foram executados isoladamente com sucesso. Além disso, **216 testes Vitest**, **235 testes pgTAP**, lint e TypeScript passaram. O novo comando `pnpm db:local:homologate` reproduziu todo o processo desde o reset; quando o health check do Storage expirou na primeira tentativa, o reset foi repetido automaticamente e concluído na segunda. Foram usados apenas usuários e dados fictícios no Supabase local; produção permaneceu intacta.

Arquivos alterados: `playwright.config.ts`, `tests/e2e/helpers/auth.ts`, `tests/e2e/aluno.spec.ts`, `tests/e2e/reports.spec.ts`, `tests/e2e/academic.spec.ts`, `scripts/supabase-automation.mjs`, `package.json` e `docs/AUTOMACAO_SUPABASE.md`. Migrations: nenhuma nesta sprint.

Próximo checkpoint: preparar a implantação controlada das migrations `0036` a `0045`, com backup, conferência do vínculo remoto e roteiro de rollback, sem executá-la antes da autorização explícita.

## Inventário final de arquivos

45 arquivos no diff da entrega; os dois arquivos preexistentes de produto alterados são `src/app/sw.ts` e `src/components/app/AppShell.tsx`.

- `docs/GESTAO_ACADEMICA_DIAGNOSTICO.md`
- `docs/GESTAO_ACADEMICA_IMPLANTACAO.md`
- `docs/GESTAO_ACADEMICA_NORMAS.md`
- `docs/GESTAO_ACADEMICA_SPRINTS.md`
- `scripts/test-academic-db.mjs`
- `src/app/(app)/aluno/academico/[id]/page.tsx`
- `src/app/(app)/aluno/academico/loading.tsx`
- `src/app/(app)/aluno/academico/page.tsx`
- `src/app/(app)/coordenacao/academico/[id]/page.tsx`
- `src/app/(app)/coordenacao/academico/loading.tsx`
- `src/app/(app)/coordenacao/academico/page.tsx`
- `src/app/(app)/instrutor/academico/[id]/page.tsx`
- `src/app/(app)/instrutor/academico/loading.tsx`
- `src/app/(app)/instrutor/academico/page.tsx`
- `src/app/(app)/secretaria/academico/[id]/page.tsx`
- `src/app/(app)/secretaria/academico/loading.tsx`
- `src/app/(app)/secretaria/academico/page.tsx`
- `src/app/sw.ts`
- `src/components/app/AppShell.tsx`
- `src/components/app/academic/AcademicActionForm.tsx`
- `src/components/app/academic/AcademicAudit.tsx`
- `src/components/app/academic/AcademicDashboardPage.tsx`
- `src/components/app/academic/AcademicDetailPage.tsx`
- `src/components/app/academic/AcademicForms.test.tsx`
- `src/components/app/academic/AcademicGradebook.tsx`
- `src/components/app/academic/AcademicPolicyForm.tsx`
- `src/components/app/academic/AcademicResult.tsx`
- `src/components/app/academic/AcademicSetupForms.tsx`
- `src/modules/academic-management/application/commands.test.ts`
- `src/modules/academic-management/application/commands.ts`
- `src/modules/academic-management/application/summary.test.ts`
- `src/modules/academic-management/application/summary.ts`
- `src/modules/academic-management/application/types.ts`
- `src/modules/academic-management/domain/academic.test.ts`
- `src/modules/academic-management/domain/academic.ts`
- `src/modules/academic-management/domain/catalog.ts`
- `src/modules/academic-management/domain/designations.ts`
- `src/modules/academic-management/domain/designations.test.ts`
- `src/modules/academic-management/domain/portaria-550-cfo1.json`
- `src/modules/academic-management/infrastructure/database.ts`
- `src/modules/academic-management/infrastructure/queries.test.ts`
- `src/modules/academic-management/infrastructure/queries.ts`
- `src/modules/academic-management/presentation/actions.test.ts`
- `src/modules/academic-management/presentation/actions.ts`
- `supabase/migrations/0036_academic_management.sql`
- `supabase/migrations/0037_academic_catalog.sql`
- `supabase/migrations/0038_academic_ri_provisional_policy.sql`
- `supabase/migrations/0039_academic_ri_2026_policy.sql`
- `supabase/tests/academic.test.sql`
