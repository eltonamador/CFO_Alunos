# 10 — Plano de Testes

## Pirâmide
- **Unit (60%)** — VOs, regras puras (cálculo de pendência, derivação de resumo operacional, política de PendingChange). **Vitest.**
- **Integration (25%)** — repositórios contra Supabase local (`supabase start`). **Vitest** com fixtures.
- **E2E (15%)** — fluxos críticos de ponta a ponta. **Playwright** apontando para preview local ou Vercel preview.

Comandos:
```bash
pnpm test         # unit
pnpm test:int     # integration
pnpm e2e          # playwright
pnpm lint && pnpm typecheck && pnpm build
```
Roda em CI a cada PR.

---

## Casos críticos (devem existir no MVP)

### Permissões (RLS + UI guards)
1. **Aluno só acessa próprios dados** — tenta `select` em `students` com `id` de outro aluno → 0 linhas (RLS).
2. **Aluno não altera número/pelotão/canga/situação** — server action recusa; DB também recusa (RLS no `update`).
3. **Instrutor não vê CPF** — `select cpf from students` retorna null/erro; view do card não inclui CPF.
4. **Instrutor não vê detalhe clínico** — `select * from health_restrictions` retorna 0 linhas (RLS).
5. **Secretaria não vê detalhe clínico** — mesmo cenário; vê apenas `v_has_restriction`.
6. **Acesso a contato de emergência gera audit** — `select * from emergency_contacts` via API do card insere `audit_logs` com `action='view_emergency_contact'`.
7. **Coordenação vê tudo** — happy path para sanidade.

### Aluno / Cadastro
8. **Edição de dados pessoais** — aluno edita whatsapp → salva → reload mostra novo valor; `audit_logs` registra.
9. **Alteração de CPF gera PendingChange** — valor antigo permanece efetivo até validação.
10. **Alteração de restrição de saúde** — fica `validation_status='pendente'`; resumo operacional fica vazio até Coordenação editar.
11. **Coordenação edita resumo operacional** — instrutor vê texto novo no card.
12. **Aluno preenche checklist** — status salva; observação salva; foto sobe ao bucket correto.
13. **Aluno faz pergunta sobre material** — `equipment_questions` criada; status do item passa a `em_duvida`.
14. **Aluno tenta editar canga** — bloqueado por RLS e por UI.

### Documentos
15. **Upload de documento** — aluno envia → `documents.status='enviado'`; arquivo no bucket privado.
16. **Validação** — Secretaria valida → status `validado`; `audit_logs` registra com `validated_by`.
17. **Recusa** — Coordenação recusa com motivo obrigatório → status `recusado`; aluno consegue reenviar; novo registro substitui storage_path.
18. **Instrutor tenta baixar documento** — Storage retorna 403.

### Canga
19. **Definição de canga** — Coordenação atribui A→B; designações anteriores ficam `is_current=false`; nova é única para A.
20. **Tentativa de canga consigo mesmo** — bloqueada por `check`.
21. **Histórico** — exibe todas as designações com data e responsável.
22. **Aluno B vê seu canga atual** — sim, no portal.

### Checklist — cálculo de pendência (regra crítica)
Testes unitários puros (sem DB), uma função `computePendingItems(statuses, requirements, student)`:

23. Item `ok` → não pendente.
24. Item `nao_se_aplica` → não pendente.
25. Item opcional não exigido sem status → não pendente.
26. Item obrigatório sem status → pendente.
27. Item `falta_comprar` → pendente.
28. Item `em_duvida` → pendente.
29. Item `vai_chegar` → pendente.
30. Item `comprado` sem validação → pendente.
31. Item `comprado` validado → não pendente.
32. Item `inadequado` → pendente.
33. Aplicabilidade `feminino` para aluno `M` → não conta como pendência.
34. Aplicabilidade `condicional` → respeitar campo `notes` do requisito (regra a definir; ver `decisions.md`).

### Exportação Excel
35. **Lista geral** — XLSX com 30 linhas, cabeçalhos esperados, encoding correto.
36. **Pendências por aluno** — agrupa por aluno; conta consistente com cálculo de pendência.
37. **Pendências por item** — agrupa por item; mesmo total agregado que 36.
38. **Contatos de emergência** — exporta com 2 contatos por aluno.
39. **Permissão de relatório** — Secretaria pede relatório de saúde → 403.
40. **Acentuação correta** (UTF-8 / BOM apropriado no XLSX).

### Auth / primeiro acesso
41. **Primeiro acesso força troca de senha** — não consegue entrar no app sem trocar.
42. **Logout limpa sessão**.
43. **Recuperação de senha** — fluxo Supabase Auth funcionando.

### Offline / PWA
44. **Manifest válido** — Lighthouse passa.
45. **Carrega lista, vai offline, recarrega** — lista aparece com banner "modo offline".
46. **Tentativa de mutação offline** — toast claro "sem conexão".
47. **Recursos não-cached** — fallback para tela offline informativa.

---

## Critérios de aceite do MVP (mapeamento prompt §18)

Cada item abaixo tem ao menos um teste automatizado correspondente acima:

| Critério | Teste |
|---|---|
| Coordenação gerencia turma CFO | E2E manual de F4 + F5 |
| Aluno faz primeiro acesso | T41 |
| Aluno preenche cadastro completo | T8, T9 |
| Aluno envia documentos | T15 |
| Aluno preenche checklist | T12 |
| Coordenação vê lista de 30 alunos | E2E F6 |
| Busca por número/nome de guerra | E2E F6 + perf < 500ms |
| Card rápido | E2E F6 |
| Ficha completa | E2E F6 |
| Instrutor vê só dados operacionais | T3, T4, T18 |
| Secretaria valida documentos | T16, T17 |
| Coordenação valida sensíveis | T9, T10 |
| Coordenação define canga | T19, T20, T21 |
| Coordenação responde dúvidas | T13 + E2E |
| Relatórios Excel | T35–T40 |
| Dados carregados abrem sem internet | T45 |
| Build passa sem erro | CI |
| TypeScript sem erros críticos | CI (`pnpm typecheck`) |
| Pronto para Vercel | preview verde |

---

## Dados de teste (fixtures)
- 30 alunos fictícios determinísticos (faker com seed).
- 4 perfis: 1 coordenação, 1 secretaria, 1 instrutor, e os 30 alunos.
- Catálogo de equipamentos com pelo menos 50 itens distribuídos entre as 18 categorias.
- 5 alunos com restrição de saúde (variadas), 3 com documentos recusados, 4 com pendências de material.

## Critério "Definition of Done" por fase
1. Funcionalidade entregue.
2. Testes (unit + e2e relevantes) passam.
3. `pnpm lint && pnpm typecheck && pnpm build` limpos.
4. RLS testada para o caso mais sensível introduzido na fase.
5. README/docs atualizados se houve mudança operacional.
