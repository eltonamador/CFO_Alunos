# Diário de ocorrências do estágio — 26/09/2026

Registro pessoal, extraoficial e narrativo do que o cadete viveu nos plantões. Não integra o PPC, não altera carga horária, avaliação nem escalas, e não tem fila de aprovação.

## Telas

- **Aluno — `/aluno/estagio/ocorrencias`:** três abas.
  - **Meu diário:** contagens, insígnias, linha do tempo com filtros por tipo e viatura, e botão **Baixar meu diário em PDF**.
  - **Mural da turma:** relatos compartilhados e reações 👏 e 💡.
  - **Quadro da turma:** ver abaixo.
- **Aluno — `/nova` e `/[id]`:** formulário com um único campo obrigatório (**O que aconteceu**, só ao sair do rascunho). O rascunho é salvo automaticamente. Plantão (últimos sete dias), data e viatura (USB/AR) vêm sugeridos.
- **Coordenação — `/coordenacao/estagio/ocorrencias`:** leitura dos registros salvos, filtro por visibilidade e cadete, **Destacar**, **Ocultar do mural** (motivo opcional, visível ao cadete) e **Voltar a exibir**. Acesso só do papel Coordenação; cadetes com delegação de administração do estágio não entram.

## Quem vê o quê

| Situação | Autor | Colegas da turma | Coordenação |
| --- | --- | --- | --- |
| Rascunho | Vê e edita | Não | Não |
| Salvo no diário | Vê e edita | Não | Lê |
| Compartilhado | Vê e edita | Lê e reage | Lê, reage e modera |
| Oculto pela Coordenação | Vê o aviso e edita | Não | Lê e reexibe |

- O cadete não altera destaque ou ocultação, não devolve um registro salvo ao rascunho e só vincula plantões próprios.
- Colegas marcados ficam restritos à mesma turma.
- A moderação não altera o texto do cadete.

## Incentivo simbólico

Insígnias sem pontos: Primeiro registro, Primeiro APH, Primeiro salvamento aquático, 5 tipos diferentes, 10 registros e Relato inspirador (5 reações). Rascunhos não contam.

### Quadro da turma (segunda etapa)

- Identificado como incentivo, sem valor avaliativo.
- Conta só relatos compartilhados e visíveis no mural. Registros pessoais não entram, e quem ainda não compartilhou não aparece.
- Período **Este mês** (padrão, pela data de compartilhamento) ou **Todo o estágio**.
- Ordenação por relatos compartilhados, tipos diferentes ou reações recebidas.
- Medalhas 🥇🥈🥉 para os três primeiros valores; empates dividem a mesma medalha.
- **Destaques do mês:** relatos destacados pela Coordenação no mês e os três mais apreciados entre os compartilhados no mês.

### PDF pessoal (segunda etapa)

- `GET /api/estagio/diario`: só o próprio cadete baixa.
- Inclui os registros salvos (sem rascunhos) em ordem cronológica, com resumo, insígnias e o aviso extraoficial.
- Visual de lembrança: sem brasão, cabeçalho institucional ou assinatura. O rodapé diz "Diário pessoal · sem valor oficial".
- Emojis são removidos no PDF (as fontes padrão não os suportam).

## Banco e testes

- Migration `0118_internship_occurrence_diary.sql`: tabelas `internship_diary_entries` e `internship_diary_reactions`, gatilho `internship_diary_guard_entry` e RPC `internship_diary_moderate`.
- pgTAP: `supabase/tests/internship_occurrence_diary.test.sql` (36 verificações).
- Vitest: `occurrenceDiary.test.ts`, `OccurrenceDiaryForm.test.tsx`, `DiaryControls.test.tsx` e `internship-occurrence-diary-pdf.test.ts`.
- A segunda etapa não exige migration: o quadro usa as mesmas regras de leitura do mural.
