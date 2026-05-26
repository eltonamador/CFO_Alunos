# Mapeamento — `Dados T1 CFO.pdf` × banco `CFO_Alunos`

PDF de origem: `G:\Meu Drive\CBMAP - Cursos e Instrução\CFO-26\Planejamento\Dados T1 CFO.pdf`
30 alunos da turma **T1 CFO 2026**.

## Tabela de correspondência

| Coluna PDF | Tabela | Campo | Observações |
|---|---|---|---|
| Numeração (01..30) | — | — | Não persistir; usado só para conferência. `students.student_number` já existe no banco e não vem do PDF (pode coincidir; **não** sobrescrever). |
| M ou F | `students` | `sex` | `M` ou `F`. |
| Nome Completo | `students` | `full_name` | **Chave de busca** (normalizado: maiúsculas, sem acento, espaços colapsados). Nunca sobrescrever. |
| Nome de Guerra | `students` | `war_name` | NOT NULL no schema; já existe nos 30 registros. **Nunca sobrescrever.** |
| Tipo (sanguíneo) | `health_restrictions` | `blood_type`, `rh_factor` | `O+` → `blood_type='O'`, `rh_factor='+'`. |
| Contato | `student_contacts` | `whatsapp` | Strip prefixo `55 ` (DDI), salva mascarado `(96) 9XXXX-XXXX`. |
| Profissão/ocupação | `students` | `professional_experience` | Coluna criada na migration `0020`. Normaliza newlines. |
| Endereço | `student_addresses` | `street` | Texto livre da rua. Bairro/cidade/estado/CEP **não** são extraídos (ficam NULL). |
| Ctt de Emerg | `emergency_contacts` (`priority=1`) | `phone`, `full_name`, `relationship`, `address`, `notes` | Parseado por heurística; original em `notes`. |
| Ctt de Emerg 2 | `emergency_contacts` (`priority=2`) | idem | idem |
| Altura | `health_restrictions` | `altura_cm` | `1,77` → `177`. |
| Aniversário | `students` | `birth_date` | `DD/MM/AAAA` → ISO `AAAA-MM-DD`. |
| Alergia | `health_restrictions` | `allergies` | Texto livre. |
| Medicamentos | `health_restrictions` | `continuous_medication` | Texto livre. |
| Fobias | `health_restrictions` | `medical_notes` | **Não há campo dedicado.** Quando houver valor, gravar prefixado: `Fobias: <texto>`. No PDF atual, 0 alunos declararam fobia. |
| Adventista | `students` | `religion`, `has_religious_restriction` | `Sim` → `religion='Adventista'` + `has_religious_restriction=true`. `Não` → ambos ficam NULL (não inferir religião). |

## Campos que **não** existem no PDF e portanto **não** são tocados

Em `students`: `cpf`, `rg`, `pis`, `voter_*`, `father_name`, `mother_name`, `naturality_*`, `marital_status`, `education_level`, `graduation_type`, `enrollment_id`, `presentation_date`, `photo_path`, `had_prior_military_service` e relacionados, `graduation_name`, `class_id`, `pelotao`, `student_number`, `situation`, `enrollment_status`.

Em `student_contacts`: `phone_secondary`, `email_personal`, `email_institutional`, `notes`.
Em `student_addresses`: `district`, `city`, `state`, `zip`, `landmark`, `origin_*`.
Em `student_logistics`: tudo.
Em `vehicles`: tudo.
Em `health_restrictions`: `chronic_disease`, `physical_restriction`, `dietary_restriction`, `uses_glasses`, `peso_kg`, `cirurgia_ocular*`, `operational_summary`, `medical_declaration_doc_id`, `validation_status` (mantém o atual).

## Regras de escrita

1. **Chave de match:** `normalize(full_name)` exato. Sem fuzzy.
2. **Confiança:**
   - **alta** — 1 match no banco;
   - **baixa** — 0 ou 2+ matches (ignorado pelo apply).
3. **Idempotência:** o script lê o estado atual antes de cada escrita e:
   - se o campo está NULL/vazio → escreve;
   - se o campo já tem valor e é compatível (após normalização) → marca `conferido`, não escreve;
   - se difere → marca `divergencia`, **não** sobrescreve.
4. **Sub-tabelas com PK `student_id`** (`student_contacts`, `student_addresses`, `student_logistics`, `vehicles`, `health_restrictions`): cria a linha se não existir; nunca apaga.
5. **`emergency_contacts`:** chave `(student_id, priority)`. Insere se ainda não existir; nunca sobrescreve.
6. **`war_name` e `full_name` nunca são escritos** pelo importador (são chave/identidade).

## Riscos LGPD

PDF contém telefone, endereço, contato de emergência, alergias, medicamentos. Os arquivos extraídos ficam em `scripts/import-t1-cfo/data/` e `scripts/import-t1-cfo/out/`, ambos no `.gitignore`. Nunca commitar.
