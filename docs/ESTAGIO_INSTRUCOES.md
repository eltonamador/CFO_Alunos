# Instruções e revalidação do estágio

Entrega de 25/09/2026, migração 0110.

## Fluxo simples

Na página de Estágio, abrir **Instruções e conflitos**. Informar título, início e término; referência é opcional. Horários são interpretados em America/Belem, dentro do período do programa, com duração máxima de 24h por registro.

A Coordenação e administradores delegados do estágio, como Ian, podem cadastrar, editar e desativar. Alterações ficam no histórico de auditoria. Edições concorrentes desatualizadas são recusadas.

## Revalidação

- O planejamento e a guarda de publicação já consultam os bloqueios de instrução. Serviços de GBM e praia não podem ser incluídos sobre uma instrução ativa.
- O novo quadro consulta os serviços publicados em andamento/futuros a cada carregamento e após salvar. Alterar a instrução ou a escala atualiza os conflitos, sem manter uma lista antiga congelada.
- Conflitos externos geram aviso visível mesmo com o detalhe recolhido. O quadro identifica instrução, cadete, local, horários e acesso à agenda.
- Instrução da turma requer ajuste/cancelamento do serviço; trocar somente o cadete não elimina a incompatibilidade.
- Permanência gera aviso para conferir o sobreaviso com a Coordenação. Não se presume dispensa da instrução, não se descontam horas automaticamente e a regra de descanso permanece inalterada.
- Não há remanejamento automático, importação do QTS ou mudança da folga de 24h. PDFs já emitidos não são reescritos ao cadastrar uma instrução. Deve-se resolver os alertas antes de distribuir a escala.

## Verificações

16 testes de banco, com rollback: criação, edição, cancelamento lógico, permissões, gestão delegada, edição concorrente, auditoria, alerta retroativo de GBM, aviso de permanência, bloqueio de nova publicação e limite exato entre horários.

417 testes da aplicação passaram; um ignorado preexistente. Build e TypeScript aprovados. Os dois avisos de lint preexistentes permanecem. Testes fictícios ocorreram no banco isolado; nenhum novo bloqueio de instrução foi criado na turma real.

## Etapa seguinte implementada

[Sobreaviso da permanência e ajuste de horário do GV](ESTAGIO_SOBREAVISO_E_HORARIOS_GV.md), preservando uniforme, histórico e revalidando descanso.

## Publicação conferida

Migrações 0109/0110 aplicadas em produção. Vercel `dpl_5apj9Yvo4xuHrG4K3uaNGuD5Aerd`, READY. Conferência autenticada da opção recolhida, edição pré-preenchida de APH (26/09, 08h–12h40), fechamento sem salvar e mensagem de zero conflitos atuais. Nenhuma instrução fictícia foi criada em produção.
