# Passagem de Bastão para Claude Code (HANDOFF_CLAUDE.md)

Este documento foi preparado especificamente para o **Claude Code** para que a transição técnica ocorra de forma segura, mantendo a integridade das regras de negócio, modelagem e arquitetura estabelecidas.

---

## 1. Visão Geral do Sistema (CFO Alunos)
* **Objetivo**: Sistema Web responsivo e PWA para o Curso de Formação de Oficiais (CFO 2026.1) da Academia de Bombeiro Militar do CBMAP gerenciar e consultar informações cadastrais, de saúde, logística e controle de enxoval dos 30 alunos.
* **Usuários**:
  * **Coordenação**: Acesso total de leitura e escrita a qualquer dado (incluindo número, canga e fase).
  * **Secretaria**: Acesso a documentos, dados administrativos e de saúde.
  * **Instrutor**: Visualização restrita (LGPD-safe, apenas operacional).
  * **Aluno**: Autoatendimento para preenchimento de seus dados e controle de enxoval. **Não edita campos críticos**.

---

## 2. Tecnologias & Stack
* **Framework**: Next.js 14+ (App Router, Server Actions)
* **Linguagem**: TypeScript (Strict Mode)
* **Estilização**: Tailwind CSS + Shadcn/UI (Radix UI)
* **Banco de Dados**: Supabase (PostgreSQL) com RLS (Row Level Security) habilitado em 100% das tabelas
* **PWA/Offline**: `@serwist/next` (suporte offline básico)
* **Relatórios**: `exceljs` (geração de planilhas Excel formatadas no servidor)
* **Testes**: Playwright (E2E), Vitest (Unitários)

---

## 3. Diretrizes de Arquitetura (DDD)
O projeto segue princípios de **Domain-Driven Design (DDD)** estruturado em camadas no diretório `src/modules/`:
```
src/modules/<modulo>/
  ├── domain/          # Entidades puras, Value Objects, Regras de negócio essenciais (sem frameworks)
  ├── application/     # Casos de uso (Use Cases), Interfaces de Repositório (Ports)
  ├── infrastructure/  # Repositórios Supabase, Mappers de banco de dados, integrações externas (Adapters)
  └── presentation/    # Componentes React específicos, Server Actions, validações Zod
```

---

## 4. Estado Real do Projeto & O que foi Implementado

O projeto encontra-se em estado maduro, com o backlog prioritário inicial **100% concluído e validado**:

1. **Pré-Cadastro Oficial dos Alunos (`[x]` Concluído)**:
   * O arquivo `supabase/seed.sql` foi reestruturado de forma idempotente e estática para conter os **30 alunos oficiais** reais da turma CFO 2026.1.
   * Todos os alunos iniciam vinculados ao curso `CFO-2026`, na turma `CFO 2026.1`, com situação `matriculado` e cadastro incompleto.
2. **Nomenclatura "Fase do CFO" (`[x]` Concluído)**:
   * O termo visível no front-end foi 100% padronizado para **Fase do CFO** (valores válidos: `CFO I`, `CFO II` e `CFO III`).
   * A coluna no banco de dados se manteve como `pelotao` de forma pragmática para evitar refatoração onerosa de tabelas e views Supabase.
3. **Integração de Canga (`[x]` Concluído)**:
   * A aba dedicada placeholder "Canga" foi completamente removida da ficha e do menu.
   * O Canga foi **integrado diretamente** na aba **Resumo** (no card de Identificação).
   * Apenas a **Coordenação** tem permissão de gerenciar Cangas usando o formulário em linha (Inline Edit Form) seguro e auditado na aba Resumo da Coordenação.
4. **Abas Pendentes (`[x]` Concluído)**:
   * As abas de **Logística** e **Veículo/CNH** foram totalmente implementadas e integradas ao fluxo.
5. **Checklist de Materiais - Enxoval (`[x]` Concluído)**:
   * Aba `MateriaisTab.tsx` implementada e testada.
   * Permite que o Aluno controle seu enxoval entre as 18 categorias oficiais, e a Coordenação faça a validação (aprovação/reprovação) de itens.
6. **Relatórios Excel (`[x]` Concluído)**:
   * Rota `/api/reports/[slug]` integrada para exportar planilhas estilizadas via `exceljs`. Rotas seguras e limitadas a Coordenação e Secretaria.
7. **Histórico Visual e Auditoria (`[x]` Concluído)**:
   * A aba `HistoricoTab.tsx` lê diretamente a tabela imutável `public.audit_logs`, apresentando uma linha do tempo eDiff comparativo (*antes* x *depois*) para alterações críticas.

---

## 5. Validação Técnica (Resultados obtidos)

### Comandos que Funcionam (Testados com Sucesso):
* **`pnpm run check`**: Passa com sucesso! (Executa `lint`, `typecheck` e testes unitários do vitest).
  * *Vitest*: 13 testes unitários passando (`src/modules/equipment-checklist/domain/services/computePendingItems.test.ts`).
  * *Typecheck*: `tsc --noEmit` conclui sem qualquer erro!
* **`pnpm exec supabase status`**: Funciona perfeitamente. Aponta que a instância local está ativa.
* **`pnpm exec supabase db reset`**: Executa com sucesso absoluto, aplicando as 14 migrations na ordem correta, e rodando o `seed.sql` de forma estável.
* **`pnpm run db:seed-users`**: Cria com sucesso os perfis de autenticação local no Supabase Auth (`auth.users`).

### Estado do Supabase Local:
* A instância do Supabase via Docker está **ativa e totalmente operacional**.
* O login por e-mail no Supabase local foi habilitado via `config.toml` (configurado `enable_signup = true` em `[auth]` e `[auth.email]` para evitar o erro `Email logins are disabled 422` no desenvolvimento local).

### Estado do `.env.local`:
* O arquivo `.env.local` está configurado corretamente com as chaves geradas pelo docker local.
* Ele está corretamente adicionado ao `.gitignore` e **não é versionado**.
* *Placeholders de referência*:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxxx
  SUPABASE_SERVICE_ROLE_KEY=sb_secret_xxxxxx
  NEXT_PUBLIC_APP_NAME=CFO Alunos
  NEXT_PUBLIC_APP_URL=http://localhost:3000
  NODE_ENV=development
  ```

---

## 6. O que ainda NÃO foi Validado (Backlog de Testes)
* **Testes End-to-End (Playwright)**: Os testes E2E em `tests/` ainda não foram amplamente executados nesta transição. Recomenda-se que o Claude Code os valide rodando `pnpm exec playwright test`.
* **Fluxos Offline (PWA)**: A sincronização offline do service worker do Serwist precisa ser validada simulando condições sem rede no navegador do desenvolvedor.

---

## 7. Próximos Passos Recomendados para o Claude Code

Ao assumir o projeto, o Claude Code deve priorizar:

1. **Rodar os testes E2E do Playwright**:
   * Executar `pnpm exec playwright test` para conferir a integridade dos fluxos visuais automatizados.
2. **Revisar warnings de Lint**:
   * Existem pequenos avisos de variáveis não utilizadas em `SaudeTab.tsx` e `documentActions.ts`. Podem ser removidos com segurança.
3. **Refinar a Barra de Progresso do Aluno**:
   * Atualmente a barra de conclusão cadastral pode ser refinada para ler dinamicamente o preenchimento das sub-tabelas (contato, endereço, logística, veículos, saúde, etc.).
4. **Validar Políticas de RLS em Produção**:
   * Antes de qualquer deploy real em produção no Supabase Cloud, fazer uma varredura nas políticas de RLS criadas em `supabase/migrations/0012_rls.sql` para assegurar que nenhum vazamento de dados de saúde ou documentos ocorra.

---

*Handoff gerado em 23 de Maio de 2026.*
