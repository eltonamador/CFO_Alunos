# Gestão Acadêmica — uso, homologação e implantação

O núcleo está implementado na branch local `feat/gestao-academica`, a partir de `75fdc30`. A alteração foi preparada no checkout isolado `CFO_Alunos-academico`. Não foi publicada nem aplicada ao Supabase em uso. O diagnóstico do banco se baseia nas migrations do repositório; a correspondência do esquema remoto ainda deve ser conferida.

## O que está entregue

- Catálogo de 82 componentes CFO I/II/III, com carga da matriz, fonte e conflitos do ementário. Total de referência: 4.924 h/a. TCC é mantido na matriz, com tipo de avaliação específico.
- Ofertas por turma e ano letivo, sem alterar a fase atual nem o cadastro dos cadetes.
- Chefes de cadeira/instrutores, ato de designação e conta opcional. Um nome cadastrado sem conta não concede acesso.
- Matrícula histórica por oferta; identificação mínima preservada quando o cadastro ou a turma muda.
- VCs/VF e notas consolidadas, com correção justificada, controle de versão e auditoria atômica no banco.
- Frequência consolidada em h/a, separando faltas justificadas e não justificadas.
- Política provisória do RI criada por oferta, com referência registrada e versão imutável. Ofertas legadas sem política continuam armazenando notas sem resultado conclusivo.
- Média, VF referencial, VF mínima efetiva, redutor, desconto de faltas e situação por disciplina. Comparações podem usar intermediários exatos ou arredondados, conforme decisão explícita.
- Resumo por cadete, entre os três anos: disciplinas distintas em VF no mesmo curso, pendências e alerta de limite. Não duplica a contagem ao repetir uma oferta nem reinicia o contador ao mudar de turma no mesmo curso.
- Consulta por perfil e histórico integral com paginação visual. Rotas acadêmicas não são armazenadas pelo cache padrão do service worker.

## Fluxo de uso após instalar as migrations

1. Coordenação acessa **Gestão Acadêmica**, seleciona fase/turma e consulta o catálogo e suas fontes.
2. Cria a oferta informando disciplina, turma, ano letivo, CH adotada, quantidade de VCs e referência da decisão. A tela sugere os valores provisórios do RI e usa o próprio RI como referência inicial. Para as cinco divergências de CH, a carga deve refletir o valor adotado pela coordenação.
3. Na oferta, associa o responsável e informa a designação. Para conceder acesso, vincula perfil ativo de instrutor/coordenação. Encerrar a designação revoga o acesso correspondente sem apagar histórico; nova designação pode ser cadastrada depois.
4. Matricula os cadetes da turma. Alunos excluídos logicamente não são oferecidos para nova matrícula. Não há promoção automática de fase ou duplicação de cadastro.
5. Cadastra VCs e, quando aplicável, VF. Cada nota representa uma **VC consolidada**, conforme o plano de avaliação. Componentes VI, trabalhos e proporção teórica/prática não são calculados por esta versão.
6. Em **Regras e fontes**, confere a política provisória vinculada à oferta. As opções permanecem visíveis para documentar a interpretação aplicada; a troca de uma política já vinculada será feita por um fluxo versionado em sprint posterior.
7. Lança notas e confirma os totais de faltas da oferta, inclusive zero quando conferido. Campo de nota vazio permanece pendente. Ausência injustificada à avaliação que deva receber zero precisa ser lançada explicitamente com sua justificativa administrativa.
8. Consulta os resultados. A meta de VF referencial é anterior ao desconto terminal; a meta efetiva considera a política completa. Se nenhuma nota até 10 permitir aprovação, a tela pede análise. Com comparações exatas, o valor exibido arredondado pode coincidir com o corte sem satisfazê-lo; a interface informa essa condição.
9. Para corrigir nota/frequência, informa motivo. Se outra pessoa salvou antes, a gravação é recusada até atualizar e conferir a versão recente. A auditoria conserva antes/depois e autoria real da sessão.

Instrutor vê somente ofertas em que está designado e pode cadastrar avaliações/lançar notas nessas ofertas ativas. Secretaria consulta. Cadete vê somente suas próprias matrículas e notas. Política já aprovada não pode ser substituída pelo formulário; revisão de regras de uma oferta em andamento exige procedimento versionado adicional, sem edição silenciosa dos resultados históricos.

## Migrações

| Arquivo                                   | Efeito                                                                                                                                                                                                                           |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0036_academic_management.sql`            | Tabelas `academic_disciplines`, `academic_policies`, `academic_offerings`, `academic_assignments`, `academic_enrollments`, `academic_assessments`, `academic_grades`, `academic_audit_events`; RLS, constraints, triggers e RPCs |
| `0037_academic_catalog.sql`               | Insere os 82 componentes do PPC; `ON CONFLICT(code) DO NOTHING` preserva registros existentes                                                                                                                                    |
| `0038_academic_ri_provisional_policy.sql` | Cria a oferta e sua política provisória do RI na mesma transação                                                                                                                                                                 |

A interpretação provisória autorizada adota: aprovação direta 7; VF para médias abaixo de 7 sem
piso adicional; aprovação após VF com média 5 e fator redutor; limite de três disciplinas em VF;
faltas não justificadas limitadas a 25% e descontadas da nota final; frequência mínima global de
90%; duas casas decimais, empate para par e comparação após arredondamento. Para a quantidade de
VCs, usa-se 1 até 20 h/a, 2 de 21 a 60 h/a e 3 acima de 60 h/a. A faixa de 41 a 60 h/a é uma
complementação provisória pela matriz do PPC, pois o RI tem lacuna nessa faixa. Cada oferta conserva
uma cópia imutável desses parâmetros e sua referência de decisão.

Não são criados alunos, usuários, ofertas, instrutores, notas nem políticas fictícias. Não há atualização dos dados legados, alteração de migrations antigas ou reset do banco. Os únicos arquivos legados de produto modificados são `AppShell.tsx` (quatro links) e `sw.ts` (regra de rede para o acadêmico).

As notas são gravadas pela RPC `academic_save_grade`; política pela `academic_configure_policy`; frequência pela `academic_save_attendance`. A API de tabelas não permite contornar a RPC de notas. FKs compostas bloqueiam avaliação e matrícula de ofertas diferentes. Auditoria não pode ser editada pela API e qualquer falha de log aborta a gravação correspondente.

`src/lib/supabase/types.ts`, gerado do banco, não foi editado. A extensão de tipos está isolada em `academic-management/infrastructure/database.ts`. Após gerar os tipos de uma instância de homologação com o esquema completo, essa extensão pode ser incorporada à geração regular, sem remover os demais módulos.

## Checkpoint de implantação no ambiente real

1. Revisar a branch e confirmar que não há alterações concorrentes do projeto a integrar. O `main` original permanece no estado inspecionado e `lista.txt` permanece intocado.
2. Conferir migrations já aplicadas no ambiente de destino e ter backup restaurável. Esta execução não auditou nem alterou o estado remoto.
3. Aplicar as migrations pendentes primeiro em homologação, usando o procedimento Supabase já adotado pelo projeto. Não executar `db:reset`, scripts de saneamento ou seed de usuários no banco em uso.
4. Testar as quatro contas/perfis com dados artificiais: coordenação, instrutor designado e não designado, secretaria e dois cadetes. Conferir acesso por chamada direta à API, conta inativa, troca de sessão, erro de conexão e lançamento concorrente em duas sessões.
5. Conferir os atos e regras com a coordenação; começar por uma oferta piloto de CFO I, comparando as médias manualmente com o motor e o relatório normativo. Só expandir a operação depois desse checkpoint.
6. Publicar a versão do aplicativo com o procedimento existente. A versão anterior do aplicativo pode continuar operando sobre o esquema aditivo.

Rollback operacional: retornar a versão do aplicativo e retirar o acesso ao novo módulo; **conservar as tabelas e a auditoria**. Não apagar registros acadêmicos para desfazer a implantação. Qualquer correção de esquema posterior deve usar nova migration.

## Testes reproduzíveis

No checkout, com as dependências existentes:

```sh
pnpm lint
pnpm typecheck
pnpm exec vitest run --no-cache
```

Banco descartável, sem Docker, credenciais ou acesso à nuvem:

```sh
npm install --prefix /private/tmp/cfo-academic-db-runtime --no-save \
  @electric-sql/pglite@0.5.8 @electric-sql/pglite-pgtap@0.0.9
CFO_ACADEMIC_RUNTIME=/private/tmp/cfo-academic-db-runtime node scripts/test-academic-db.mjs
```

O harness aplica as migrations legadas necessárias (0001–0012 e 0014), 0036, 0037 e 0038 em PostgreSQL WASM e executa pgTAP. Não substitui Supabase Auth, PostgREST, Storage, todas as migrations dos outros módulos nem corrida entre conexões. A política de revisão obsoleta, RLS e falha atômica da auditoria foram testadas. O CI Supabase existente continua incluindo `supabase/tests/academic.test.sql` na suíte de banco completo.

O build foi executado com URL local e chave fictícia. Seu primeiro acesso às fontes Google requereu rede; o produto já possuía essa dependência. A suíte Playwright legada não foi apontada ao banco real, pois carrega `.env.local` e depende de cadetes específicos.

## Pendências reservadas para próximas sprints

| Item                                                        | Motivo e evolução                                                                                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Média ponderada/classificação e frequência do curso inteiro | Pesos não identificados e histórico completo ainda precisa ser validado; não emitir média global oficial ou desligamento automático                                            |
| Comportamento Escolar                                       | Conflito de cortes 5/7 no RI, CH e distribuição anual ausentes; sem derivar nota automaticamente de FO                                                                         |
| TCC, estágio e atividades                                   | Critérios próprios ainda não fornecidos; manter matrícula/frequência e situação específica pendente                                                                            |
| Componentes de VC/VI e limite teórico operacional           | Nesta versão, a nota é consolidada pelo responsável conforme PLAV; evolução para componentes com seus limites normativos                                                       |
| Segunda chamada, visto e recursos                           | Exigem eventos, prazos, decisões e integração com os documentos oficiais; retificação auditada não equivale ao processo completo                                               |
| Homologação e revisão de política em oferta ativa           | Criar fluxo de decisão/publicação e snapshots de boletins, preservando versões e resultados anteriores                                                                         |
| Materiais didáticos                                         | Futuro vínculo `academic_materials → offering_id`, autoria/versão/publicação, bucket próprio privado e acesso por RLS; não reutilizar documentos pessoais ou a tela de enxoval |
| Diário de frequência                                        | Evoluir do total consolidado para eventos por aula, justificativa/compensação e conferência de completude                                                                      |

Essas pendências não impedem o núcleo de cadastro e lançamento. Impedem que ele seja apresentado como sistema completo de homologação ou conclusão do curso.
