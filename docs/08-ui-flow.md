# 08 — Fluxo de Telas e UX

## Princípios de UI
- **Mobile-first**: 360px de largura é o caso de uso real.
- **Navegação inferior** no mobile (4 ícones), **lateral** no desktop.
- **Cards grandes**, **tipografia legível** (mínimo 16px corpo).
- **1 ação primária por tela** — botão grande, alto contraste.
- **Filtros simples** (chips), busca sempre visível na lista.
- **Cores institucionais**: vermelho CBMAP como acento; superfícies neutras.
- **Acessibilidade**: contraste AA, alvos de toque ≥ 44px.

---

## Mapa de telas

```
[Login]
   ├── (primeiro acesso) ──► [Trocar senha] ──► [Onboarding aluno]
   └── (recorrente) ───────► [Home (varia por role)]

Home Coordenação
  ├── Lista de alunos (1)
  │     ├── [Card rápido] (2)
  │     │     └── [Ficha completa] (3) ──► abas
  │     │           ├── Resumo
  │     │           ├── Contato
  │     │           ├── Endereço/Origem
  │     │           ├── Emergência
  │     │           ├── Saúde
  │     │           ├── Logística
  │     │           ├── Veículo/CNH
  │     │           ├── Documentos
  │     │           ├── Canga (definir/histórico)
  │     │           ├── Materiais (checklist)
  │     │           └── Histórico (audit)
  │     └── Filtros (pelotão, situação, pendência)
  ├── Pendências de validação (4)
  ├── Dúvidas de materiais (5)
  ├── Canga — visão geral (6)
  ├── Relatórios (7)
  └── Admin (turma, pelotões, usuários)

Home Secretaria
  ├── Documentos para validar
  ├── Lista de alunos (cadastro)
  ├── Pendências administrativas
  └── Relatórios (subset)

Home Instrutor
  ├── Busca (número/nome de guerra) — destaque
  ├── Lista compacta (card operacional)
  └── (sem menu de admin)

Portal do Aluno
  ├── Meu resumo (com % progresso)
  ├── Minha ficha (editar)
  ├── Meus documentos
  ├── Meus materiais (checklist)
  ├── Minhas dúvidas
  └── Minha turma (lista básica)

[Offline] — tela informativa, mostra cache disponível
```

---

## Telas obrigatórias (conforme prompt, com detalhes)

### 1. Login
- Logo CBMAP, campo e-mail, campo senha, "Esqueci a senha".
- Detecção de "primeiro acesso" pela flag `profiles.password_changed_at is null`.

### 2. Primeiro acesso
- Forçar nova senha (regra: 8+ caracteres, 1 número, 1 maiúsculo).
- Aceite de termos curtos (LGPD + uso do sistema).
- Etapa rápida: foto + WhatsApp.

### 3. Dashboard da Coordenação
- 4 cards de KPI no topo: total alunos, % cadastro completo, % docs validados, pendências abertas.
- Lista resumida das últimas pendências.
- Atalhos: Pendências, Dúvidas, Canga, Relatórios.

### 4. Dashboard da Secretaria
- KPIs: docs pendentes, validados na semana, recusados.
- Fila de documentos para validar.

### 5. Dashboard do Instrutor
- **Busca grande no topo** (número OU nome de guerra).
- Lista compacta com foto+número+nome de guerra+badge de restrição.

### 6. Portal do Aluno (home)
- Cabeçalho com foto, número, nome de guerra, pelotão, canga.
- 4 barras de progresso: Cadastro, Documentos, Materiais (geral), Materiais (quarentena).
- Lista de pendências do aluno.

### 7. Lista dos 30 alunos
- Grid responsivo (1 col mobile, 2-3 tablet, 4-6 desktop).
- Cada card: foto, nº, nome de guerra, pelotão, canga, badges (cadastro/docs/materiais).
- Busca persistente.
- Filtros: pelotão, situação, com pendência.

### 8. Busca por número e nome de guerra
- Componente sempre presente; matches por prefixo e por contém (case-insensitive).
- Index DB: `lower(war_name)`, `student_number`.

### 9. Card rápido (modal/drawer)
- Conforme UC-IN-02 e visão LGPD.

### 10. Ficha completa
- Tabs horizontais no desktop, **stack vertical com accordion** no mobile.
- Cabeçalho sticky com foto+número+nome de guerra.

### 11. Edição dos dados pelo aluno
- Mesma ficha, com campos editáveis conforme role.
- Indicação visual de "este campo será validado pela Coordenação".

### 12. Validação de dados sensíveis (Coordenação)
- Lista de `PendingChange` com filtro por contexto.
- Modal: ver "antes/depois" lado a lado → Validar / Recusar (com motivo).

### 13. Validação de documentos
- Lista por aluno OU por tipo.
- Visualização do arquivo (PDF inline / imagem).
- Botões: Validar / Recusar (motivo obrigatório).

### 14. Definição de canga
- Visão matriz "aluno → seu canga".
- Atribuir: selecionar par; validação anti-loop.
- Histórico em drawer lateral.

### 15. Checklist de materiais (aluno)
- Lista por **fase** (Quarentena primeiro), depois por categoria.
- Cada item: nome, qtd, badge de obrigatoriedade, status (seletor), observação, foto, dúvida.
- Indicador de "pronto para apresentação" no topo.

### 16. Dúvidas sobre materiais (Coordenação)
- Lista cronológica de perguntas abertas.
- Resposta inline; opcional "resposta padrão" reaproveitável.

### 17. Pendências de materiais
- Relatório por aluno (linhas) × itens pendentes (colunas) — DataTable.
- Filtro por fase/categoria.
- Botão "Exportar Excel".

### 18. Relatórios e exportação
- Cards de relatórios disponíveis (conforme escopo do role).
- Cada um: botão "Gerar XLSX".

### 19. Histórico/auditoria
- Aba da ficha; linha do tempo com ação, autor, antes/depois.

### 20. Tela "sem internet" / cache offline
- Banner global persistente "Modo offline — dados podem estar desatualizados".
- Lista de telas disponíveis a partir do cache.

---

## Padrões de componente

- **Top bar**: logo + busca + avatar.
- **Bottom nav (mobile)**: Início · Turma · Materiais · Mais.
- **Side nav (desktop)**: itens completos por role.
- **Drawer** para card rápido (90% das interações em < 2 toques).
- **Toasts** para feedback (salvo, recusado, erro).
- **Loading skeletons**, não spinners.

## Navegação mobile vs desktop

| Aspecto | Mobile (< 768px) | Desktop (≥ 1024px) |
|---|---|---|
| Navegação | Bottom nav 4 itens | Side nav expandida |
| Ficha | Abas em accordion | Tabs horizontais |
| Lista | Cards 1 coluna | Grid 3-6 colunas |
| Card rápido | Bottom sheet | Side drawer |
| Filtros | Botão → modal | Inline barra superior |
| Relatórios | Lista | Lista + preview |
