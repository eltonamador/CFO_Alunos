# Retificações e histórico dos PDFs de estágio

Implementação de 25/09/2026, migração `0108_internship_scale_revisions.sql`.

## Comportamento

- Mantém o número sequencial do recorte, por programa, período, serviço e GBM (ou permanência individual).
- Primeira emissão arquivada: revisão 0. Mudanças posteriores: Retificação 01, 02 etc., com horário de emissão e resumo no cabeçalho de todas as páginas.
- Alterações de cadete, horário, local/recurso, serviço, uniforme, assinatura e carga homologada geram nova versão na próxima emissão. Mudar apenas o horário de download ou a ordem de retorno da consulta não gera versão.
- Reimprimir retorna exatamente os bytes armazenados, inclusive data de emissão e assinatura originais.
- Os botões existentes de baixar/compartilhar sempre consultam os dados vigentes. A tela inicial continua lendo os plantões publicados diretamente; não depende da emissão de PDF.
- Um detalhe recolhido **Histórico de PDFs** permite baixar versões antigas. Indica quando os dados/assinatura já diferem da última emissão; nesse caso, baixar o PDF atual cria a retificação.
- Quando o último participante do recorte sai, a rota geral emite uma retificação sem participações, se houver emissão anterior arquivada. Um recorte vazio nunca emitido continua indisponível. A rota individual de permanência cancelada retorna indisponível, sem servir versão antiga como atual; o arquivo anterior continua no banco.

## Limites explícitos

- O histórico começa na primeira emissão após esta implantação. PDFs baixados antes não podem ser reconstruídos fielmente, e não são apresentados como versões históricas arquivadas.
- As versões representam emissões: várias alterações antes do próximo download são consolidadas em uma retificação. Os registros de alterações operacionais mantêm sua auditoria própria.
- Mudar período ou GBM é outro recorte e conserva a regra anterior de numeração. Trocar assinatura dentro do mesmo recorte gera retificação.
- Não altera PDFs já enviados pelo WhatsApp. A Coordenação deve encaminhar a versão nova aos destinatários.
- O número da revisão não é prova de revalidação retroativa das folgas. A consulta das escalas existentes é um procedimento separado.

## Segurança e consistência

Tabela com RLS: leitura por gestores do estágio; sem INSERT/UPDATE/DELETE para clientes. Função de gravação verifica a gestão delegada, identidade do recorte e a última revisão sob bloqueio do número. Requisição simultânea idêntica reaproveita a emissão; requisição conflitante desatualizada é recusada. Reverter uma alteração cria nova revisão, sem apagar a intermediária.

Snapshots e PDF (base64, cerca de 260 KB por emissão nos exemplos atuais) são arquivados juntos em uma transação. O horário do arquivo é preservado. Não há publicação de conteúdo médico ou motivos de impedimento no PDF. Layout tem versão explícita no snapshot, para futuras alterações de apresentação.

## Validação

20 verificações SQL passaram no banco isolado, com rollback: primeira emissão, repetição, sequência, reversão, concorrência, conteúdo/bytes preservados, acesso e RLS.

413 testes da aplicação passaram; um teste preexistente ignorado. Prévia de praia com cinco pontos permanece em uma página. Foram inspecionados cabeçalho, tabela, retificação, observações e assinatura em praia e GBM com múltiplas páginas.

## Publicação e conferência online — registro anterior ao reinício autorizado

Migração 0108 aplicada. Vercel `dpl_65wsigmXkFC85dVYFhKnZThamwPw`, READY, domínio `https://cfo-alunos.vercel.app`.

Conferência autenticada: GV 27/09 arquivado como `006-27092026`, revisão 0, em 25/09/2026 às 18h38m21s (Belém). Reimpressão preservou ID e data. Histórico indicou correspondência aos dados atuais. Escolher Supervisor exibiu aviso de mudança, sem emitir versão artificial. A assinatura de teste não foi enviada nem persistida. PDFs de teste e retificações fictícias ficaram somente no banco isolado/arquivos locais. Nenhuma participação publicada foi alterada.

A conferência separada das escalas encontrou 65 participações vigentes, sem sobreposição nem intervalo menor que 24h nos horários conhecidos. Há diferenças relevantes de descanso (24h, 34h15 e 36h versus intervalos acima de 100h) e fins de semana comprometidos (15 cadetes em dois, 11 em um, quatro em nenhum). Rebalanceamento retroativo não foi executado.

## Reinício das primeiras emissões — 25/09/2026

A Coordenação confirmou que nenhum PDF anterior havia sido distribuído e autorizou desconsiderá-los. A migração 0109 permite marcar uma emissão como desconsiderada, preservando seus arquivos e auditoria interna. Os números válidos passam a ignorar essas emissões; URLs de download histórico desconsiderado retornam HTTP 410. Não foi criado botão de reset frequente no aplicativo.

As 11 emissões de preparação, com 17 versões, foram desconsideradas para dar início aos sete recortes atuais, numerados de 001 a 007, todos com revisão zero. Reimpressões futuras conservam número e bytes; alterações posteriores voltam a gerar retificações. A reserva é atômica, com conferência do conjunto anterior e cópia privada antes da manutenção.

O teste SQL de versões passou a ter 25 verificações, incluindo descarte, preservação interna, recusa de retificar emissão descartada e sequência reiniciada.

Concluído e conferido: 001/002/003 para 1º/2º/5º GBM de 26–27/09; 004 para GV de 27/09; 005/006/007 para 1º/2º/5º GBM de 28/09–04/10. Sete arquivos arquivados, todos revisão zero, com 65 participações ao todo. Cabeçalhos conferidos nos sete arquivos; praia e GBM renderizados para inspeção visual. URLs históricas descartadas recusam download. Cadetes, plantões e horários foram comparados ao snapshot posterior ao remanejamento e permaneceram idênticos.

Arquivos oficiais também salvos em `output/pdf/primeiras-emissoes-2026-09-25/` e reunidos em `output/pdf/escalas-iniciais-001-a-007.zip`. O relatório atualizado com links está em `output/relatorios/remanejamento-escalas-2026-09-25.md`.

## Numeração oficial a partir de 01 e correção de escalas emitidas — 25/09/2026

Migração `0112_internship_scale_corrections.sql`. A Coordenação informou que todas as emissões anteriores (001 a 012) foram testes e que nenhuma foi divulgada. A migração desconsidera esses números, preservando arquivos e auditoria internos, e a próxima escala emitida recebe **01**. O número passa a ter dois dígitos (`01-26092026`).

- A emissão não exibe mais a observação "EMISSÃO INICIAL - Primeira emissão arquivada". Só a retificação de escala já divulgada aparece no cabeçalho, como `RETIFICAÇÃO 01 - motivo`.
- **Histórico e correção**, em cada escala do painel de PDF, permite corrigir uma escala já emitida:
  - **Ainda não divulgada**: emite nova versão com os dados atuais, mantém o número e sai sem marca de retificação. Funciona mesmo sem alteração de dados.
  - **Já divulgada**: mantém o número e registra `RETIFICAÇÃO nº` com o motivo informado.
  - **Emitida por engano**: descarta a escala. O número volta a ficar disponível e a próxima emissão usa o menor número livre, sem lacunas.
- Cadetes, horários e uniforme continuam sendo ajustados na agenda (ou na permanência); o formulário aponta para lá. Depois do ajuste, a correção gera o PDF com os dados vigentes.
- Baixar o PDF depois de uma alteração continua gerando retificação automaticamente, como antes. Se a escala ainda não foi divulgada, a correção sem retificação substitui essa versão.
- Todas as ações exigem gestão do estágio e motivo com pelo menos cinco caracteres. Versões substituídas e escalas descartadas continuam registradas no banco.
