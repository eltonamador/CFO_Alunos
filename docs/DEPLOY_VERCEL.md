# Deploy — Vercel (Produção)

Guia passo-a-passo para subir o CFO Alunos na Vercel apontando para o Supabase Cloud.

> Pré-requisito: **`docs/DEPLOY_SUPABASE.md` deve estar completo** (projeto Supabase Cloud com schema, seed e usuários aplicados).

---

## Passo 1 — Push do repositório

A Vercel precisa de um repositório Git acessível (GitHub recomendado):

```bash
git remote -v   # confirma que tem um remote (origin)
git push origin main
```

Se ainda não criou o repositório:
1. Cria em https://github.com/new (privado recomendado)
2. `git remote add origin git@github.com:USUARIO/cfo-alunos.git`
3. `git push -u origin main`

---

## Passo 2 — Importar projeto na Vercel

1. Acessa https://vercel.com/new
2. Escolhe **Import Git Repository** → seleciona `cfo-alunos`
3. **Framework Preset**: Next.js (detecta automaticamente)
4. **Root Directory**: `./` (raiz)
5. **Build Command**: `pnpm build` (padrão)
6. **Output Directory**: `.next` (padrão)
7. **Install Command**: `pnpm install`
8. **Node.js Version**: 20.x

**NÃO clica em Deploy ainda.** Antes, configura as variáveis de ambiente.

---

## Passo 3 — Variáveis de ambiente (CRÍTICO)

Em **Settings → Environment Variables**, adiciona TODAS abaixo. Para cada uma, marca quais ambientes (Production / Preview / Development):

| Variável | Valor | Sensible? | Environments |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://SEU_PROJETO.supabase.co` | ❌ pode ser pública | ✅ Prod ✅ Preview ❌ Dev |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_xxxxx` | ❌ pode ser pública | ✅ Prod ✅ Preview ❌ Dev |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_xxxxx` | 🔴 **SECRETO** — marca "Sensitive" | ✅ Prod ✅ Preview ❌ Dev |
| `NEXT_PUBLIC_APP_NAME` | `CFO Alunos` | ❌ | ✅ Prod ✅ Preview ✅ Dev |
| `NEXT_PUBLIC_APP_URL` | `https://SEU_DOMINIO.vercel.app` | ❌ | ✅ Prod ✅ Preview ✅ Dev |
| `NODE_ENV` | (Vercel define automaticamente) | — | — não setar manualmente |

> 🔐 **CRÍTICO**: marca `SUPABASE_SERVICE_ROLE_KEY` como **Sensitive** (cadeado). Isso impede que ela apareça em logs/UI da Vercel mesmo para colaboradores do projeto.

---

## Passo 4 — Primeiro deploy

Clica em **Deploy**. Build deve levar ~2-3 min. Saída esperada:

```
✓ Compiled successfully
✓ Generating static pages (19/19)
Route (app)                              Size     First Load JS
┌ ƒ /                                    160 B          88.8 kB
...
```

Se der erro:
- `pnpm-lock.yaml` desatualizado → rodar `pnpm install` local + commit + push
- Variável faltando → conferir Passo 3
- Erro de tipos → o build local com `pnpm build` precisa passar antes do push

---

## Passo 5 — Adicionar URL de prod aos Redirects do Supabase

Pega a URL gerada pela Vercel (ex.: `cfo-alunos-abc123.vercel.app`).

Volta no painel Supabase → **Authentication → URL Configuration**:
- **Site URL**: `https://cfo-alunos-abc123.vercel.app`
- **Redirect URLs**: adiciona `https://cfo-alunos-abc123.vercel.app/auth/callback`

(Se for usar domínio custom, repete depois de configurar o domínio.)

---

## Passo 6 — Domínio customizado (opcional)

Em **Settings → Domains** na Vercel:
1. Adiciona `cfo.cbmap.ap.gov.br` (ou similar)
2. Vercel mostra DNS records para configurar (`A` ou `CNAME`)
3. Configura no provedor DNS
4. Aguarda propagação (~5 min a 24h)
5. SSL é automático via Let's Encrypt
6. Volta no Supabase e atualiza Site URL + Redirect URLs

---

## Passo 7 — Smoke test em produção

1. Acessa a URL Vercel
2. Loga como Coordenação (`coordenacao@abm.br` / `ChangeMe!2026`)
3. Verifica:
   - [ ] Lista dos 30 alunos carrega
   - [ ] Avatar/Barlow Condensed/cores institucionais aparecem
   - [ ] Ficha de 1 aluno abre sem erro
   - [ ] Aba **Materiais** mostra categorias e itens
   - [ ] Aba **Histórico** mostra logs (mesmo que vazia)
   - [ ] Download de **Relatórios → Ficha Completa** baixa um `.xlsx`
4. Logout
5. Loga como aluno (ex.: `silva@abm.br` / `ChangeMe!2026`)
6. Verifica:
   - [ ] Vai pra `/aluno/ficha`
   - [ ] Edita WhatsApp em **Contato** → salva
   - [ ] Vê a edição refletida
   - [ ] Bottom-nav mobile funciona em DevTools mobile
7. Logout

Se tudo OK: **app em produção, pronto pra alunos**. ✅

---

## Pós-deploy — checklist

- [ ] Trocar todas as senhas iniciais (`ChangeMe!2026`)
- [ ] Coord envia para cada aluno: URL + email + senha temporária
- [ ] Monitorar logs Vercel: **Settings → Functions → Logs** nas primeiras 24h
- [ ] Monitorar Supabase: **Database → Logs** procurando por erros RLS
- [ ] Configurar alertas Vercel (`Settings → Notifications`)
- [ ] Habilitar **Vercel Analytics** (gratuito, mede Web Vitals)

---

## Rollback rápido

Se um deploy quebrar prod:
1. Vercel → Deployments → encontra deploy anterior estável
2. Clica em `...` → **Promote to Production**
3. Instantâneo (~10s) — DNS aponta pro deploy antigo

Para reverter migrations do banco: **não há reversão automática**. Tem que escrever migration de downgrade ou restaurar backup (Pro).

---

## Variáveis para preview deploys (PRs futuros)

Quando criar branch + PR, Vercel gera URL `cfo-alunos-git-BRANCH-USER.vercel.app`. Por padrão usa as MESMAS variáveis de prod — atenção: **preview aponta pra banco real**.

Se quiser isolar previews (recomendado no futuro):
1. Cria um 2º projeto Supabase `cfo-alunos-staging`
2. Em Vercel → Environment Variables, sobrescreve para **Preview only** com credenciais de staging
3. Cada PR vira um ambiente de teste real sem tocar prod
