"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateAddressAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import type { StudentAddressRow } from "@/lib/supabase/queries/students";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar endereço"}
    </Button>
  );
}

export function EnderecoTab({
  studentId,
  address,
  naturalityCity,
  naturalityState,
}: {
  studentId: string;
  address: StudentAddressRow | null;
  naturalityCity?: string | null;
  naturalityState?: string | null;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(updateAddressAction, null);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Endereço atual</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="street">Logradouro</Label>
            <Input id="street" name="street" defaultValue={address?.street ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="district">Bairro</Label>
            <Input id="district" name="district" defaultValue={address?.district ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip">CEP</Label>
            <Input id="zip" name="zip" defaultValue={address?.zip ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Input id="city" name="city" defaultValue={address?.city ?? ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">UF</Label>
            <Input id="state" name="state" defaultValue={address?.state ?? ""} maxLength={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="landmark">Ponto de referência</Label>
            <Input id="landmark" name="landmark" defaultValue={address?.landmark ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Origem</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="origin_in_amapa">Reside atualmente no Amapá?</Label>
            <Select id="origin_in_amapa" name="origin_in_amapa" defaultValue={String(address?.origin_in_amapa ?? "true")}>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="from_other_state">Vem de outro estado?</Label>
            <Select id="from_other_state" name="from_other_state" defaultValue={String(address?.from_other_state ?? "false")}>
              <option value="false">Não</option>
              <option value="true">Sim</option>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin_state">Estado de origem</Label>
            <Input id="origin_state" name="origin_state" defaultValue={address?.origin_state ?? ""} maxLength={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="origin_city">Cidade de origem</Label>
            <Input id="origin_city" name="origin_city" defaultValue={address?.origin_city ?? ""} />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Naturalidade</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Município</p>
            <p className="text-sm font-medium">{naturalityCity ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Estado (UF)</p>
            <p className="text-sm font-medium">{naturalityState ?? "—"}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Para alterar a naturalidade, entre em contato com a Coordenação.
        </p>
      </fieldset>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Endereço salvo.</Alert>}

      <SubmitButton />
    </form>
  );
}
