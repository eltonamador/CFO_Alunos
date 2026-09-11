import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/components/app/RoleGuard";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants, Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { cn } from "@/lib/utils";
import { getScheduleTypes } from "@/modules/schedule-repository/infrastructure/queries";
import { toggleScheduleTypeAction } from "@/modules/schedule-repository/presentation/actions";
import { CreateScheduleTypeForm } from "./ScheduleTypeForms";

export async function ScheduleTypesPage() {
  await requireRole("coordenacao");
  const types = await getScheduleTypes();
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/coordenacao/escalas"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "mb-3")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao repositório
        </Link>
        <SectionEyebrow>Configuração</SectionEyebrow>
        <h1 className="font-display text-2xl font-bold">Tipos de escala</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cadastre novos tipos ou inative os que não devem aparecer em novas publicações.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]">
        <section className="space-y-3">
          {types.map((type) => (
            <Card key={type.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold">{type.name}</h2>
                  <Badge variant={type.active ? "success" : "outline"}>
                    {type.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                {type.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{type.description}</p>
                )}
              </div>
              <form action={toggleScheduleTypeAction}>
                <input type="hidden" name="id" value={type.id} />
                <input type="hidden" name="active" value={String(!type.active)} />
                <Button type="submit" variant="secondary" size="sm">
                  {type.active ? "Inativar" : "Reativar"}
                </Button>
              </form>
            </Card>
          ))}
        </section>
        <Card className="h-fit p-5">
          <h2 className="mb-4 font-display text-lg font-semibold">Novo tipo</h2>
          <CreateScheduleTypeForm />
        </Card>
      </div>
    </div>
  );
}
