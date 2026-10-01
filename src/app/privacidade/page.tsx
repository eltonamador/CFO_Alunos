import type { Metadata } from "next";
import Link from "next/link";
import { DIARY_PHOTO_RULE } from "@/modules/internship-management/domain/diaryPhoto";

export const metadata: Metadata = {
  title: "Privacidade e uso de imagens",
  description: "Como o CFO Alunos trata fotos do diário de ocorrências.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl space-y-6 px-5 py-10 text-sm leading-relaxed sm:text-base">
      <header className="space-y-2">
        <Link href="/" className="text-primary underline">CFO Alunos</Link>
        <h1 className="font-display text-3xl font-semibold">Privacidade e uso de imagens</h1>
        <p>Informações sobre as fotos anexadas ao diário de ocorrências do CFO Alunos.</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Regra para o envio</h2>
        <p>{DIARY_PHOTO_RULE}</p>
        <p>O aluno precisa confirmar essa regra antes de cada envio. O limite é de três fotos por relato.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Onde ficam as fotos</h2>
        <p>O aplicativo converte a imagem para JPEG, limita o tamanho a 1 MiB e remove metadados do arquivo antes do armazenamento. O arquivo fica em uma pasta privada do Google Drive da conta institucional usada para esta integração. O banco principal guarda o relato, mas não recebe os bytes da foto.</p>
        <p>O aplicativo usa a permissão <code>drive.file</code> para criar e gerenciar os arquivos utilizados nesta integração. As credenciais ficam no servidor, sem exposição ao navegador do aluno.</p>
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-semibold">Quem pode ver e excluir</h2>
        <p>As fotos são servidas por uma rota autenticada do aplicativo, sem link público do Drive. O autor consegue revê-las no próprio relato. A visualização por outros usuários segue a permissão do relato no CFO Alunos, inclusive a coordenação e os colegas quando o relato for compartilhado. Somente o autor pode anexar ou excluir suas fotos pelo aplicativo.</p>
        <p>O autor pode excluir uma foto no diário. Para dúvidas ou solicitação relacionada a imagens, entre em contato com <a className="text-primary underline" href="mailto:bmapbrotherhood@gmail.com">bmapbrotherhood@gmail.com</a>.</p>
      </section>
    </main>
  );
}
