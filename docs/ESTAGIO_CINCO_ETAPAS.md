# Estágio: validação, pendências, relatórios e permanência

Implementação de 23/09/2026. Migrações 0081 e 0082.

## Acessos

- `/coordenacao/estagio/pendencias`: plantões encerrados sem avaliação, convites expirados, respostas para revisão, correções solicitadas, homologações e relatos pendentes. Avaliação e homologação continuam independentes; plantão futuro não gera horas realizadas.
- `/coordenacao/estagio/relatorios`: PDF e Excel individuais com carga, plantões, avaliações e orientações. Termo de cumprimento de carga somente quando os minutos homologados atingem o mínimo do programa (250 horas no CFO atual). O termo não equivale à certificação do curso.
- `/coordenacao/estagio/permanencia`: horário padrão de 06h às 18h no mesmo dia, com ajuste para exceções, local, uniforme, Aluno de Dia e um a três apoios. Sugestão, escolha manual, prévia, publicação, alteração motivada e cancelamento. Impressão pelo navegador / salvar PDF. Consulta na tela inicial dos próximos sete dias.

## Dados e permissões

A permanência reutiliza `duty_rosters`, `duty_assignments`, `duty_assignment_logs` e acrescenta horários em `duty_permanence_services`. As funções antigas permanecem no histórico; as novas são Aluno de Dia/Apoio 1/Apoio 2/Apoio 3. A antiga geração direciona para o novo planejamento.

Gestão da permanência disponível à Coordenação e aos administradores ativos do módulo de estágio, incluindo Ian Lima. A delegação permanece limitada ao módulo: Ian mantém o perfil global de aluno e não recebe gestão das outras escalas operacionais. A consulta de contexto continua limitada aos dados necessários para planejar os serviços.

Publicação, substituição e remanejamento são transacionais. Erros preservam a escala anterior. Cancelamentos e alterações têm motivo e histórico. Conflitos são rechecados no banco, usando a mesma trava por cadete nos dois módulos. A proteção ABM D-1/D/D+1 considera todos os dias ocupados, inclusive o término de plantões noturnos. Indisponibilidades e cadetes inativos são bloqueados.

## Rodízio e contagem

1. Excluir candidatos com conflitos ou impedimentos.
2. Ordenar pela soma conhecida: estágio homologado + estágio reservado sem homologação + horas dos serviços ativos de permanência.
3. Desempatar por menos dias de serviço e maior descanso; por fim número do cadete.
4. Mostrar estágio e permanência separadamente. Horas de permanência nunca entram na carga curricular.

Serviços antigos sem horários mantêm o bloqueio por data e a contagem de dias, mas não recebem horas inventadas. O histórico de permanência usado no programa cobre seu período, com margem de sete dias para descanso nas extremidades. A conferência do rodízio identifica serviços legados sem horas conhecidas.

## Verificação

- 60 testes Vitest do módulo, incluindo filas, homologação, demo, formulário, rodízio e planejamento semanal.
- 301 verificações pgTAP em dez suítes de banco. Incluem horas, revisões, permissões, ponto, ausência de supervisor antecipado, turnos de fim de semana, publicações, conflitos recíprocos, operação de 24 horas, cancelamentos e reversão integral em falhas.
- Relatório PDF/Excel e termo verificados com dados fictícios; mínimo exato de 250h aceito e emissão antecipada rejeitada.
- Testes de interface local com conta temporária: fila, relatórios, publicação de permanência, alteração para quatro cadetes, impressão, tela inicial e cancelamento. Dados de teste removidos ao final.

QTS, saúde e calendário seguem fora desta etapa. O horário inicial de Permanência passou a ser 06h–18h; os campos podem ser ajustados em casos excepcionais. A delegação de gestão da Permanência acompanha a autorização ativa de administração do módulo de estágio.

## Publicação e integridade

Publicado em `https://cfo-alunos.vercel.app`, implantação `dpl_CF4ppVm3L25f3rgLk991aoSjE6AW`, com as migrations 0081 e 0082 aplicadas online. Confirmadas na sessão autenticada as telas de pendências, permanência, os 30 relatórios individuais e os três acessos no módulo principal.

Comparação antes/depois: 18 plantões publicados, 17.280 minutos previstos, 1 avaliação existente, 4 escalas operacionais e 85 atribuições preservados. Assinaturas de horários/participações também permaneceram idênticas. Nenhuma escala fictícia foi criada em produção.

## Atualização de 24/09/2026

- Horário inicial da Permanência: 06h–18h no mesmo dia, com botão para reaplicar o padrão e campos editáveis para exceções.
- Gestão delegada: administradores ativos do estágio, inclusive Ian Lima, podem publicar, alterar e cancelar Permanência. A autorização não se estende às escalas operacionais gerais.
- Migração 0084 aplicada online; verificados os bloqueios recíprocos e a revogação da delegação em 38 testes transacionais, além do teste de interface do horário padrão.
- Implantação `dpl_2S7FyoSKwwoqcq2YmcZt7Wa2MA1h` promovida para `https://cfo-alunos.vercel.app`.
