# Sobreaviso e ajuste de horários do guarda-vidas

Entrega de 25/09/2026 — migração 0111.

## Permanência durante instrução

No Estágio, abrir **Instruções e conflitos**. Quando houver permanência na ABM no horário de uma instrução, cada cadete terá a opção **Confirmar participação em sobreaviso**. A confirmação significa que o gestor assegura sua participação na instrução, mantendo o sobreaviso do serviço; não é dispensa de aula nem presença comprovada.

- Confirmação individual, restrita à Coordenação e gestores delegados como Ian.
- Pode ser retirada. Registro anterior e posterior ficam na auditoria.
- Guarda o contexto da instrução, cadete, função, local e horários. Mudanças tornam a confirmação anterior desatualizada, exigindo nova conferência.
- Só disponível para local ABM/Academia Bombeiro Militar. Não libera estágio externo concomitante.
- Não desconta automaticamente horas de permanência, não altera horas curriculares nem dispensa as 24h entre serviços. O tratamento da carga de permanência dentro do QTS requer fonte completa dos horários e regra específica; não foi inferido nesta entrega.

## Ajuste de horário do GV

Na **Agenda do Estágio**, abrir **Ajustar horário de praia** para a data desejada. Informar entrada, saída e motivo; acionar **Validar e salvar horário do dia**.

- Ajusta os cinco postos em uma única transação, no mesmo sábado/domingo, por 1 a 8 horas. Exige cinco participações vigentes no mesmo período; preencher vagas antes de ajustar o dia inteiro.
- Mantém os cadetes, praias, recursos, uniforme individual e supervisor. Atualiza a janela do dia e os horários do plano, preservando documento existente. Documento pendente não impede a operação, inclusive no legado autorizado por plantão.
- Participações e turnos anteriores permanecem como substituídos/cancelados. Novos registros são vinculados aos anteriores como remanejamento. A carga prevista passa a usar a nova duração, sem homologação automática.
- Revalida instruções, capacidade, impedimentos, sobreposições, 24h entre todos os serviços e limite de três descansos mínimos em 28 dias. Qualquer falha desfaz integralmente a tentativa.
- Só aceita serviços futuros sem execução, ponto, avaliação enviada ou passagem de serviço. Formulários obsoletos são recusados.
- O gestor define a janela considerando também deslocamento após a instrução; o sistema não inventa tempo de viagem.
- Agenda e tela inicial passam a mostrar o novo período. A próxima emissão do mesmo recorte gera retificação com o mesmo número. PDFs distribuídos não são substituídos remotamente: baixar e encaminhar a versão nova.
- Convites de avaliação anteriores são revogados. Gerar novos links para os novos registros; nenhuma mensagem é enviada automaticamente.

## Verificação

21 testes SQL de ajuste de GV e 22 de instruções/sobreaviso passaram no banco isolado, com rollback. Cobrem legado sem documento, planos autorizados, uniformes, vínculos, carga prevista, rollback por descanso/instrução, edição obsoleta, permissões, gestão delegada, alteração de contexto e auditoria. 423 testes da aplicação passaram (um teste preexistente ignorado), incluindo envio do formulário, rejeição sem falso sucesso e confirmação com orientação para o PDF. Build de produção aprovado, com dois avisos de lint preexistentes.

As escalas vigentes não são modificadas pela migração. Ela cria as ferramentas para as próximas decisões do gestor.

## Publicação e conferência online

Migração 0111 aplicada. Vercel `dpl_2gWQT5wzB4v41a3T59kMXgGzwsZS`, READY. Na agenda de 27/09, conferidos os cinco cadetes, campos 10h–18h preenchidos e prévia de 4h após selecionar entrada às 14h. O formulário foi fechado sem salvar; nenhum teste fictício foi inserido em produção.

Leitura posterior à migração confirmou as mesmas 65 participações (IDs, cadetes e horários), zero conflitos com as instruções atuais, nenhum ajuste ou sobreaviso artificial e os sete PDFs 001–007 ainda como emissão inicial. A permanência do fim de semana continua cancelada.
