import Image from "next/image";
import { Card, CardContent } from "@/components/ui/Card";
import { AuthorPortrait } from "@/components/app/AuthorPortrait";
import { APP_INFO } from "@/lib/app-info";

export const metadata = { title: "Sobre o aplicativo" };

/** Rótulo cinza em caixa alta — padrão de todos os campos desta tela. */
const LABEL = "section-eyebrow text-muted-foreground";

export default function SobrePage() {
  const { author } = APP_INFO;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <p className={LABEL}>Sobre</p>
        <h1 className="mt-1 font-display text-2xl font-bold tracking-tight sm:text-3xl">
          Sobre o aplicativo
        </h1>
      </header>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 p-6 pt-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
          <AuthorPortrait
            src={author.photo}
            alt={`Retrato do ${author.name}`}
            initials={author.initials}
            framing={author.portraitFraming}
            className="h-32 w-32 sm:h-36 sm:w-36"
          />

          <div className="min-w-0 flex-1">
            <p className={LABEL}>Criado e desenvolvido por</p>
            <p className="mt-1.5 font-display text-2xl font-bold leading-tight text-foreground">
              {author.name}
            </p>
            <p className="mt-1 text-sm font-semibold text-brand-gold-700 dark:text-brand-gold-300">
              {author.organization}
            </p>
            <p className="mt-4 border-t border-border pt-4 text-sm leading-relaxed text-foreground/80">
              {APP_INFO.description}
            </p>
          </div>
        </CardContent>
      </Card>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
        <div>
          <dt className={LABEL}>Aplicativo</dt>
          <dd className="mt-1 text-sm leading-snug text-foreground">{APP_INFO.name}</dd>
        </div>
        <div>
          <dt className={LABEL}>Identificação</dt>
          <dd className="mt-1 text-sm leading-snug text-foreground">{APP_INFO.identifier}</dd>
        </div>
        <div>
          <dt className={LABEL}>Versão</dt>
          <dd className="num-mono mt-1 text-sm leading-snug text-foreground">{APP_INFO.version}</dd>
        </div>
        <div>
          <dt className={LABEL}>Ano</dt>
          <dd className="num-mono mt-1 text-sm leading-snug text-foreground">{APP_INFO.year}</dd>
        </div>
      </dl>

      <footer className="flex flex-col items-center gap-2 border-t border-border pt-5 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-2">
          <Image
            src="/brasao-abm.png"
            alt=""
            width={18}
            height={18}
            className="object-contain opacity-60"
            draggable={false}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {APP_INFO.identifier} · {APP_INFO.organization}
          </p>
        </div>
        <p className="num-mono text-[11px] text-muted-foreground">
          Versão {APP_INFO.version} · {APP_INFO.year}
        </p>
      </footer>
    </div>
  );
}
