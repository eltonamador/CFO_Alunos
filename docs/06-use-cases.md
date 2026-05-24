# 06 — Casos de Uso por Perfil

Notação: **UC-<perfil>-<nº>**. Cada caso de uso indica ator, pré-condição, fluxo principal e exceções.

---

## Aluno (Cadete)

### UC-AL-01 — Primeiro acesso
- **Ator:** Aluno (com credencial inicial provisionada pela Coordenação).
- **Pré:** Existe `profile` com role=`aluno` vinculado a um `student`.
- **Fluxo:** Login → forçar troca de senha → preencher dados mínimos (whatsapp, foto) → desbloqueio do app.
- **Pós:** `students.updated_at` atualizado; `students.photo_path` preenchido.

### UC-AL-02 — Visualizar próprio resumo e progresso
- **Fluxo:** Abre Portal do Aluno → visualiza de forma dinâmica o card de identificação oficial no formato `NOME DE GUERRA — NÚMERO`, acompanhado de sua **Fase do CFO** (`CFO I`, `CFO II` ou `CFO III`) e de sua **Canga** ativa. Visualiza barras de progresso reais e contagens agregadas da situação do seu enxoval, validação de documentos e preenchimento de cadastro, alimentadas diretamente do Supabase Cloud em tempo real.

### UC-AL-03 — Editar dados pessoais e histórico profissional
- **Fluxo:** Abas de preenchimento cadastral no portal:
  - **Identificação / Dados Gerais**: edita dados básicos e preenche opcionalmente a **Experiência Profissional anterior** (`professional_experience`) e **Graduação anterior** (`graduation_name`).
  - **Contato**: edita telefone, WhatsApp e e-mail.
  - **Endereço**: edita dados de endereço físico e também sua **Naturalidade** (cidade e estado de nascimento, que atualiza de forma síncrona `student_addresses` e `students`).
  - **Emergência / Veículo / Logística**: edita contatos de emergência, logística (necessidade de alojamento) e cadastro de veículos/CNH.
- **Regra:** alterações em CPF/RG/foto (se assim configurado) geram `PendingChange` e ficam aguardando validação no Hub.

### UC-AL-04 — Enviar/atualizar restrição de saúde
- **Fluxo:** Aba *Saúde* → preenche → opcionalmente anexa declaração médica → salva.
- **Pós:** `validation_status='pendente'`; gera `PendingChange`; resumo operacional permanece **vazio** até Coordenação editar.

### UC-AL-05 — Enviar documento
- **Fluxo:** Aba *Documentos* → seleciona tipo → upload → status fica *enviado*.
- **Exceção:** se documento foi *recusado* antes, novo upload reativa o ciclo (status → *enviado*).

### UC-AL-06 — Atualizar checklist de materiais
- **Fluxo:** Aba *Materiais* → lista por categoria/fase → marca status por item → opcional: observação, foto, dúvida → salva.
- **Regra:** mudança de status para *Comprado/Inadequado* sem foto é permitida, mas conta como pendente de validação.

### UC-AL-07 — Enviar dúvida sobre material
- **Fluxo:** No item → "Tenho dúvida" → escreve → envia.
- **Pós:** `EquipmentQuestion` criado; status do item passa a *em_duvida* se ainda não tinha status.

### UC-AL-08 — Ver lista básica da turma
- **Fluxo:** Aba *Turma* → vê número, foto, nome de guerra, Fase do CFO.
- **Restrição:** sem contatos, sem dados sensíveis.

---

## Instrutor

### UC-IN-01 — Buscar aluno
- **Fluxo:** Tela inicial → busca por número OU nome de guerra → resultado em < 2s.

### UC-IN-02 — Ver card rápido
- **Campos:** foto, número, nome de guerra, nome completo, pelotão, **WhatsApp** (com botão), canga, veículo (sim/não), origem (AP/outro estado), **alerta de restrição** + resumo operacional, botão "Emergência" (mostra 1º contato).
- **Restrição:** não mostra CPF/RG, não mostra documentos, não mostra detalhe clínico.

### UC-IN-03 — Acionar emergência
- **Fluxo:** Card rápido → "Emergência" → ver contato prioridade 1 → botão WhatsApp/ligar.
- **Auditoria:** acesso ao contato de emergência é registrado.

---

## Secretaria

### UC-SE-01 — Listar alunos com pendência de documento
- **Fluxo:** Dashboard → "Documentos pendentes" → filtra por tipo/status.

### UC-SE-02 — Validar documento
- **Fluxo:** Abre documento (URL assinada) → *Validar* OU *Recusar* com motivo.
- **Pós:** status atualizado; `AuditLog` criado; notificação ao aluno (assíncrona — fora do MVP, fica em backlog).

### UC-SE-03 — Atualizar dados administrativos
- **Fluxo:** Edita matrícula, RG, CPF (com justificativa) → `PendingChange` pode ser auto-validado por Secretaria (config) OU encaminhado à Coordenação.

### UC-SE-04 — Exportar relatórios administrativos
- Lista geral, contatos, pendências de documento → XLSX.

### UC-SE-05 — Ver indicador "tem restrição? sim/não"
- **Restrição:** Secretaria **não** vê o detalhe clínico, apenas o booleano e o status de validação.

---

## Coordenação

### UC-CO-01 — Gerenciar turma
- Criar curso, criar turma, criar pelotões, importar lista inicial dos 30 alunos (CSV opcional ou cadastro um a um).

### UC-CO-02 — Atribuir número e Fase do CFO
- **Fluxo:** Edita aluno na aba Resumo/Identificação → define `student_number` (número) e `pelotao` (Fase do CFO).
- **Regra:** O número deve ser único na turma. O pelotão/fase aceita apenas as opções `CFO I`, `CFO II` ou `CFO III`. A alteração gera registro automático de auditoria.

### UC-CO-03 — Definir/alterar canga diretamente na ficha
- **Fluxo:** Na aba Resumo do Aluno → clica em editar canga → seleciona canga disponível → confirma.
- **Pós:** Mapeado em tempo real no card de identificação e na tabela `canga_assignments` com `is_current=true`. A designação anterior fica `is_current=false` para histórico. A alteração é auditada.

### UC-CO-04 — Triar Pendências e Validações no Hub Consolidado
- **Fluxo:** Acessa o painel de "Pendências" da Coordenação → visualiza o Hub consolidado de validações em tempo real com três abas principais:
  - **Cadastro**: solicitações de alteração de dados cadastrais (ex. CPF, CNH, RG) pendentes de aprovação.
  - **Documentos**: arquivos enviados aguardando análise para validação ou recusa (com preenchimento opcional de justificativa de rejeição).
  - **Enxoval**: itens de enxoval enviados pelos alunos marcados como `pendente_validacao`.
- **Filtros e Busca**: Busca textual instantânea por nome de guerra ou nome completo, e filtro rápido por gênero do aluno.
- **Ações**: Permite validar ou recusar cada item individualmente em tempo real via Supabase.

### UC-CO-05 — Editar resumo operacional
- A partir de uma restrição de saúde já validada, Coordenação escreve **string curta** consumida pelo Instrutor.

### UC-CO-06 — Responder dúvida de material
- Lista de dúvidas abertas → responde → opcional: marca item como "instrução adicional".

### UC-CO-07 — Mudar situação do aluno no curso
- Para *afastado*/*desligado*/*concluído* com justificativa obrigatória (auditável).

### UC-CO-08 — Gerar todos os relatórios Excel
- Sem restrição de colunas.

### UC-CO-09 — Consultar histórico de um aluno
- Aba *Histórico* na ficha — vê todos os `AuditLog` relacionados.

---

## Fluxos críticos (cross-perfil)

### F-01 — Alteração sensível com aprovação
1. Aluno altera campo sensível.
2. Sistema cria `PendingChange` (status *pendente*).
3. Dado "efetivo" continua sendo o anterior, **OU** é gravado como "provisório" conforme política do campo:
   - **Política A (preferida para saúde/foto):** valor é gravado direto, mas marcado `validation_status='pendente'`; instrutor não vê até validado.
   - **Política B (para CPF/RG):** valor antigo permanece efetivo; novo fica em `pending_changes.new_value` até validar.
4. Coordenação/Secretaria valida ou recusa.
5. `AuditLog` gravado.

### F-02 — Upload + validação de documento
1. Aluno faz upload → `documents.status='enviado'`.
2. Secretaria/Coordenação abre → marca *validado* ou *recusado* (com motivo).
3. Se *recusado*, aluno pode reenviar (substitui storage_path, status volta a *enviado*).

### F-03 — Cálculo de "pronto para apresentação"
- **Definição:** aluno está pronto quando:
  - Todos os documentos obrigatórios *validados*.
  - Todos os requisitos `phase='quarentena'` com status em `{ok, comprado validado, nao_se_aplica}`.
  - Restrição de saúde *validada* (mesmo que vazia).
- Exibido como badge na ficha + filtro na lista de Coordenação.
