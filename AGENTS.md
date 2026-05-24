# Guia para Agentes Autônomos (AGENTS.md)

Este documento foi projetado especificamente para que novos agentes de IA que assumam este repositório possam entender rapidamente o contexto, a arquitetura e as regras de negócio do sistema **CFO Alunos**.

---

## 1. Visão Geral do Sistema
- **Nome Oficial**: CFO Alunos
- **Objetivo**: Sistema Web responsivo e PWA para a Academia de Bombeiro Militar do CBMAP gerenciar e consultar rapidamente informações dos 30 alunos do **Curso de Formação de Oficiais (CFO)**.
- **Turma Inicial**: **CFO 2026.1**
- **Perfil de Usuários**:
  - **Coordenação**: Acesso total (leitura/escrita em qualquer campo, incluindo sensíveis e administrativos).
  - **Secretaria**: Acesso a documentos, dados administrativos e de saúde (com RLS controlada).
  - **Instrutor**: Visualização restrita (LGPD-safe, apenas campos operacionais essenciais, sem dados civis/sensíveis desnecessários).
  - **Aluno**: Autoatendimento para preenchimento de seus próprios dados cadastrais e envio de enxoval/documentos. **Não edita campos críticos**.

---

## 2. Tecnologias & Stack
- **Framework**: Next.js 14+ (App Router, Server Actions)
- **Linguagem**: TypeScript (Strict Mode)
- **Estilização**: Tailwind CSS + Shadcn/UI (Radix UI)
- **Banco de Dados**: Supabase (PostgreSQL) com RLS (Row Level Security) habilitada em todas as tabelas
- **PWA/Offline**: `@serwist/next` ou similar para suporte offline básico
- **Relatórios**: `exceljs` para exportação de planilhas Excel estruturadas
- **Testes**: Playwright (E2E), Vitest (Unitários)

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

### Princípios de Desenvolvimento
1. **Modelagem de Domínio Pura**: As classes e regras de negócio em `domain` não importam bibliotecas do Supabase ou do Next.js.
2. **Value Objects**: Use as classes utilitárias de validação (como `CPF`, `Plate`, etc.) localizadas em `src/modules/shared/domain/` ou no módulo correspondente.
3. **Row Level Security (RLS)**: Toda e qualquer consulta ao banco no Supabase deve passar pelas políticas de segurança. Jamais use o cliente com privilégios de `service_role` na interface do cliente (browser) ou sem verificação robusta no servidor.

---

## 4. Regras de Domínio Críticas
Como agente de desenvolvimento, você **deve assegurar** que as seguintes regras de negócio sejam implementadas e mantidas:

1. **Campos Protegidos do Aluno**:
   - Um **Aluno** não pode editar, em nenhuma circunstância: **Número**, **Nome Completo**, **Nome de Guerra**, **Curso**, **Fase do CFO** ou **Canga**.
   - Qualquer tentativa de alteração pelo perfil de Aluno deve ser bloqueada pelas políticas de banco e validações em Server Actions.
2. **Autoridade da Coordenação**:
   - Apenas a **Coordenação** tem permissão para alterar **Número**, **Fase do CFO** e atribuição de **Canga**.
3. **Auditoria de Alterações**:
   - Alterações de campos críticos (**Número**, **Fase do CFO** e **Canga**) devem obrigatoriamente disparar logs de auditoria automáticos em `public.audit_logs`.
4. **Nomenclatura Correta**:
   - O sistema **não possui pelotões separados** no momento. A turma inicial (CFO 2026.1) é tratada de forma unificada.
   - O campo correspondente à fase de ensino é **Fase do CFO** (mapeado como `pelotao` no banco devido ao legado de modelagem, mas exposto como Fase no frontend).
   - As opções válidas para este campo são restritas ao enum: `CFO I`, `CFO II`, `CFO III`.
   - Todos os alunos iniciam na fase **CFO I**.
5. **Integração de Canga**:
   - A **Canga** não deve possuir tela ou aba separada exclusiva na visualização do aluno ou da coordenação.
   - O canga deve ser integrado diretamente à ficha do aluno, nas abas de **Resumo** ou **Dados Gerais**.
6. **Prevenção de Duplicidades**:
   - É estritamente proibido haver dois alunos com o **mesmo número** na mesma turma. Isso é garantido por uma constraint de unicidade no banco de dados (`unique (class_id, student_number)`).

---

## 5. Próximos Passos recomendados
Ao carregar este repositório, consulte `docs/PROXIMAS_TAREFAS.md` para ver o backlog técnico priorizado e `docs/STATUS_ATUAL.md` para entender as pendências encontradas nos diagnósticos de banco e código.
