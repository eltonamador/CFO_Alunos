# 01 — Visão do Produto

## Nome
**CFO Alunos** — Sistema de Gestão dos Alunos do Curso de Formação de Oficiais.

## Cliente / Domínio
Academia Bombeiro Militar do **Corpo de Bombeiros Militar do Amapá (CBMAP)**.

## Problema
A gestão dos alunos do CFO hoje é dispersa em planilhas, grupos de WhatsApp, listas em papel e documentos avulsos. Isso gera:

- Dificuldade para a Coordenação ter visão única e em tempo real da turma.
- Retrabalho da Secretaria com documentos físicos e validações manuais.
- Instrutores sem acesso rápido a dados operacionais (foto, nome de guerra, restrição médica, contato).
- Alunos sem clareza sobre o que ainda falta entregar (documentos, materiais, fardamento).
- Risco de exposição de dados sensíveis (saúde, RG, CPF) por canais informais.

## Solução proposta
Aplicação **web responsiva / PWA** que centraliza, controla acesso por perfil e permite consulta rápida no smartphone, tablet ou desktop. Funciona offline para dados já carregados.

## Público-alvo (perfis)
1. **Coordenação do CFO** — comando e gestão estratégica da turma.
2. **Secretaria da Academia** — administração documental.
3. **Instrutores** — consulta operacional durante a instrução.
4. **Alunos (Cadetes do CFO)** — autocadastro e atualização.

## Objetivos do MVP
1. Cadastro completo e autoatendido dos ~30 alunos da turma inicial.
2. Ficha rica do aluno com 11 abas (resumo, contato, endereço, emergência, saúde, logística, veículo, documentos, canga, materiais, histórico).
3. Checklist de materiais (~18 categorias) com validação pela Coordenação.
4. Upload e validação de documentos pessoais.
5. Definição e histórico de **canga** pela Coordenação.
6. Visões diferenciadas por perfil (LGPD-aware).
7. Relatórios em **Excel** para listas, contatos, pendências e dúvidas.
8. PWA com cache offline básico de listas/fichas já abertas.
9. Deploy na **Vercel** + Supabase (Auth, Postgres, Storage).

## Fora de escopo do MVP
- Plano de chamada diário / frequência por instrução.
- Notas, avaliações, boletins.
- Edição offline com sincronização.
- App nativo (iOS/Android stores).
- Comunicação interna (chat, mural).
- Integração com sistemas de RH/folha da corporação.

## Princípios de produto
- **Mobile-first** — uso real é em campo, com o celular.
- **Rápido em 3G** — listas e busca otimizadas; cache agressivo.
- **Privacidade por padrão** — dados sensíveis nunca aparecem em listas; instrutor vê só o necessário.
- **Validação humana** — toda alteração sensível vira *pendência de validação*, não é "aceita cegamente".
- **Auditável** — alterações sensíveis ficam registradas com autor, data e valores anterior/novo.

## Métricas de sucesso (MVP)
- 100% dos 30 alunos com cadastro básico completo em até 2 semanas após go-live.
- 100% dos documentos obrigatórios enviados em até 30 dias.
- > 90% dos itens da quarentena com status preenchido pelo aluno antes da apresentação.
- Tempo médio para Coordenação localizar a ficha de um aluno **< 5s** no celular.
- Zero exposição indevida de dados sensíveis a perfis não autorizados (validado em testes).
