# CFO Alunos — diagnóstico e plano de Gestão Acadêmica

Data: 10/09/2026. Inspeção anterior à implementação. Repositório original: `/Users/elton.amador/projetos/CFO_Alunos`, branch `main`, commit `75fdc30`. Há um arquivo não rastreado `lista.txt`, que será preservado. As fontes sincronizadas em `sources/` são somente leitura.

## 1. Diagnóstico do sistema atual

O sistema é uma aplicação Next.js 14.2.15 (App Router, Server Components e Server Actions), React 18 e TypeScript estrito. Usa Tailwind, componentes próprios sobre Radix, ícones Lucide e tokens institucionais vermelho, dourado e fundo neutro, com temas claro/escuro. A interface tem sidebar no desktop e navegação inferior no celular. Não há módulo de disciplinas/notas implementado.

`src/modules/` separa domínio, aplicação, infraestrutura e apresentação. Algumas áreas têm entidades e portas; módulos recentes usam funções de domínio puras, consultas Supabase e Server Actions. A extensão seguirá esse padrão, sem troca de stack.

O banco é Supabase/PostgreSQL, com migrations versionadas `0001`–`0035`. `courses → classes → students` já modela curso, turma e cadete. `students.pelotao` é o campo legado da **Fase do CFO** (CFO I, II, III), não um pelotão. Não será renomeado nem usado como única fonte do histórico acadêmico.

A identidade usa Supabase Auth, cookies SSR, `profiles` e papéis `coordenacao`, `secretaria`, `instrutor`, `aluno`. Middleware limita os prefixos das rotas e `getSession()`/`requireRole()` protegem páginas. O novo módulo usará o cliente da sessão e RLS, sem `service_role` para notas.

Integrações existentes: documentos em Storage, enxoval, acompanhamento de cadetes, escalas operacionais, comunicados, notificações push, avisos por e-mail, exportações Excel/PDF e PWA Serwist. A tela atual “Materiais” trata do enxoval; material didático terá identidade própria vinculada à oferta acadêmica.

Referências de código: `package.json`, `src/components/app/AppShell.tsx`, `src/components/ui/`, `src/modules/identity/presentation/session.ts`, `src/lib/supabase/{server,middleware,types}.ts`, `src/modules/cadet-followup/`, `supabase/migrations/`, `src/app/sw.ts`.

Os documentos `docs/STATUS_ATUAL.md` e `docs/PROXIMAS_TAREFAS.md` descrevem principalmente maio/2026 e não são prova de que os testes atuais passam. O código contém módulos posteriores. A validação será repetida sobre a implementação.

### Riscos encontrados na base

- `current_role()` não considera `profiles.active`; o módulo terá verificação de perfil ativo em cada escrita e nas políticas próprias.
- O trigger legado de auditoria suprime exceções. Notas exigem auditoria atômica: se falhar o histórico, falha também a escrita.
- Políticas legadas de `students` e de leitura de auditoria são mais amplas que o escopo acadêmico desejado. As consultas acadêmicas usarão identificação mínima e histórico próprio por oferta/cadete.
- O service worker usa cache padrão. As rotas acadêmicas precisam de acesso pela rede para evitar notas de sessão anterior armazenadas em dispositivo compartilhado.
- Não há servidor PostgreSQL/Docker em execução. Testes reais de banco exigem ambiente descartável; nenhum reset será executado contra os dados existentes ou contra Supabase Cloud.

## 2. Fontes normativas e conflitos

Fontes primárias locais: `sources/PPC CFO CBMAP _ Revisao.docx` (PPC 2026–2029) e `sources/regimento interno.pdf` (Boletim Geral nº 222, 06/12/2023). A conversa anterior é contexto, não substitui conferência nas fontes.

| Tema                  | Evidência                                                                                                                                    | Tratamento                                                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| VCs por carga         | PPC §4.3.1: até 30 h/a = 1, 31–60 = 2, acima de 60 = 3. RI art. 15: até 20 = 1, acima de 20 até 40 = 2, acima de 60 = 3; lacuna 41–60        | Quantidade explícita na oferta, com referência da decisão. Não preencher lacuna automaticamente                                       |
| Aprovação direta      | RI arts. 34 e 37: média aritmética das VCs, mínimo 7                                                                                         | Motor de domínio com média aritmética; zero é nota válida e ausência de nota não é zero                                               |
| Acesso à VF           | PPC §4.3.1: média ≥5 e <7, frequência ≥75%. RI art. 38 não explicita piso 5                                                                  | Piso e tratamento de frequência definidos por política versionada                                                                     |
| Cálculo VF            | RI art. 38: nota necessária = 10 − MVC; MFVF = (MVC + VF)/2; aprovado se MFVF ≥5; redutor (MFVF −5)/2 +5, limite referido 6,75               | Exibir média anterior, nota necessária, média VF e nota com redutor separadamente                                                     |
| Frequência            | RI art. 43: faltas injustificadas no máximo 25% da CH por disciplina; art. 42: mínimo 90% da CH total do curso. PPC refere 75% na disciplina | Separar faltas justificadas/injustificadas e frequência da disciplina/curso; dados incompletos geram pendência                        |
| Desconto de faltas    | RI art. 43 §5: NFD = ND − NF×10/CH                                                                                                           | Ordem do desconto em relação à elegibilidade da VF não está explícita; decisão obrigatória, sem atribuir uma interpretação como norma |
| Precisão              | RI art. 33 e regra de arredondamento; art. 35 prevê média de curso com três casas                                                            | Preservar precisão dos valores; arredondamento explícito e testado, incluindo empate para par; documentar estágio de aplicação        |
| VF no curso           | RI art. 40: mais de três disciplinas em VF implica reprovação                                                                                | Resumo entre anos por matrículas históricas; indicar alcance parcial se o histórico não estiver completo                              |
| Comportamento Escolar | RI arts. 34 II/40 III: mínimo 7; art. 87 §1: exclusão abaixo de 5. Coordenação titular                                                       | Conflito interno: não converter FO automaticamente em nota nem aplicar VF comum; manter cálculo específico pendente                   |
| Cargas conflitantes   | Legislação BM: 30 na matriz e 38 no ementário; APH I e outros itens precisam de conferência completa                                         | Catálogo preserva valor da matriz e anota alternativa/fonte; oferta registra CH efetivamente homologada                               |

O relatório normativo detalhado e o catálogo dos três anos acompanharão a implementação. Nenhum nome de chefe de cadeira será inventado: a designação deve informar pessoa/perfil, função e ato/referência.

O catálogo conferido contém 82 componentes: CFO I = 24 disciplinas + 2 atividades (1.594 h/a), CFO II = 30 + 2 (1.750 h/a), CFO III = 22 + 2 (1.580 h/a). Além de Legislação BM, há divergências de CH em APH I (80/40), Gestão de Pessoas (30/40), Ordem Unida II (70/80) e Abordagem Técnica a Tentativas de Suicídio (40/43). O PPC usa hora-aula de 50 minutos (seção 4, Diretrizes Metodológicas, p. 10 renderizada); o RI usa 60 (art. 13). O sistema conservará quantidades em h/a, sem converter automaticamente em minutos. A média final ponderada de curso depende de pesos (RI art. 35) não identificados para o CFO; não será inventada uma média geral oficial.

## 3. Arquitetura proposta

Novo contexto `src/modules/academic-management/`:

- `domain/`: catálogo com fontes, parâmetros, cálculo de resultados e validações sem Next/Supabase.
- `application/`: contratos e validação dos comandos.
- `infrastructure/`: consultas mínimas via sessão, mapeamentos e tratamento explícito de banco não instalado/indisponível.
- `presentation/`: Server Actions autorizadas, com validação de entrada e atualização da interface após gravação.

Páginas por perfil reutilizam componentes acadêmicos compartilhados e os componentes visuais existentes. Não há nova autenticação nem duplicação dos cadetes. Resultados são derivados das notas e da versão da política; a nota de origem permanece preservada. Um boletim homologado e imutável será evolução própria.

## 4. Modelo de dados

| Entidade                | Conteúdo e integridade                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| `academic_disciplines`  | Código estável, fase 1/2/3, nome, tipo, CH matriz, fonte, divergências, ativo                                |
| `academic_policies`     | Parâmetros versionados, origem/justificativa, decisão e autor; versão aprovada imutável                      |
| `academic_offerings`    | Turma existente, disciplina, ano letivo, CH homologada, quantidade de VCs e política vinculada               |
| `academic_assignments`  | Oferta, responsável, função (chefe/instrutor), referência de designação, vínculo ativo                       |
| `academic_enrollments`  | Oferta e cadete, identificação mínima histórica, frequência consolidada; unicidade oferta/cadete             |
| `academic_assessments`  | Oferta, tipo VC/VF, sequência e título; unicidade por oferta/tipo/sequência                                  |
| `academic_grades`       | Avaliação e matrícula da mesma oferta, nota, versão de edição e motivo da correção                           |
| `academic_audit_events` | Autor obtido da sessão no banco, data, entidade, antes/depois, motivo, oferta/cadete; sem alteração pela API |

FKs compostas impedem lançar nota de matrícula em avaliação de outra oferta. Exclusão física indisponível na interface/API. Dados atuais de `students`, turmas e perfis permanecem inalterados. Políticas não são recalculadas silenciosamente sobre histórico existente.

Materiais futuros: `academic_materials` vinculado à oferta, metadados, versão, visibilidade, autoria, publicação e referência Storage; downloads com RLS e URL temporária. Não reutilizar bucket de documentos pessoais. Sem upload nesta primeira implementação.

## 5. Regras operacionais e permissões

- Coordenação: cadastrar disciplinas/ofertas, escolher e documentar política, designar responsáveis, matricular cadetes, lançar/corrigir notas e frequência, consultar histórico.
- Instrutor: somente ofertas com designação ativa, avaliações/notas autorizadas e identificação mínima dos inscritos.
- Secretaria: consulta acadêmica; a permissão para alterar notas exige decisão explícita futura.
- Cadete: somente próprias matrículas, avaliações e resultados; sem escrita de nota, regra, frequência ou designação.
- Perfil inativo e sessão ausente: acesso negado no servidor e no banco.
- Dados incompletos ou regra não aprovada: situação pendente, sem aprovação final automática.
- Correção: justificativa obrigatória, registro anterior preservado na auditoria e controle de versão para evitar sobrescrita concorrente.
- Resultados por disciplina e resumo do cadete não equivalem a ata de conclusão, desligamento, classificação final ou sanção automática.

## 6. Fluxo de telas

1. **Gestão Acadêmica** no menu → filtros CFO I/II/III e turma/ano → catálogo e ofertas.
2. Coordenação cria oferta → confere CH e quantidade de VCs → registra versão de regras e decisão → associa chefe/instrutor → matricula os cadetes.
3. Oferta → avaliações VC/VF → grade por cadete com nota atual, correção justificada, frequência, média e situação. Estados vazios e falhas de gravação são explícitos.
4. Oferta → regras e conflitos visíveis → histórico de alterações com autoria e antes/depois.
5. Cadete → **Minhas disciplinas e notas** → resultados por ano e visão agregada, com aviso de histórico/frequência incompletos.
6. Instrutor → ofertas designadas → avaliações e notas. Secretaria → consulta.

No celular, formulários e cartões com rótulos; tabelas podem rolar horizontalmente sem expandir a página. Alertas usam texto além de cor. A tela deve conservar dados digitados quando ocorrer erro.

## 7. Migração e implantação

1. Preparar mudanças em checkout isolado a partir do commit inspecionado; preservar o checkout original e arquivos não rastreados.
2. Criar migrations novas e aditivas. Não editar migrations já aplicadas, não executar seed de usuários e não executar scripts de reset/normalização.
3. Catálogo normativo é carga idempotente com códigos estáveis; não cria notas, matrículas ou responsáveis fictícios.
4. Executar lint, TypeScript, testes do domínio, testes de autorização e banco em ambiente descartável. Conferir build e interface quando runtime permitir.
5. Antes do banco real: backup validado e conferência da versão remota, aplicar migrations pendentes em homologação, validar os quatro perfis e registrar decisões da coordenação. Implantação remota é uma etapa posterior ao código testado.
6. Rollback operacional: retirar os links/versão do aplicativo; manter tabelas e histórico. Não derrubar tabelas com dados. Correções posteriores por migration aditiva.

## 8. Sprints e checkpoints

| Sprint          | Entrega                                                                                   | Critério de saída                                                                 |
| --------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 0 — diagnóstico | Este documento, leitura normativa e contratos                                             | Arquitetura/base identificadas antes de editar código                             |
| 1 — núcleo      | Catálogo CFO I/II/III, política, motor de médias/VF, schema e auditoria                   | Casos de limite/nota ausente/arredondamento/conflitos testados; migração revisada |
| 2 — operação    | Telas e ações por perfil, oferta, responsáveis, avaliações, notas, frequência e histórico | Validação de entradas, RLS e estados de interface; lint/typecheck                 |
| 3 — integração  | Resumo por cadete, proteção de cache, testes de regressão e documentação                  | Testes executados com resultado registrado e limitações explícitas                |

Ao final de cada sprint será atualizado `docs/GESTAO_ACADEMICA_SPRINTS.md`, listando arquivos, migrations, testes efetivamente executados, pendências e próximo passo. Evoluções reservadas: diário de frequência por aula, recursos/segunda chamada como workflow, comportamento escolar, boletim homologado, classificação final, portal de materiais e relatórios oficiais.

## Decisões que cabem à coordenação

Quantidade de VCs nas faixas divergentes; piso para acesso à VF; frequência considerada para acesso; momento do desconto de faltas; CH divergentes; precisão de médias intermediárias; atos de designação; validação do histórico completo antes de concluir a situação do curso. A implementação disponibiliza parâmetros e bloqueios para essas decisões, sem fazê-las em nome da coordenação.
