import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import type { DisciplineAlias } from "@/modules/academic-management/application/types";

export function AcademicDisciplineAliases({
  disciplineId,
  aliases,
  canManage,
}: {
  disciplineId: string;
  aliases: DisciplineAlias[];
  canManage: boolean;
}) {
  return (
    <Card className="space-y-3 p-4">
      <div>
        <h3 className="font-semibold">Aliases para reconhecimento do QTS</h3>
        <p className="text-sm text-muted-foreground">
          O vínculo automático usa correspondências exatas normalizadas. Adicione a sigla usada no quadro semanal quando necessário.
        </p>
      </div>
      {aliases.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {aliases.filter((item) => item.active).map((item) => (
            <li key={item.id} className="rounded-full bg-muted px-3 py-1">{item.alias}</li>
          ))}
        </ul>
      )}
      {canManage && (
        <AcademicActionForm operation="save_discipline_alias" hidden={{ discipline_id: disciplineId }} submitLabel="Adicionar alias">
          <AcademicField label="Título ou sigla no QTS">
            <Input name="alias" minLength={2} required placeholder="Ex.: CIU - I" />
          </AcademicField>
        </AcademicActionForm>
      )}
    </Card>
  );
}
