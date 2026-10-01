# Fotos no diário de ocorrências — plano de implantação

## Decisões de produto

- As fotos são anexos do relato pessoal e extraoficial. Não constituem prova oficial, avaliação, homologação de horas ou registro operacional do CBMAP.
- O autor pode anexar até três fotos a um relato já salvo. O texto do diário continua no Supabase; os bytes das imagens e sua organização ficam no Google Drive. Não é necessária uma tabela de fotos.
- A pasta raiz é configurada no servidor. Cada relato tem uma subpasta com seu UUID; os arquivos recebem nomes aleatórios. O aplicativo consulta a pasta para listar anexos.
- O acesso a cada foto segue o relato: autor sempre; Coordenação apenas depois de salvo; colegas da mesma turma apenas quando compartilhado e visível. Instrutor e Secretaria não têm acesso.
- No primeiro lançamento, fotos não são incluídas no PDF pessoal. O PDF continua apenas com o texto.

## Regra visível ao cadete

> Anexe apenas fotos feitas no contexto do seu plantão e cuja divulgação você esteja autorizado a fazer. Não envie imagens que identifiquem vítimas, pacientes ou terceiros, nem rostos, placas, documentos, endereços, dados de saúde ou cenas íntimas. Antes de compartilhar o relato com a turma, confira também as fotos: elas aparecerão no mural. Se houver dúvida sobre uma imagem, não a envie. O diário é pessoal e extraoficial; o upload não substitui os canais oficiais de registro de ocorrência.

Essa orientação deve aparecer junto ao seletor de fotos e novamente antes de compartilhar um relato com fotos. O cadete deve confirmar que leu a regra. A Coordenação pode ocultar do mural o relato e todas as fotos; exclusão do relato deve remover os anexos da pasta externa.

## Integração com Google Drive

1. Definir uma conta Google responsável e conferir sua permissão de edição na pasta raiz. Para uso permanente, preferir Drive compartilhado institucional. Uma pasta pessoal requer OAuth de uma conta humana; uma conta de serviço Google não possui cota própria para criar arquivos em `Meu Drive`.
2. Guardar credenciais e ID da pasta em variáveis protegidas do servidor, nunca no cliente ou no repositório. Ter uma configuração para habilitar/desabilitar o recurso, limites e estado da conexão.
3. Após autenticar o cadete e confirmar que ele é o autor, o servidor cria ou localiza a subpasta do relato e inicia uma sessão de upload temporária. O navegador comprime a foto e envia diretamente ao Drive. O servidor confirma arquivo, tipo e tamanho antes de mostrá-lo.
4. Para listar ou entregar uma foto, o servidor consulta o relato sob a sessão do usuário e aplica a mesma regra de visibilidade do diário. Pastas e arquivos não recebem permissão pública nem links permanentes.
5. Limitar a JPEG/WebP/PNG, três fotos por relato e aproximadamente 1 MiB por imagem após redução no navegador; rejeitar conteúdo inválido no servidor. Remover metadados EXIF, inclusive localização, na conversão. Mostrar progresso, erro e opção de tentar novamente.
6. Ao excluir uma foto ou relato, remover os arquivos no Drive. Registrar falhas de limpeza para reconciliação. Testar revogação após retirar do mural e após ocultação pela Coordenação.

A API do Google Drive oferece upload retomável, inclusive para conexões móveis. A sessão de upload expira após uma semana; o primeiro protótipo deve confirmar no navegador do aplicativo que o envio direto funciona com a política de CORS e sem expor o token OAuth da conta responsável. Fontes: [upload de arquivos](https://developers.google.com/workspace/drive/api/guides/manage-uploads), [contas de serviço e cota](https://developers.google.com/workspace/drive/api/guides/handle-errors) e [permissões de compartilhamento](https://developers.google.com/workspace/drive/api/guides/manage-sharing).

## Verificação da pasta recebida

- O ID da pasta foi fornecido pelo responsável e deve ficar apenas na configuração protegida do servidor.
- Em 30/09/2026, a pasta abriu no navegador e apareceu vazia. A janela de compartilhamento indicou **“Qualquer pessoa na Internet com o link pode ver”** e ofereceu **“Pedir para compartilhar”**. Portanto, o link permite leitura, mas a conta conectada não tem escrita confirmada. A consulta de metadados pelo conector não retornou proprietário nem capacidades de escrita.
- É preciso conectar a conta Google indicada pelo responsável, restringir o acesso geral da pasta e confirmar a permissão de escrita antes de enviar fotos. A pasta com acesso por link não deve receber imagens de ocorrências.

## Conta Boris

- Um usuário de teste precisa de identidade separada dos 30 cadetes e não pode entrar nas listas, contagens, escalas, relatórios nem no quadro oficial.
- O usuário solicitou acesso no aplicativo publicado. A proposta implementada marca Boris como teste e usa situação administrativa `outro`, fora do efetivo operacional. Ele permanece vinculado à turma oficial para poder inspecionar o mural e a experiência do aluno. Políticas RLS e views ocultam a ficha de teste das consultas oficiais; o diário impede que relatos e reações de teste afetem o mural dos cadetes reais. O provisionamento exige e-mail de login próprio e validação no ambiente publicado.
- Em 30/09/2026, o login de Boris foi provisionado no Supabase de produção após a migration `0130`. O login por senha e a leitura da própria ficha foram verificados por API. O e-mail e a senha temporária são entregues diretamente ao responsável e não constam neste repositório.
- Não incluir senha fixa em seed versionado nem adicionar Boris ao seed dos 30 alunos oficiais.

## Critérios de aceite

- Dois tipos e duas viaturas aparecem no formulário, no relato, nos filtros, nas insígnias e no PDF; registros antigos conservam a única etiqueta anterior.
- Foto de rascunho não aparece para a Coordenação; foto de relato pessoal não aparece para colegas; foto de relato compartilhado aparece só para colegas da turma. Ocultação e retirada do mural revogam acesso às fotos em nova requisição.
- O banco principal não recebe bytes da imagem; o deploy não contém credenciais. Upload de celular não passa pelo limite de corpo da função Vercel.
- Boris consegue autenticar e testar seu portal, sem alterar indicadores oficiais.

## Estado da implantação em 30/09/2026

- Etiquetas múltiplas e isolamento de Boris: publicados no aplicativo; migrations `0129` e `0130` aplicadas. Os 47 testes SQL específicos do diário passaram no banco local, bem como 501 testes Vitest e a build de produção.
- Fotos: planejamento concluído; nenhum upload implementado ou realizado. A pasta fornecida ainda permite leitura por link e a conta de integração precisa ser autenticada e configurada para escrita privada.
