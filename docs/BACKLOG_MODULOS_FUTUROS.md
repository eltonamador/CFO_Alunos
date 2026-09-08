# Backlog de Modulos Futuros

> Este backlog registra ideias relacionadas ao crescimento operacional do CFO Alunos. Nao faz parte da implementacao imediata do modulo "Escalas Operacionais e Comunicados da Turma".

## 1. Gestao de Cangas

Status atual: a Canga ja existe integrada a ficha do aluno, sem tela exclusiva, conforme regra vigente do projeto.

Possivel evolucao futura:

- Painel de historico de cangas por periodo.
- Alertas de canga repetida ou desequilibrada.
- Relatorio de cangas atuais da turma.
- Sugestao automatica de canga com criterios definidos pela Coordenacao.

Cuidados:

- Nao recriar aba exclusiva desnecessaria na ficha do aluno.
- Manter exibicao integrada ao Resumo/Dados Gerais.
- Toda alteracao deve continuar auditada.

## 2. Intercorrencias

Status atual: parcialmente atendido pelo MVP de Acompanhamento do Cadete
(FO- / FO+, manifestacao, decisao, punicao e linha do tempo). Ver
`docs/ACOMPANHAMENTO_CADETE.md`. O escopo abaixo segue valido para as fases
seguintes.

Objetivo:

- Registrar fatos operacionais relevantes durante o curso, como atraso, falta, problema disciplinar, ocorrencia em instrucao, observacao positiva ou acompanhamento administrativo.

Escopo sugerido:

- Cadastro de intercorrencia por aluno ou por turma.
- Tipo, data/hora, responsavel, descricao, anexos opcionais.
- Nivel de severidade.
- Encaminhamento e status.
- Historico por aluno.

Perfis:

- Coordenacao cria e visualiza tudo.
- Instrutor cria intercorrencias operacionais se autorizado.
- Aluno nao visualiza por padrao, salvo decisao institucional.

Riscos:

- Sensibilidade disciplinar e juridica.
- Necessidade de trilha de auditoria forte.

## 3. Central de Saude Operacional

Objetivo:

- Consolidar informacoes de saude em visao operacional para a Coordenacao, mantendo LGPD.

Escopo sugerido:

- Painel de restricoes validadas.
- Resumos operacionais por aluno.
- Alertas de restricao fisica, alimentar ou medicacao continua.
- Vencimento de declaracoes medicas, se aplicavel.
- Exportacao restrita com aviso LGPD.

Cuidados:

- Instrutor deve ver apenas `operational_summary`.
- Diagnostico, medicamento detalhado e observacoes clinicas devem permanecer restritos.
- PDFs e relatorios devem conter aviso LGPD.

## 4. Materiais e Logistica Avancada

Objetivo:

- Expandir o checklist de enxoval para gestao logistica mais completa.

Escopo sugerido:

- Emprestimo de materiais pela Academia.
- Controle de itens coletivos.
- Distribuicao de materiais por instrucao.
- Registro de devolucao e estado do item.
- Alertas de pendencia por fase do CFO.

Integracoes:

- `equipment_requirements`
- `student_equipment_status`
- documentos/anexos de material
- relatorios de pendencias

## 5. Relatorios Operacionais Avancados

Objetivo:

- Criar relatorios de gestao para Coordenacao e comando da Academia.

Relatorios candidatos:

- Justica da escala por aluno.
- Historico de funcoes por periodo.
- Impedimentos por tipo e aluno.
- Comunicados por percentual de leitura.
- Intercorrencias por tipo e fase.
- Restricoes operacionais agregadas, sem dado clinico bruto.
- Pendencias integradas: cadastro, documentos, enxoval, escala e comunicados.

Formatos:

- PDF institucional para despacho/impressao.
- XLSX para analise.

## 6. Checklist de Inicio de Dia

Objetivo:

- Padronizar a rotina diaria da turma e da Coordenacao.

Itens sugeridos:

- Confirmar Aluno de Dia.
- Confirmar Subxerife.
- Verificar impedimentos ativos.
- Verificar comunicados urgentes pendentes.
- Checar restricoes operacionais do dia.
- Checar pendencias criticas de enxoval/documentos.
- Registrar observacao do dia.

Possivel integracao:

- Painel Operacional do Dia.
- Escalas Operacionais.
- Comunicados.
- Intercorrencias.

Criterio para entrar em implementacao:

- Definir checklist institucional real com a Coordenacao.
- Validar se cada item e apenas confirmacao ou se gera registro auditavel.
