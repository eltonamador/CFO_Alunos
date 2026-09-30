# Estágio — fluxo simplificado

Atualização: 24/09/2026.

## Uso diário

- Entrada em `/coordenacao/estagio`: três opções — GBM (USB/AR), Praia (GV) e Permanência (Aluno de Dia + um Apoio).
- GBM/Praia: escolher data ou semana, gerar sugestão, conferir cadetes e publicar. GBMs vêm selecionados; locais, uniforme e oficial responsável pelo serviço podem ser ajustados sob demanda.
- Permanência: escolher data e turno (06h–18h ou 18h–06h), gerar dois cadetes, conferir e publicar. Horários excepcionais e substituições continuam disponíveis.
- Busca por nome ou número abre as fichas do cadete. Horas cumpridas e faltantes ficam visíveis; campos de horários/minutos só aparecem ao registrar exceção.
- Agenda com seis colunas; avaliação, uniforme e histórico ficam em “Abrir”. Configuração, localização e reinício ficam recolhidos.

## Regras preservadas

- Sugestões consideram carga registrada, repetição do tipo de serviço e do GBM; a permanência compõe a carga conhecida.
- Descanso de 24 horas, impedimentos, horários de instrução cadastrados e compromissos são conferidos na sugestão. O banco revalida a publicação.
- Exceção já existente de dois períodos contínuos de Aluno de Dia no fim de semana permanece no banco; não se aplica aos plantões de estágio.
- Vagas ocupadas não aparecem como vagas novas na prévia. A geração não publica automaticamente.
- Apenas horas homologadas contam para conclusão. Datas futuras não recebem homologação normal.
- Histórico, permissões, relatórios e exportações preservados. Nenhuma escala existente foi alterada nesta simplificação.
- Não foi introduzido desconto automático de horas de permanência por sobreposição com instrução/QTS.

## Saída antecipada para instrução na ABM

O cadete registra a hora em que realmente deixa o serviço. Antes da janela comum de saída, depois de 30 minutos da entrada, escolhe **Instrução na ABM, por orientação da Coordenação** ou descreve outro motivo e registra o ponto com GPS. O banco grava ponto e relato na mesma transação. Se o GPS falhar, há um relato manual recolhido na tela.

A saída antecipada não reduz nem homologa automaticamente a carga. Na ficha, a Coordenação vê o término real, o motivo e a carga prevista de 12 ou 24 horas. Pode homologar a carga integral quando a saída foi autorizada para instrução, desde que registre sua justificativa; também pode decidir por carga parcial. O oficial responsável pelo serviço avalia o cadete, enquanto a Coordenação da ABM homologa as horas. As colunas legadas `supervisor_name` continuam armazenando o nome do oficial.

## Verificação

Testes cobrem busca por nome/número, pendências, sugestão sem cadete com descanso insuficiente, confirmação antes de publicar, invalidação da prévia ao trocar data, omissão de vaga ocupada e homologação com exceção. Testes de domínio cobrem rodízio e descanso.

## PDF e tela inicial (24/09/2026)

“PDF / WhatsApp”, na página principal do estágio, reúne seleção de período e serviço: GBM, Praia, Permanência ou as três escalas no mesmo arquivo. “Baixar PDF” entrega um arquivo PDF diretamente; “Compartilhar PDF” abre o compartilhamento de arquivos do aparelho quando disponível. Em navegadores sem suporte, o usuário baixa e anexa o arquivo no WhatsApp. Não é enviado link privado de login nem mensagem automática.

Após publicação, GBM/Praia e Permanência exibem atalhos para o PDF do período publicado. A publicação semanal revalida as páginas iniciais dos quatro perfis, além da agenda e da tela de estágio. A tela inicial continua consultando os registros publicados dos próximos sete dias; não depende de upload de PDF.

## Cancelar permanência por período

Na tela principal do estágio, **Cancelar permanência** abre o próximo fim de semana, com datas ajustáveis. **Conferir cancelamento** mostra nomes, horários, turnos, participações e cadetes distintos antes da confirmação. Cancela apenas serviços futuros, com motivo pré-preenchido editável e histórico preservado. Coordenação e administradores do módulo têm acesso.

O lote é atômico: alteração da equipe ou início de um turno exige nova conferência. Nenhum turno real é cancelado pela implantação da funcionalidade. Cancelados deixam de ocupar cadetes no rodízio e saem das escalas vigentes, dos PDFs e da tela inicial; novas escalas ainda exigem 24h de descanso.

Verificação: 7 testes de interface/domínio e 17 verificações transacionais de banco, com dados fictícios revertidos; TypeScript e lint sem erros.

Entrega de 25/09/2026: migração 0098 aplicada em produção; publicação da interface de cancelamento pendente por indisponibilidade de conexão com Vercel (`fetch failed` em duas tentativas). Retomar com `vercel deploy --prod --yes` e conferir a prévia na página do estágio, sem confirmar um cancelamento real para testar.

## Guarda-vidas sem documento obrigatório — 25/09/2026

O documento operacional passa a ser opcional na geração de um dia ou semana e na publicação dos cinco postos de um rascunho. Documento e supervisor ficam em “Dados opcionais e uniforme”. Nenhuma referência é inventada: a documentação pendente fica registrada no plano, com o responsável pela publicação identificado. A complementação posterior continua na agenda.

A migração 0099 preserva as regras de cinco praias, cadetes distintos, impedimentos/instruções e 24h de descanso entre GV, GBM e permanência. Testes transacionais comprovaram o bloqueio nos dois sentidos GBM/GV, a liberação com exatamente 24h, o cruzamento com permanência, a publicação pelo administrador delegado e a complementação de documento após publicação. Vinte verificações de banco, revertidas ao final, passaram; seis testes de interface/ação passaram. Nenhuma escala real foi criada nos testes.

### Publicação confirmada

Em 25/09/2026, a implantação `dpl_AuTh1Zsp5o9goKy2FUZi3aMur74E` ficou READY e foi associada a `https://cfo-alunos.vercel.app`. Inclui a dispensa do documento de GV e a interface de cancelamento de permanência anteriormente pendente. Conferência online autenticada: geração de uma prévia de cinco postos para 03/10/2026, documento e supervisor vazios, uniforme 4º D e botão Publicar escala habilitado. A prévia não foi publicada; nenhum serviço de teste foi gravado. O botão Cancelar permanência está visível na tela principal.

## Correção do retorno ao gerar GV existente — 25/09/2026

Reprodução na Vercel: 26/09 exibia “Nenhum serviço selecionado cabe nessa semana e no período do programa”, pois os planos de GV desse fim de semana já existiam. A versão anterior gerava normalmente uma data nova (03/10), mas não encaminhava à escala existente.

O contexto agora retorna os dias de GV já registrados, com contagem de turnos publicados/rascunhos. A tela filtra o dia escolhido e oferece consulta e PDF da escala existente; semanas parcialmente preenchidas continuam gerando somente os dias novos. Dez testes de contexto/interface passaram, assim como TypeScript e lint dos arquivos alterados. Nenhum serviço real foi publicado ou cancelado nesta correção.

### Causa completa: recriação após limpeza

A consulta atualizada de 26 e 27/09 identificou **todos os dez turnos cancelados**, com planos antigos ainda em `em_definicao`. Portanto, não eram escalas vigentes: o plano remanescente bloqueava indevidamente a recriação. A interpretação inicial acima foi refinada após conferência do estado atual no banco.

Migração 0100: na publicação, um plano cujo conjunto de turnos está totalmente cancelado recebe um código histórico com seu UUID, mantendo ID, documento, autor, turnos e auditoria. Um novo plano ocupa o código do dia. A operação é atômica: se algum cadete não tiver 24h de descanso, a tentativa inteira é desfeita, inclusive o arquivamento do código. Planos com turnos vigentes/rascunhos não podem ser recriados. A prévia considera apenas planos com turnos não cancelados.

Verificação: 30 testes transacionais de banco passaram, incluindo recriação após cancelamento, histórico, duplicidade e descanso; 10 testes de contexto/interface, TypeScript e lint passaram. Nenhuma escala real foi gerada, cancelada ou arquivada para o teste.

Publicação final confirmada: `dpl_9GS6BFWodsRb5CtARVgEFBPvJQvQ` READY, alias `https://cfo-alunos.vercel.app`, com migração 0100 aplicada. Validação online autenticada em **26/09/2026**: cinco postos de GV, **14h–18h**, cadetes disponíveis sugeridos e botão **Publicar escala habilitado**, documento vazio. A prévia ficou pronta para conferência do usuário; não foi publicada durante a verificação.
