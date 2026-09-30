# Escala de praia — informações do manual

Implementação de 25/09/2026, com base no **Manual do Cadete - Prevenção Aquática de 27/09/2026**, Plano de Operações nº 2026.0061, páginas 1 e 2. A Coordenação confirmou que o ponto cadastrado como Santa Inês deve aparecer como Perpétuo Socorro.

## PDF específico de praia

O relatório `servico=praia` substitui as colunas redundantes de serviço/recurso por **Praia**, **Unidade responsável** e **Apresentação**. Mantém cadete, início, término, duração, uniforme, carga homologada e assinatura selecionada.

| Praia | Responsável | Apresentação |
| --- | --- | --- |
| Fazendinha | GMAF e 5º GBM | GMAF ou 5º GBM, definido pelo supervisor |
| Perpétuo Socorro | SEC GAB (Gabinete) e 3º GBM | 1º GBM (equipe do Gabinete) ou 3º GBM, definido pelo supervisor |
| Araxá | 1º GBM | 1º GBM |
| Cidade Nova | SEC GAB (Gabinete) | 1º GBM |
| Curiaú | 2º GBM | 2º GBM |

A equivalência Santa Inês/Perpétuo Socorro é aplicada na apresentação do PDF, preservando os IDs e as escalas cadastradas. Não há migração de banco, remanejamento de cadetes nem alteração de carga. Outros pontos não recebem unidade presumida: o PDF pede confirmação.

## Observações

Seis linhas na área já reservada ao rodapé resumem apresentação, definição da unidade, material/rádio e descanso, vigilância, comunicação de ocorrências ao CPA e devolução do material/viatura. Endereço do GMAF e referência de Santana aparecem no resumo. A assinatura permanece centralizada, reposicionada dentro da margem existente.

O horário de 9h30 no GBM, 9h45 no ponto e o CPA Tenente Dorival aparecem somente quando todos os serviços do recorte correspondem a 27/09/2026, 10h-18h. Nos demais recortes, o texto pede confirmação do horário e do CPA com o supervisor. A apresentação não altera a jornada nem o cálculo das horas.

## Verificação

- Quatro testes específicos passaram, incluindo a correspondência entre praias/unidades, o limite por data do CPA/horário e uma página com os cinco pontos para ambas as assinaturas.
- Prévia com os cinco pontos renderizada e inspecionada visualmente: uma página, tabela e observações legíveis, sem sobreposição.
- TypeScript validado. A geração usa o mesmo endpoint dos botões de baixar e compartilhar PDF.
- Compilação local e na Vercel concluídas. Publicado em `https://cfo-alunos.vercel.app`, implantação `dpl_7eiY31XJGijkcUKJDzprdSnrZKvD` (READY).
- A inspeção visual foi feita no PDF local produzido pelo gerador atualizado. O visualizador PDF do navegador integrado ficou vazio ao abrir a rota online, portanto não foi possível inspecionar o documento de produção nesse visualizador.
