# Automação do Supabase

O projeto usa o Supabase CLI instalado em `devDependencies` e o script
`scripts/supabase-automation.mjs`. O projeto remoto esperado fica fixado no
script como `cfo-alunos-prod` (`waspsdnnxbpdwnyeqtxb`), evitando vincular este
repositório a outro banco por engano.

## O que já está configurado

- Supabase CLI `2.117.0` instalado pelo `pnpm`.
- Conta Supabase autenticada nesta máquina.
- Projeto `cfo-alunos-prod` identificado e vinculado ao checkout atual.
- Colima instalado e configurado como runtime Docker.
- CI executando reset completo e testes pgTAP em cada pull request e push na `main`.
- CI rejeitando migrations cujo `src/lib/supabase/types.ts` não tenha sido regenerado.
- Migrations remotas `0001` a `0035` conferidas; `0036` a `0041` continuam pendentes em produção.

## Comandos únicos

```bash
pnpm db:doctor
```

Mostra CLI, Docker, Supabase local, vínculo remoto e presença do `.env.local`,
sem imprimir segredos.

```bash
pnpm db:local:setup
```

Inicia o Colima quando necessário, sobe o Supabase, recria o banco pelas
migrations, executa todos os testes pgTAP, gera `src/lib/supabase/types.ts` e
cria um `.env.local` local com permissão `0600`. O arquivo não é commitado.

```bash
pnpm db:remote:plan
```

Confere o vínculo, compara migrations locais/remotas e executa `db push` em
modo `--dry-run`. Não modifica produção.

```bash
pnpm db:remote:apply -- --confirm-production=cfo-alunos-prod
```

Aplica as migrations pendentes em produção. O argumento obrigatório evita uma
execução acidental. Este comando só deve ser executado depois de validação local,
backup disponível e autorização explícita para a implantação.

```bash
pnpm db:local:stop
```

Encerra os contêineres do Supabase sem criar backup local.

## O que ainda exige ação humana uma única vez

- Autenticar novamente pelo navegador se o token do Supabase CLI expirar.
- Autorizar a aplicação em produção, porque o projeto não possui homologação e
  `db:remote:apply` altera o banco utilizado pelo sistema real.
- Configurar segredos de produção no Supabase/Vercel quando surgirem novos
  serviços externos. Chaves nunca devem ser salvas no Git.

Criação de migrations, validação local, geração de tipos, análise do plano
remoto e execução autorizada podem ser feitas integralmente pelo agente.
