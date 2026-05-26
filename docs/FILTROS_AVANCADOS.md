# Filtros Avançados — Relatórios CFO 2026.1

## Visão Geral

A feature **Filtros Avançados** permite que a Coordenação (e Secretaria, com limitações) combine critérios da ficha do aluno para gerar contagens, listas e relatórios em PDF ou XLSX em tempo real.

**Escopo**: v1 entregou Identificação (sexo, status matrícula, situação ficha); v2 expandiu para Origem, Saúde (LGPD), Logística, Documentos e Religião.

---

## Arquitetura

### Camadas

```
┌─ Página server: /coordenacao/relatorios/filtros-avancados/page.tsx
│  ├─ Autentica + carrega alunos via Supabase (RLS)
│  ├─ Agrega pendências (equipment_status, documents)
│  └─ Passa dados ao cliente
│
├─ Lib shared: src/lib/reports/filtros-avancados.ts
│  ├─ FiltrosState: 6 categorias de filtros
│  ├─ AlunoFiltravel: forma completa do registro
│  ├─ Helpers: computeFichaSituacao, residesInAmapa, hasAllergy, ...
│  ├─ applyFiltros: filtra em memória (client-side)
│  └─ computeResumo: estatísticas derivadas
│
├─ UI client: FiltrosClient.tsx
│  ├─ Filtros em cartões por categoria
│  ├─ Resultado em tempo real (sem nova query)
│  ├─ Stats expandidas e lista de alunos
│  └─ Botões export (PDF, XLSX)
│
└─ API: /api/reports/filtros-avancados (POST)
   ├─ Recebe ids + criterios + includeSensitive
   ├─ Defesa LGPD: zera sensitive fields p/ roles ≠ coordenacao
   ├─ Gera PDF (pdfkit, A4 landscape) ou XLSX (exceljs)
   └─ Retorna buffer com headers de download
```

### Fluxo

1. **Server carrega turma**: `student.select(...)` + select aninhados (`student_addresses`, `student_logistics`, `vehicles`, `health_restrictions`)
2. **Server agrega pendências**: queries leves em `student_equipment_status` e `documents`, resultado em sets para O(1) lookup
3. **Client renderiza**: FiltrosState em useState; cada mudança chama `applyFiltros` (in-memory, rápido)
4. **Stats em tempo real**: `computeResumo` roda sobre `filtrados` e atualiza a grade
5. **Export**: clique em "Gerar PDF/XLSX" faz POST com `{ids, criterios, includeSensitive}`
6. **Server rebuild**: busca alunos nos ids, agrega pendências novamente, passa por `buildPdf` ou `buildXlsx`
7. **Download**: browser recebe arquivo como attachment

---

## Filtros Suportados

### Identificação
- **Sexo**: Masculino / Feminino / Não informado
- **Status da matrícula**: Confirmada / Pendente
- **Situação da ficha**: Completa (cpf + birth_date + naturality_city + mother_name) / Incompleta / Não iniciada

### Contato / Origem
- **Reside no Amapá**: Sim / Não / Não informado (usa `student_addresses.origin_in_amapa` ou derivado de `from_other_state`/`state`)
- **UF de endereço**: Busca por substring (ex.: "AP" retorna todos com UF contendo "AP")

### Saúde (LGPD restrito — Coordenação only)
- **Possui alergia**: verifica `health_restrictions.allergies` não-vazio
- **Usa medicação contínua**: verifica `health_restrictions.continuous_medication` não-vazio
- **Tem restrição física**: verifica `health_restrictions.physical_restriction` não-vazio

### Logística / Materiais
- **Possui CNH**: `vehicles.has_cnh`
- **Possui veículo**: `vehicles.has_vehicle`
- **Necessita alojamento**: `student_logistics.needs_housing`
- **Experiência militar anterior**: `students.had_prior_military_service`
- **Instituição militar anterior**: `students.prior_military_branch` (CBM / PM / FA / outra)
- **Pendência de material/enxoval**: flag `has_pending_equipment` (aluno tem status pendente em `student_equipment_status`)

### Documentos
- **Documento pendente**: flag `has_pending_documents` (aluno tem status `pendente`/`em_analise`/`recusado` em `documents`)

### Administrativo
- **Restrição religiosa**: `students.has_religious_restriction`

---

## Proteção de Dados Sensíveis (LGPD)

### Níveis de defesa

1. **Middleware** (`src/lib/supabase/middleware.ts`): bloqueia `/coordenacao/*` para roles ≠ coordenacao
2. **Page RoleGuard**: `requireRole(["coordenacao", "secretaria"])` — rejeita acesso não-autorizado
3. **API auth**: valida sessão + role; `includeSensitive` honrado apenas se `role === "coordenacao"`
4. **Data sanitization**: campos sensíveis (`health_restrictions`, `religion`) zerados no buffer antes de export se `role !== "coordenacao"`
5. **RLS**: Supabase row-level security on `health_restrictions`, `documents`, `student_equipment_status` — garante que queries server-side não ultrapassam permissões

### Campos sensíveis

- `health_restrictions.*` (allergies, continuous_medication, physical_restriction, chronic_disease, dietary_restriction)
- `students.religion`, `students.has_religious_restriction`

### Avisos ao usuário

- **UI**: banner amarelo "LGPD" no painel lateral (Coordenação) com aviso sobre restrição
- **Cartões**: filtros de Saúde ganham badge "LGPD" visual
- **PDF**: cabeçalho amarelo "LGPD: contém colunas sensíveis..." estampado na página 1
- **XLSX**: aba "Resumo" inclui aviso LGPD se colunas sensíveis presentes

---

## Performance

- **Tamanho turma**: até ~100 alunos, zero problemas. Acima de 500, considerar paginação na tabela.
- **Filtros in-memory**: `applyFiltros` + `computeResumo` rodam em <50ms mesmo para 100 alunos
- **Queries server**: 2 queries leves (equipment + documents) + 1 query de select aninhado = ~200ms total
- **PDF/XLSX**: geração local com pdfkit/exceljs, tamanho típico <500KB

---

## Extensão Futura

A arquitetura permite adicionar filtros sem refactor:

1. Estender `AlunoFiltravel` com novo campo + sua sub-tabela Supabase select
2. Criar helper (`hasXyz`) se derivado
3. Adicionar filtro em `FiltrosState` e `applyFiltros`
4. Estender UI com novo `FilterGroup` em `FiltrosClient`
5. Atualizar colunas em `buildPdf` / `buildXlsx`

Exemplo: para filtrar por "Tipo de veículo", só adicionar `cnh_category` a `vehicles` select e novo filtro em estado.

---

## Testing

### Testes unitários recomendados

```typescript
// Helpers
describe("computeFichaSituacao", () => {
  it("retorna 'completa' se cpf+birth_date+naturality_city+mother_name preenchidos", () => {});
  it("retorna 'nao_iniciada' se nenhum desses campos preenchido", () => {});
  it("retorna 'incompleta' para casos intermediários", () => {});
});

describe("residesInAmapa", () => {
  it("retorna true se origin_in_amapa = true", () => {});
  it("retorna false se from_other_state = true", () => {});
  it("retorna null se ambos indefinidos", () => {});
});

// Filtros
describe("applyFiltros", () => {
  it("retorna todos alunos se FiltrosState vazio", () => {});
  it("filtra por sexo", () => {});
  it("filtra por múltiplos critérios (AND lógico)", () => {});
  it("busca substring UF insensível a case", () => {});
});

describe("computeResumo", () => {
  it("conta corretamente por sexo/matrícula/ficha", () => {});
  it("calcula percentual com 1 casa decimal", () => {});
  it("retorna zeros se filtrados vazio", () => {});
});
```

### Testes E2E

- Navegar para `/coordenacao/relatorios/filtros-avancados`
- Selecionar filtros; verificar lista + stats atualizadas
- Exportar PDF; validar estrutura (cabeçalho, tabela, rodapé, paginação)
- Exportar XLSX; validar abas e dados

---

## Troubleshooting

| Problema | Causa | Solução |
|---|---|---|
| Nenhum aluno aparece | RLS muito restritivo | Verificar policies em students, student_addresses, etc. |
| Coluna sensível visível para Secretaria | bug no client | Verificar `includeSensitive` check no API route |
| PDF truncado | margem muito pequena | Aumentar `PAGE.marginX`, `PAGE.marginBottom` em route.ts |
| XLSX corta texto de colunas | auto-width subestimado | Aumentar `maxWidth` em `autoWidth()` |
| Carregamento lento | turma muito grande | Considerar paginação na tabela de resultados |

---

## Commits relacionados

- `feat(filtros): filtros avançados v1 (identificação)`
- `feat(filtros): filtros avançados v2 (origem, saúde, logística, docs, religião)`

---

**Mantido por**: Coordenação CFO 2026.1  
**Última atualização**: 2026-05-26
