# 02 — Linguagem Ubíqua (Glossário do Domínio)

Termos do domínio CFO/CBMAP que devem ser usados de forma **literal e consistente** no código, banco, UI, testes e documentação. Quando o termo é militar/institucional, mantemos em português, mesmo no código.

## Domínio do curso

| Termo | Definição |
|---|---|
| **CBMAP** | Corpo de Bombeiros Militar do Amapá. Organização-mãe. |
| **Academia Bombeiro Militar** | Unidade de ensino do CBMAP onde o curso ocorre. |
| **CFO** | Curso de Formação de Oficiais. Curso de formação de quem se tornará oficial bombeiro militar. |
| **Curso (`Course`)** | Programa formal de ensino (ex.: CFO 2026). Tem código, ano e turmas. |
| **Turma (`Class`)** | Coorte de alunos vinculada a um curso. Ex.: "CFO 2026 — Turma Única". |
| **Fase do CFO (`pelotao`)** | Fase atual de formação do aluno. Opções válidas restritas ao enum: `CFO I`, `CFO II`, `CFO III`. Todos os alunos iniciam na fase `CFO I`. No banco de dados Supabase, é mapeado como `pelotao` devido ao legado de modelagem, mas é estritamente exposto no front-end como **Fase do CFO** ou **Fase**. Não há subdivisão em pelotões físicos isolados no momento. |
| **Situação no curso** | Estado do aluno: *Matriculado*, *Apresentado*, *Afastado*, *Desligado*, *Concluído*. |
| **Apresentação** | Ato formal de início do curso. Tem data registrada. |
| **Quarentena** | Período inicial restritivo de adaptação, com lista própria de materiais prioritários. |

## Pessoas

| Termo | Definição |
|---|---|
| **Aluno / Cadete** | Pessoa matriculada no CFO. No sistema usamos `Student`. |
| **Identificação Unificada** | Padrão oficial de exibição de identificação do Aluno em cabeçalhos, cartões e buscas no sistema: `NOME DE GUERRA — NÚMERO` (ex: `GABRIEL — 01`). O prefixo redundante "Nº" é suprimido. |
| **Nome de guerra** | Nome curto usado na corporação, distinto do nome civil. Único por turma. Usado em buscas e listas. |
| **Número** | Identificador numérico do aluno na turma (chamado também "número de cadete"). Único por turma. |
| **Experiência Profissional (`professional_experience`)** | Registro de experiências profissionais anteriores ao CFO, preenchido opcionalmente pelo Aluno para mapeamento de competências da coordenação. |
| **Graduação Anterior (`graduation_name`)** | Posto ou graduação militar anterior, caso o cadete seja egresso de forças de segurança ou do próprio CBMAP (ex: ex-Soldado, ex-Sargento). |
| **Coordenação** | Equipe responsável pela condução do CFO. Perfil de maior privilégio. |
| **Secretaria** | Equipe administrativa da Academia. Cuida de documentos e cadastro. |
| **Instrutor** | Profissional que ministra instruções. Acesso operacional restrito. |
| **Contato de emergência** | Pessoa a ser acionada em caso de incidente com o aluno. Aluno tem 2. |

## Operacional

| Termo | Definição |
|---|---|
| **Canga** | Dupla operacional entre dois alunos. Designada pela Coordenação. Tem histórico. Mapeada diretamente na aba de Resumo/Dados Gerais do Aluno. |
| **Designação de canga (`CangaAssignment`)** | Ato de atribuir uma canga a um aluno em uma data, com responsável. |
| **Restrição operacional** | Resumo curto, derivado dos dados de saúde, que diz ao Instrutor o que o aluno NÃO pode fazer (ex.: "sem mergulho", "sem corrida de longa distância"). NÃO contém diagnóstico. |
| **Resumo operacional** | Sinônimo de restrição operacional, na perspectiva do instrutor. |

## Saúde (dados sensíveis)

| Termo | Definição |
|---|---|
| **Restrição de saúde (`HealthRestriction`)** | Conjunto de dados clínicos relevantes do aluno (tipo sanguíneo, alergias, medicamento contínuo, doença crônica, restrição física, restrição alimentar). |
| **Declaração médica** | Documento PDF/imagem assinado por médico que sustenta uma restrição. |
| **Tipo sanguíneo / Fator RH** | A/B/AB/O + positivo/negativo. |

## Documentos e cadastro

| Termo | Definição |
|---|---|
| **Documento (`Document`)** | Arquivo enviado pelo aluno (RG, CPF, CNH, comprovante de residência, foto 3x4, declaração médica). |
| **Status do documento** | *Pendente*, *Enviado*, *Em análise*, *Validado*, *Recusado*. |
| **Validação** | Ato pelo qual Coordenação ou Secretaria confirma que um dado/documento/material está correto. |
| **Hub de Pendências / Validações** | Painel centralizado na coordenação contendo abas para triagem de pendências de *Cadastro*, *Documentos* e *Enxoval* de forma ágil, com filtros de busca textual e gênero. |
| **Pendência de validação (`PendingChange`)** | Alteração feita pelo aluno em dado sensível que aguarda aprovação. |
| **Quarentena (de dados)** | Estado transitório de um dado alterado até a validação. (Não confundir com quarentena do curso.) |

## Logística e materiais

| Termo | Definição |
|---|---|
| **Enxoval** | Conjunto completo de itens que o aluno deve adquirir/possuir para o curso. |
| **Categoria de equipamento (`EquipmentCategory`)** | Agrupamento dos itens (ex.: Fardamento, Salvamento Aquático, Tiro). |
| **Item / Requisito (`EquipmentRequirement`)** | Item individual exigido (ex.: "Bota de salvamento aquático", quantidade, unidade, obrigatoriedade). |
| **Aplicabilidade** | A quem o item se aplica: *masculino*, *feminino*, *todos*, *condicional*. |
| **Fase do item** | Quando o item é exigido: *quarentena*, *início do curso*, *posterior*. |
| **Status do item do aluno** | *OK*, *Comprado*, *Ainda vai chegar*, *Falta comprar*, *Em dúvida*, *Inadequado*, *Não se aplica*, *Pendente de validação*. |
| **Dúvida de material (`EquipmentQuestion`)** | Pergunta do aluno sobre um item, com resposta da Coordenação. |
| **Pendência** | Item cujo status indica obrigação não cumprida (ver regra 10/11 do prompt). |

## Acesso e auditoria

| Termo | Definição |
|---|---|
| **Perfil de acesso (`UserRole`)** | *Coordenação*, *Secretaria*, *Instrutor*, *Aluno*. |
| **Conta (`User`)** | Identidade autenticável no Supabase Auth. |
| **Vínculo Conta↔Aluno** | Relação 1:1 entre uma conta perfil *Aluno* e um registro de `Student`. |
| **Log de auditoria (`AuditLog`)** | Registro imutável de alteração sensível: quem, quando, antes, depois, motivo. |

## Termos a evitar
- "Usuário" em UI quando se trata de "Aluno" — use sempre **Aluno** no contexto do CFO.
- "Plantonista" — não faz parte do escopo.
- "Aprovar" — preferir **Validar** (porque o ato é de conferência, não autorização).

