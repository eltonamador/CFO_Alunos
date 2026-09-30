# Substituição durante o plantão

Etapa 3 do rodízio, implementada em 25/09/2026.

## Uso

Na agenda, abra a participação iniciada e escolha **Substituir durante o plantão**. A mesma opção está nas movimentações da ficha do cadete. Informe o horário da passagem já realizada, o substituto e um motivo breve. A prévia mostra a duração de cada período antes da confirmação.

A passagem usa um único horário: encerra o primeiro período e inicia o segundo, sem intervalo descoberto ou sobreposição. Pode ser registrada posteriormente, desde que nenhuma ficha tenha sido lançada e nenhuma avaliação tenha sido enviada para a participação original. Quem já passou o serviço mantém sua ficha; uma nova passagem deve partir do substituto atual.

## Integridade

- A transação divide o turno em dois períodos contíguos no mesmo recurso, conservando GBM/praia, modalidade, padrão de origem e uniforme.
- `internship_handovers` preserva horários originais, vínculo entre os períodos, motivo, autor e data. As alterações também entram na auditoria existente.
- A redução do primeiro turno só é permitida quando corresponde exatamente ao vínculo privado da passagem. Clientes não podem criar ou modificar esse vínculo diretamente.
- O novo período passa pelas guardas habituais de capacidade, sobreposição, impedimentos, instrução, descanso de 24h e até três ocorrências de 24h em 28 dias. Se qualquer etapa falhar, a operação inteira é revertida.
- O descanso do substituto considera sua entrada individual; o descanso de quem saiu considera seu término individual. As consultas existentes de rodízio, agenda, painel inicial, PDF e carga recebem os horários dos períodos.
- A troca integral antiga recusa plantões iniciados, orientando o uso da passagem.
- Pontos e relatos existentes permanecem vinculados ao primeiro cadete. Convites de avaliação ainda aguardando resposta recebem o contexto atualizado do período individual. O substituto tem ficha e avaliação próprias.
- Nenhuma hora é homologada pela passagem. A homologação posterior deve respeitar o período individual, inclusive o limite de carga, para não contar duas vezes as mesmas horas.
- A Coordenação e o administrador delegado do estágio possuem acesso. O cadete comum não registra passagem administrativa.

## Limites desta etapa

- A vaga precisa ter capacidade de um cadete, como nos serviços atuais de GBM/GV.
- Horário futuro ou passagem no limite exato de início/fim não são aceitos. Troca antes do início continua no fluxo integral existente.
- Uma ficha/avaliação já enviada exige revisão administrativa própria; esta função não a reescreve.
- Os segmentos preservam o histórico e não podem ser apagados pelo cancelamento comum. Correção de uma passagem registrada com horário errado não faz parte desta etapa.
- A saída por motivo informado não cria automaticamente impedimento para outros dias. O registro operacional de impedimento continua no fluxo existente.

## Verificação

Teste SQL: `supabase/tests/internship_handover.test.sql`. Executado em banco local isolado, com esquema atual de produção e todos os dados fictícios revertidos. Cobre divisão, contagem, uniforme, avaliação, reenvio, atomicidade, restrição por perfil, 24h, limite de ocorrências, QTS, serviço de 24h, padrão operacional e GV com documentação pendente.

Os testes do formulário verificam o horário de Belém, a divisão ao atravessar a meia-noite, recusa do banco e preservação dos campos para nova tentativa. A ação revalida agenda, fichas e painéis após a confirmação da transação.

Migração: `0107_internship_mid_shift_handover.sql`. Não altera participações já publicadas até que a administração registre uma passagem.

### Resultados da entrega

- 408 testes da aplicação aprovados; 1 teste previamente ignorado.
- 37 verificações SQL da passagem e 18 de regressão do descanso aprovadas. O catálogo mínimo de permanência passou a integrar a massa do teste de descanso, permitindo executá-lo também numa cópia sem dados.
- TypeScript e compilação de produção local concluídos.
- Migração 0107 aplicada no banco online após dry-run confirmar que era a única pendência. Nenhuma passagem foi registrada em dados reais durante os testes.
- Vercel: implantação `dpl_8a5ybWREykL9NmN29ZHTcCCmR5fQ`, READY, publicada em `https://cfo-alunos.vercel.app`.
- Agenda autenticada conferida após a implantação: recorte de 26-27/09 carregou 20 participações e 256h previstas. O plantão futuro conserva a troca integral; a opção de passagem é exibida após o início. Conferência somente de leitura, sem substituir cadetes reais.
