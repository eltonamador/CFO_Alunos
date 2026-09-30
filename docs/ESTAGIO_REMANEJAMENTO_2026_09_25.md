# Remanejamento autorizado — 25/09/2026

Operação online solicitada pela Coordenação após a conferência das folgas. Foram efetuadas 29 substituições futuras em uma única transação, mantendo os 65 postos e 832h previstas dos serviços com início de 26/09 a 04/10. Guardas de RLS, capacidade, descanso, impedimentos, instruções, frequência de descanso e auditoria permaneceram ativas. Registros anteriores preservados como substituídos.

## Resultado

- Menor intervalo conhecido: 24h → 58h15.
- Carga de estágio por cadete no conjunto: 12h–48h → 20h–36h.
- Carga combinada com permanências conhecidas de 21–25/09: 24h–36h.
- Fins de semana: 11 cadetes em dois, 19 em um (antes: 15 em dois, 11 em um, quatro em nenhum).
- Maior carga em sábado/domingo por cadete: 28h15 → 16h15. Sexta à noite inclui apenas o trecho de sábado nessa conta.
- Horários e locais dos plantões não foram modificados; permanências e impedimentos registrados foram preservados.

## Condições da Coordenação

- Impedimento de Carolina respeitado no período registrado, 27/09–02/10. Sua participação agora é AR no 2º GBM em 04/10, 07h45–05/10, 07h45.
- Requerimento de transporte conjunto Rivaldo/Freire atendido: 28/09, 18h–29/09, 06h, 1º GBM (AR/USB); 03/10, 19h45–04/10, 07h45, 2º GBM (USB/AR).
- Essa combinação foi aplicada ao remanejamento atual e registrada no motivo das novas participações. Considerá-la nos próximos planejamentos quando viável; não há dispensa de descanso, impedimento ou capacidade, nem preferência automática persistente adicionada ao gerador nesta operação de dados.

## Evidências

- Modelo com cobertura integral, exclusões por datas, disponibilidade, pareamento de transporte e intervalos. Maximizou o menor intervalo; depois priorizou fins de semana e carga. Os desempates finais de tipo/local e quantidade de trocas foram limitados por tempo, sem alegação de ótimo global em todos os critérios.
- Validação independente com `rotationRestAvailability`: nenhuma falha; 3.495 minutos de menor intervalo.
- Operação completa testada no banco online com ROLLBACK antes da gravação.
- COMMIT confirmado; nova leitura verificou os 65 participantes esperados, com todas as datas/horas e impedimentos preservados.
- Seis PDFs anteriores arquivados e atualizados para Retificação 01 (números 001–006). Emissões iniciais 007–011 para recortes adicionais de fim de semana/GBM e semana/GBM. Históricos indicam correspondência aos dados atuais.
- Agenda e início do aplicativo conferidos. Não houve comunicação a terceiros nem alteração de permissões.

Relatório operacional com links dos sete PDFs, folgas individuais e as 29 trocas: `output/relatorios/remanejamento-escalas-2026-09-25.md`.

A regra mínima global continua 24h. 58h15 é o resultado deste conjunto revisado, não um novo mínimo permanente.
