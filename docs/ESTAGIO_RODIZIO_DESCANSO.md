# Rodízio — descanso, fins de semana e combinações da escala

Implementação de 25/09/2026. Decisão da Coordenação: até três intervalos de descanso mínimo em qualquer janela móvel de 28 dias.

## Regras

- As restrições de sobreposição, impedimentos, instrução e mínimo de 24h permanecem obrigatórias.
- Intervalo de exatamente 24h é uma ocorrência. O evento pertence ao início do serviço seguinte. Uma janela inclui eventos posteriores a `fim - 28 dias` e até `fim`, inclusive. Eventos separados por exatamente 28 dias não ficam juntos.
- A publicação recusa a quarta ocorrência. A conferência considera o serviço anterior e o posterior; inclui a permanência com horários conhecidos. Duas metades contíguas são um único intervalo contínuo para esta contagem.
- A nova validação não altera escalas existentes. Verifica janelas afetadas pela inclusão/alteração, sem bloquear uma escala distante por uma irregularidade histórica fora de sua janela.
- Limite aplicado por gatilhos no banco a participações de estágio, publicação de plantões, participações de permanência e alteração de seus horários. Chamadas manuais não contornam o limite. As funções internas não são executáveis pelo cliente.

## Ordem de sugestão

1. Cadetes elegíveis.
2. Maior intervalo disponível, considerando o menor entre descanso anterior e posterior, até o teto comparativo de 72h. Esse teto é uma regra de prioridade, não uma prescrição médica nem um novo mínimo.
3. Se o novo serviço ocupar sábado/domingo: menor sequência de fins de semana comprometidos, menor total de fins de semana e menor quantidade de horas nesses dias. Considera compromissos futuros já conhecidos.
4. Menos ocorrências anteriores de 24h nos últimos 28 dias.
5. Menor carga combinada de estágio e permanência.
6. Menos participações no tipo e no local, menos dias de serviço e maior intervalo sem teto como desempate final.

O fim de semana tem prioridade própria sobre a carga em horas. Não há multiplicação das horas curriculares. Sexta à noite conta somente as horas que entram no sábado; domingo à noite conta até a meia-noite. Sábado e domingo da mesma semana representam um único fim de semana comprometido. Fontes duplicadas/intervalos sobrepostos são unidos na contagem de calendário.

## Interface

Sugestões diárias, semanais e de permanência exibem descanso anterior/posterior, fins de semana comprometidos, sequência de fins de semana e contagem de folgas mínimas. Rejeições na publicação informam o limite atingido.

## Escopo e sequência

Esta etapa altera a sugestão de novas escalas e as validações de novas inclusões/alterações. Não remaneja automaticamente as escalas publicadas.

Etapa 2 implementada: o planejador procura combinações alternativas antes de deixar vagas vazias, preservando escolhas manuais (detalhes abaixo).

Etapa 3 implementada: [substituição durante o plantão com períodos individualizados](ESTAGIO_SUBSTITUICAO_DURANTE_PLANTAO.md).

Etapa 6 implementada: [sobreaviso da permanência e ajuste de horário de GV](ESTAGIO_SOBREAVISO_E_HORARIOS_GV.md).

Etapa 5 implementada: [cadastro de instruções e revalidação](ESTAGIO_INSTRUCOES.md).

Etapa 4 implementada: [retificações e histórico dos PDFs](ESTAGIO_RETIFICACOES_PDF.md).

O limite de três ocorrências usa 24h **exatas**. Intervalos de 24h01 não entram nesse contador; continuam recebendo prioridade de descanso inferior a quem dispõe de mais recuperação. Uma faixa adicional de “folga curta” exige definição própria.

## Verificação

Testes de domínio cobrem 24h versus 72h, fins de semana consecutivos, virada de meia-noite, cancelamento (pela seleção de compromissos ativos), duplicidades, terceira/quarta ocorrência, inserção entre serviços futuros e limite da janela de 28 dias.

Teste SQL: `supabase/tests/internship_rest_frequency.test.sql`. A migração é `0106_internship_rest_rotation_limit.sql`.

## Etapa 2 — alternativas na geração diária e semanal

- Uma primeira combinação completa é mantida. Quando há vagas automáticas vazias, o gerador tenta reorganizar as sugestões, começando pelos plantões com menos opções.
- Cada alternativa continua usando as regras compartilhadas de impedimentos, instruções, permanência, sobreposição, descanso de 24h e frequência máxima de três intervalos de 24h em 28 dias.
- A ordem dos cadetes em cada tentativa segue descanso, fins de semana, carga, tipo de serviço e local. A busca procura aumentar a cobertura; não promete a solução global de maior equidade entre todas as combinações possíveis.
- Apenas escolhas explícitas da Coordenação ficam fixas, inclusive quando ela deixa um campo vazio. Gerar novamente mantém essas escolhas para os mesmos plantões; as sugestões automáticas podem mudar.
- Para limitar o trabalho no navegador, a busca tem orçamento de 1.000 nós e 100.000 verificações de disponibilidade. Mantém a melhor combinação encontrada. Ao atingir esse orçamento, informa que a combinação ainda está incompleta, sem afirmar falta definitiva de cadetes.
- A publicação continua exigindo todos os plantões válidos e é revalidada no servidor. Nenhuma escala publicada é remanejada por esta busca. Não há migração de banco nesta etapa.

Testes específicos: reordenação, retrocesso após escolhas sem solução, preservação manual, impedimentos, descanso entre datas, quarta ocorrência de 24h, combinação com permanência/GV, limites de busca e comparação com enumeração completa em 40 cenários pequenos. Um caso com 65 vagas simultâneas e 30 cadetes verifica o descarte de permutações desnecessárias.

## Entrega verificada — etapa 2

- 400 testes automatizados passaram; 1 ignorado já existente. TypeScript e compilação de produção concluídos.
- Vercel: implantação `dpl_5MeLBvPx1rEgndDeccNmmE7M9VeS`, READY, domínio `https://cfo-alunos.vercel.app`.
- Prévia autenticada de USB noturna em 10/10/2026: três GBMs preenchidos e sem conflitos. A escolha manual de Artur para o 5º GBM permaneceu após gerar novamente, com publicação habilitada.
- Nenhuma escala de teste foi publicada; nenhuma escala existente foi alterada. A aba temporária foi fechada.

## Entrega verificada — etapa 1

- 385 testes automatizados passaram; 1 ignorado já existente.
- 18 verificações SQL passaram no banco local, dentro de uma transação integralmente revertida. O banco local estava na versão 0082; a regra de 24h da 0090 e a nova 0106 foram aplicadas apenas nessa transação de teste.
- TypeScript, lint dos arquivos alterados e compilação de produção concluídos.
- Migração 0106 aplicada no banco online; nenhuma escala existente foi remanejada.
- Vercel: implantação `dpl_GqHmm9WVpsvbcUWJJTdavER2T64t`, estado READY, domínio `https://cfo-alunos.vercel.app`.
- Prévia autenticada conferida em produção para USB noturna de 10/10/2026: três GBMs preenchidos, critérios novos visíveis e cadetes distintos. A prévia não foi publicada e a aba temporária foi fechada.

## Remanejamento das escalas vigentes

A Coordenação autorizou a revisão retroativa em 25/09/2026. Foram realizadas 29 substituições, com cobertura mantida e menor descanso de 58h15. [Condições e evidências](ESTAGIO_REMANEJAMENTO_2026_09_25.md).
