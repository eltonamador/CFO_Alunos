"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateLogisticsAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import type { StudentLogisticsRow } from "@/lib/supabase/queries/students";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar logística"}
    </Button>
  );
}

export function LogisticaTab({
  studentId,
  logistics,
}: {
  studentId: string;
  logistics: StudentLogisticsRow | null;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    updateLogisticsAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Moradia durante o curso</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="has_fixed_residence_macapa">
              Possui residência fixa em Macapá?
            </Label>
            <Select
              id="has_fixed_residence_macapa"
              name="has_fixed_residence_macapa"
              defaultValue={
                logistics?.has_fixed_residence_macapa == null
                  ? ""
                  : String(logistics.has_fixed_residence_macapa)
              }
            >
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="needs_housing">Necessita de alojamento no quartel?</Label>
            <Select
              id="needs_housing"
              name="needs_housing"
              defaultValue={
                logistics?.needs_housing == null ? "" : String(logistics.needs_housing)
              }
            >
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="course_address">Endereço durante o curso (se diferente)</Label>
            <Input
              id="course_address"
              name="course_address"
              defaultValue={logistics?.course_address ?? ""}
              placeholder="Rua, Bairro, Cidade"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Família e contato local</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="has_family_in_ap">Tem familiar residente no Amapá?</Label>
            <Select
              id="has_family_in_ap"
              name="has_family_in_ap"
              defaultValue={
                logistics?.has_family_in_ap == null ? "" : String(logistics.has_family_in_ap)
              }
            >
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="local_contact">Contato local (nome e telefone)</Label>
            <Input
              id="local_contact"
              name="local_contact"
              defaultValue={logistics?.local_contact ?? ""}
              placeholder="Nome — (96) 9XXXX-XXXX"
            />
          </div>
        </div>
      </fieldset>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Logística salva.</Alert>}

      <SubmitButton />
    </form>
  );
}
