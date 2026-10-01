# Experiência mobile — análise e implementação

Data: 01/10/2026. Escopo: PWA do CFO Alunos, consultas de alunos e Coordenação.

## 1. Análise de causa raiz

### Evidências do código

1. **Reload explícito na reconexão:** `next.config.mjs` tinha `reloadOnOnline: true`. Na versão instalada, `@serwist/next/dist/sw-entry.mjs` registra `online → location.reload()`. Uma reconexão ao sair/voltar de outro aplicativo pode, portanto, destruir o estado React. É uma causa comprovada no código; não houve captura do aparelho do usuário para afirmar que explica todos os episódios.
2. **O PWA e o App Shell já existiam.** Há manifest standalone, Serwist e layout compartilhado. Faltava persistir o contexto e restaurá-lo depois de descarte. As abas da ficha já estão na URL (`?tab=`); a rolagem e o último destino não eram restaurados pela aplicação.
3. **Caminho crítico do servidor:** autenticação e perfil no middleware, novamente validação no servidor, três consultas auxiliares sequenciais no `getSession`, contadores aguardados antes da montagem do shell. A autenticação/RLS foi preservada; as três consultas independentes foram paralelizadas e os contadores passaram a Suspense.
4. **Overfetch da ficha:** cada aba do aluno disparava dez operações auxiliares, incluindo seções ocultas. A Coordenação disparava treze. Na aba Contato, os lotes agora têm duas e três operações respectivamente (incluem assinatura da foto, que pode não consultar a rede se não houver foto). A Coordenação mantém a leitura de saúde necessária ao indicador do cabeçalho. Não confundir essas contagens com total de requisições HTTP internas das funções.
5. **Precache amplo:** a configuração padrão varria todo `public`, incluindo leitores de PDF/OCR e imagens institucionais grandes. O conjunto público anterior, calculado com os arquivos locais, somava aproximadamente 4,55 MB; a lista essencial atual soma 0,53 MB (88% menor). Isso reduz trabalho na instalação/atualização; não é uma medição de LCP. Os chunks e fontes do Next.js são contabilizados separadamente.
6. **Fallback genérico dependia de `/offline`:** uma rota Next não explicitamente incluída no precache público. Agora existe `public/offline.html`, independente de React/autenticação, comprovadamente presente no cache. As páginas estáticas offline foram excluídas do middleware de sessão.
7. **Cache padrão excessivamente genérico:** `defaultCache` também possui regras para imagens e origens externas. Foi substituído por uma lista de assets públicos permitidos, para não persistir fotos assinadas ou respostas do Supabase no cache compartilhado.

### Limite do sistema operacional

Android/iOS podem suspender ou encerrar processos em segundo plano. Service Workers também são transitórios: cache em disco não retém a árvore React na RAM. Nem um APK impede encerramento por falta de memória. A solução é eliminar recargas provocadas pela aplicação e reconstruir o contexto após um encerramento inevitável. `visibilitychange` no estado hidden é usado como checkpoint, com `pagehide`/`freeze` e salvamento durante rolagem como complementos. Não usamos heartbeat, wake lock, `unload` ou timers para tentar manter o processo vivo.

Referências: [Serwist — reloadOnOnline](https://serwist.pages.dev/docs/next/configuring/reload-on-online), [Chrome — Page Lifecycle](https://developer.chrome.com/docs/web-platform/page-lifecycle-api), [Android — processos e ciclo de vida](https://developer.android.com/guide/components/activities/process-lifecycle).

## 2. Comparação de soluções

Estimativas de engenharia para um profissional familiarizado com o repositório, incluindo homologação básica; não são prazos medidos desta alteração.

| Critério | A — PWA otimizado, recomendado | B — Capacitor / Tauri Mobile / Cordova |
| --- | --- | --- |
| Implementação | Cerca de 2–4 dias para correções e homologação nos aparelhos, aproveitando a arquitetura atual | Cerca de 2–4 semanas para uma versão com assets locais, adaptação de autenticação/APIs, builds assinados e testes; publicação em lojas pode acrescentar prazo |
| Distribuição | Mesmo endereço HTTPS; instalação pela tela inicial | APK Android por distribuição controlada ou AAB para loja; iOS exige distribuição própria |
| Atualizações | Deploy web; novo worker aguarda fechamento das instâncias antigas | Builds e distribuição por plataforma; atualizações de código web dependem da estratégia adotada |
| Desempenho | Assets locais após primeira instalação; navegação preservada; dados privados online ainda dependem de rede/servidor | Assets empacotados melhoram o início da interface; APIs e WebView continuam sujeitos a latência e pressão de memória |
| Principal vantagem | Corrige causas observadas com menor custo e mantém desktop/mobile no mesmo projeto | Integração com APIs nativas, armazenamento e distribuição gerenciada quando necessários |
| Principal custo/limite | Navegador pode descartar processo e armazenamento; primeiro acesso depende de rede | Nova cadeia Android/iOS e persistência de estado continuam necessárias; só abrir o site remoto dentro do APK mantém os gargalos do servidor |

**Decisão:** executar A agora. Se surgir uma necessidade concreta de recursos/distribuição nativa, avaliar Capacitor reaproveitando estas correções. Tauri exige frontend compatível com exportação estática; o projeto usa Server Components, Server Actions, cookies e rotas API, portanto não basta alterar para `output: 'export'`. Cordova também exige uma camada WebView e adaptação de serviços; não elimina automaticamente os problemas diagnosticados.

Referências: [Capacitor — configuração e webDir](https://capacitorjs.com/docs/config), [Tauri — Next.js e exportação estática](https://v2.tauri.app/start/frontend/nextjs/).

## 3. Execução técnica

### Passo 1 — reconexão e atualização seguras

Em `next.config.mjs`:

```js
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: false,
  reloadOnOnline: false,
  globPublicPatterns: ["icons/*.png", "manifest.json", "brasao-*-256.png", "*-offline.html", "offline.html"],
  disable: process.env.NODE_ENV === "development",
});
```

`cacheOnNavigation` permanece falso para não adicionar downloads de páginas autenticadas. `sw.js` recebe Cache-Control para revalidação. No worker, `skipWaiting: false` impede substituição automática no meio de uma sessão. Fechar todas as janelas/instâncias antigas permite ativar a nova versão, sem forçar reload durante formulários. Nenhum listener de retomada chama reload ou refresh automático; a reconexão oferece a ação explícita **Atualizar consulta**.

### Passo 2 — cache e shell

`src/app/sw.ts` é a fonte; `public/sw.js` é gerado pelo build, não deve ser editado manualmente.

- Precache dos assets essenciais e páginas offline estáticas.
- CacheFirst em `/_next/static/` e nos ícones/brasões públicos permitidos, limitado a 160 entradas e 30 dias no cache de runtime.
- NetworkOnly para HTML autenticado, RSC, APIs e recursos não permitidos. POST/Server Actions não entram no cache.
- Nunca servir HTML offline a uma requisição RSC/API.
- Limpeza dos caches legados de páginas, dados, imagens privadas e outras origens.
- Shell compartilhado com fallback visual de autenticação e `loading.tsx` para transições. Contadores e alertas são transmitidos por Suspense, sem bloquear o conteúdo principal.
- Safe areas para barra superior/inferior; zoom de acessibilidade permitido.

O shell de consulta autenticada continua sendo renderizado no servidor. O shell estático em disco é a experiência de contingência sem rede; não contém cópias de fichas. [Streaming no Next.js 14](https://nextjs.org/docs/14/app/building-your-application/routing/loading-ui-and-streaming).

### Passo 3 — navegação e estado

Trecho do `public/manifest.json`:

```json
{
  "id": "/",
  "start_url": "/?resume=1",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f7f5f2",
  "theme_color": "#8b1a1f"
}
```

`src/components/app/MobileSession.tsx` integra o ciclo de vida. O módulo `src/modules/mobile-session/` separa validação de domínio de armazenamento no navegador.

```ts
const onVisibility = () => {
  if (document.visibilityState === "hidden") persist();
};
document.addEventListener("visibilitychange", onVisibility);
window.addEventListener("pagehide", persist);
document.addEventListener("freeze", persist);
```

A implementação completa também salva a cada pausa de rolagem, remove listeners e restaura a posição com ResizeObserver enquanto chega conteúdo transmitido pelo servidor.

- `sessionStorage`: última rota/aba e rolagem desta janela.
- `localStorage`: mesmo pequeno snapshot para reabertura pelo ícone (`resume=1`), inclusive quando a janela anterior desapareceu. Não há armazenamento indiscriminado de páginas.
- Validade de 12 horas; identidade inclui usuário, papel e delegações. Mudança de conta/permissão invalida o contexto.
- URLs internas permitidas e parâmetros limitados a metadados de navegação. Tokens, fragmentos, busca livre, senhas, saúde e valores de formulário não são persistidos.
- Logout/tela de login limpam o contexto. Eventos tardios e logout em outra janela não o recriam.
- Links diretos permanecem prioritários: só o lançamento explícito usa a última rota local. O servidor continua validando o destino restaurado.
- Falha/quota de storage não impede uso online. Limpeza do armazenamento pelo navegador/usuário elimina a possibilidade de recuperação.

Ao reconectar com a página ainda viva, formulários permanecem na memória. **Após encerramento do processo, esta entrega restaura navegação, não rascunhos de formulários sensíveis nem todo estado local dos widgets.** Rascunhos exigem política específica por formulário e não foram adicionados silenciosamente.

### Passo 4 — reduzir o trabalho de consulta

`getSession` paraleliza os dados auxiliares depois de autenticar e ler o perfil. As fichas de aluno e Coordenação carregam dados por aba. Exemplo:

```ts
tab === "materiais"
  ? fetchEquipmentChecklist(supabase, studentId)
  : Promise.resolve([]);
```

As validações em Server Actions, RLS e regras dos campos críticos permanecem em vigor. Nenhuma migração ou alteração dos registros foi necessária.

### Passo 5 — build, testes e publicação

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm e2e:pwa
```

`e2e:pwa` executa build e Playwright contra `next start` na porta 3150. O Service Worker fica desativado no `next dev`; testes apenas nesse modo não validam PWA. A suíte específica usa páginas anônimas locais e não altera contas/dados reais.

O fluxo existente publica automaticamente na Vercel a partir de `main`. O CI agora também instala Chromium e executa a suíte de PWA após o build. Abrir com HTTPS, aguardar instalação do worker, fechar todas as instâncias antigas e reabrir. Instalações cujo navegador mantenha o manifest antigo podem precisar recriar o atalho para adotar `resume=1`; a identidade do aplicativo foi preservada (`id: '/'`). Conferir o estado do deploy e o manifest no domínio de produção após a publicação.

### Carregamento rápido: expectativas e aceite

- Retorno sem descarte: mesma tela/DOM, sem navegação de documento ao receber online/visible.
- Retorno após descarte: refazer autenticação/dados necessários, recuperar URL/aba e rolagem quando o armazenamento sobreviver. Exibir placeholders enquanto o conteúdo chega.
- Offline, após instalação: shell estático e consultas previamente salvas de escalas/QTS. As cópias mantêm sua validade existente e podem estar desatualizadas. Fichas completas, saúde, avaliações e escritas exigem rede.
- Não há promessa de carregamento instantâneo universal: primeiro acesso, sessão expirada, conexão lenta, armazenamento removido e consulta privada inédita precisam de trabalho real. IndexedDB adicional para outros conjuntos operacionais só deve armazenar projeções mínimas com identidade, validade e limpeza definidas.
- Medir, em produção/homologação, LCP/INP/TTFB e duração das consultas no celular. Metas iniciais propostas: LCP p75 até 2,5 s e INP p75 até 200 ms; ainda não medidas nesta entrega.

Roteiro nos aparelhos: Android Chrome instalado e iPhone Safari instalado; abrir ficha em uma aba, rolar, alternar aplicativo por 5/30/120 s, alternar Wi-Fi/dados e modo avião, voltar; depois encerrar/reabrir pelo ícone, testar link direto, logout e troca de usuário. No desktop Chromium, `chrome://discards` ajuda a exercitar descarte. Conferir uma atualização com formulário aberto: o worker novo deve esperar, sem apagar campos. Capturar waterfall e `performance.timeOrigin` antes/depois para distinguir retomada de navegação nova. Não registrar CPF, URLs com tokens ou conteúdo de fichas em telemetria.

## Validação realizada

- Build de produção concluído; as fontes do Next precisaram de acesso de rede durante compilação.
- TypeScript e lint aprovados; dois avisos preexistentes de lint em arquivos fora desta mudança.
- `pnpm check`: 537 testes aprovados e 1 ignorado em 87 arquivos; inclui 32 novos testes de URL/expiração/isolamento/cache, ciclo de vida, armazenamento bloqueado e consultas por aba.
- Três testes Playwright com viewport Pixel 7: reconexão sem reload, fallback/cache offline, ausência de fallback HTML para RSC/API.
- Imagem da tela offline inspecionada em viewport mobile.
- Não houve ensaio autenticado em aparelho físico nem medição de performance da produção. Aprovação local não demonstra ausência de encerramento pelo SO.
