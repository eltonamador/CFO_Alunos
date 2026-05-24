# 11 — Status Atual do Projeto (STATUS_ATUAL.md)

Este documento apresenta o diagnóstico e o estado real do projeto **CFO Alunos** em **23 de Maio de 2026**, após a conclusão com sucesso da primeira tarefa prioritária de correção do pré-cadastro oficial e ajuste da nomenclatura para **Fase do CFO**.

---

## 1. Histórico de Verificação e Solução Adotada

Todas as inconsistências encontradas no diagnóstico inicial de banco de dados (Supabase) e de telas (Next.js) foram completamente resolvidas:

### 1.1 Correção do Arquivo `supabase/seed.sql`
* **Antes**: Geração randômica de 30 alunos fictícios de teste, com valores indevidos em pelotão ("1º Pelotão" / "2º Pelotão") violando a constraint de integridade.
* **Agora**: Substituído por um bloco de comandos estático e parametrizado contendo os **30 alunos oficiais reais** da turma **CFO 2026.1**, todos configurados com o pelotão/fase inicial `'CFO I'` e UUIDs fixos e determinísticos. O seed roda perfeitamente sem falhar em novos resets do banco (`supabase db reset`).

### 1.2 Alunos Oficiais do CFO 2026.1
* **Antes**: Apenas dados mock fictícios.
* **Agora**: Os 30 alunos reais e oficiais encontram-se carregados na base de dados, todos com:
  * Número (de 1 a 30).
  * Nome completo oficial.
  * Nome de guerra institucional.
  * Vinculação com o curso `'CFO-2026'` e com a turma `'CFO 2026.1'`.
  * Fase do CFO inicial `'CFO I'`.
  * Situação `'matriculado'` com cadastro incompleto (tabelas de contato, endereço, veículos e logística pendentes de preenchimento).

### 1.3 Prevenção de Números Duplicados
* **Confirmado**: Mantida a constraint ativa de banco `unique (class_id, student_number)` na tabela `public.students`. Se a coordenação tentar alterar o número de um aluno para um valor que já exista em outro aluno cadastrado na turma, o Supabase bloqueia a alteração e o sistema exibe uma mensagem amigável no formulário.

### 1.4 Auditoria de Alterações Críticas (Número, Fase, Canga)
* **Confirmado**: Os gatilhos automáticos de auditoria de banco para as tabelas `public.students` e `public.canga_assignments` estão funcionando perfeitamente. Toda alteração administrativa feita pela Coordenação gera logs detalhados de antes e depois na tabela `public.audit_logs`.

### 1.5 Integração de Canga na Ficha do Aluno
* **Antes**: Aba dedicada placeholder chamada "Canga" que deixava a informação fragmentada e exigia telas exclusivas.
* **Agora**: A aba isolada foi completamente removida. As informações de canga ativa (Nome de guerra e número) foram integradas diretamente dentro do card de **Identificação** na aba **Resumo**. Se a canga for alterada ou não existir, o campo reflete dinamicamente a atualização.

### 1.6 Nomenclatura Padronizada ("Fase do CFO")
* **Antes**: O termo "Pelotão" constava em diversos cabeçalhos, tabelas e rótulos do front-end.
* **Agora**: O termo visível para o usuário foi inteiramente padronizado para **Fase do CFO** no front-end, aceitando as opções válidas: `CFO I`, `CFO II` e `CFO III`. A coluna de banco permanece `pelotao` para evitar refatoração onerosa de tabelas e views Supabase, mantendo a menor alteração segura.

---

### 1.7 Checklist de Materiais (Enxoval)
* **Agora**: Implementada a aba funcional `MateriaisTab.tsx` no autoatendimento do Aluno e na ficha da Coordenação. Contém barra de progresso em tempo real, visualização agrupada em acordeões das 18 categorias de enxoval, seleção individual de status, e botões de validação imediata (aprovação/reprovação) restritos à Coordenação.

### 1.8 Exportação de Relatórios Excel
* **Agora**: Motor de geração e exportação de planilhas Excel estruturadas e estilizadas com `exceljs` integrado sob a rota `/api/reports/[slug]`. Oferece suporte para exportar: Ficha Completa da Turma, Pendências de Enxoval, Restrições de Saúde e Contatos de Emergência. Rotas devidamente protegidas por cookies de sessão e restritas aos perfis de Coordenação e Secretaria.

### 1.9 Histórico de Auditoria Visual
* **Agora**: Substituído o antigo placeholder pela aba de linha do tempo interativa `HistoricoTab.tsx` sob o perfil de Coordenação. O componente lê diretamente os registros imutáveis da tabela `public.audit_logs`, exibe os dados do autor da alteração, ações tomadas e uma tabela comparativa visual de diff de campos (antes x depois) para qualquer modificação ocorrida.

---

## 2. Resumo das Regras de Domínio Ativas

Com as implementações efetuadas, o sistema CFO Alunos respeita rigorosamente as seguintes diretrizes:
1. **Nome do Sistema**: CFO Alunos.
2. **Turma de Lançamento**: CFO 2026.1.
3. **Sem Divisão de Pelotões**: A turma é tratada de forma unificada.
4. **Fases do CFO**: Opções válidas restritas a `CFO I`, `CFO II` e `CFO III`. O início ocorre sempre em `CFO I`.
5. **Permissões de Edição Cadastral**:
   * O **Aluno** tem acesso bloqueado (leitura apenas) para: *Número, Nome Completo, Nome de Guerra, Curso, Fase do CFO* ou *Canga*.
   * Somente a **Coordenação** pode alterar *Número, Fase do CFO* e a designação de *Canga*, o que é feito por meio de um formulário de edição em linha (Inline Edit Form) seguro e integrado na aba Resumo da visualização da Coordenação.
6. **Controle de Exportações**: Relatórios gerados em Excel via servidor limitados aos papéis autorizados.
7. **Append-Only logs**: Toda alteração cadastral, de saúde ou canga, e visualização de contatos de emergência é registrada de forma imutável com snapshot granular `before` e `after`.

