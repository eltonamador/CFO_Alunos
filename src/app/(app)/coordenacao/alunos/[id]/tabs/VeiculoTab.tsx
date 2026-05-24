"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  updateVehicleAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Select } from "@/components/ui/Select";
import type { StudentVehicleRow } from "@/lib/supabase/queries/students";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : "Salvar veículo/CNH"}
    </Button>
  );
}

export function VeiculoTab({
  studentId,
  vehicle,
}: {
  studentId: string;
  vehicle: StudentVehicleRow | null;
}) {
  const [state, formAction] = useFormState<ActionResult | null, FormData>(
    updateVehicleAction,
    null,
  );

  const [hasVehicle, setHasVehicle] = React.useState(vehicle?.has_vehicle ?? false);
  const [hasCnh, setHasCnh] = React.useState(vehicle?.has_cnh ?? false);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Veículo próprio</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="has_vehicle">Possui veículo?</Label>
            <Select
              id="has_vehicle"
              name="has_vehicle"
              defaultValue={vehicle?.has_vehicle == null ? "" : String(vehicle.has_vehicle)}
              onChange={(e) => setHasVehicle(e.target.value === "true")}
            >
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </div>

          {hasVehicle && (
            <>
              <div className="space-y-2">
                <Label htmlFor="vehicle_type">Tipo de veículo</Label>
                <Select
                  id="vehicle_type"
                  name="vehicle_type"
                  defaultValue={vehicle?.vehicle_type ?? ""}
                >
                  <option value="">Selecione</option>
                  <option value="carro">Carro</option>
                  <option value="moto">Moto</option>
                  <option value="caminhonete">Caminhonete</option>
                  <option value="outro">Outro</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plate">Placa</Label>
                <Input
                  id="plate"
                  name="plate"
                  defaultValue={vehicle?.plate ?? ""}
                  placeholder="AAA-0000 ou AAA0A00"
                  className="uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="available_for_deployment">
                  Disponível para apoio operacional?
                </Label>
                <Select
                  id="available_for_deployment"
                  name="available_for_deployment"
                  defaultValue={
                    vehicle?.available_for_deployment == null
                      ? "false"
                      : String(vehicle.available_for_deployment)
                  }
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </Select>
              </div>
            </>
          )}

          {/* Hidden fields when vehicle is hidden to avoid stale form values */}
          {!hasVehicle && (
            <>
              <input type="hidden" name="vehicle_type" value="" />
              <input type="hidden" name="plate" value="" />
              <input type="hidden" name="available_for_deployment" value="false" />
            </>
          )}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">CNH — Carteira Nacional de Habilitação</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="has_cnh">Possui CNH?</Label>
            <Select
              id="has_cnh"
              name="has_cnh"
              defaultValue={vehicle?.has_cnh == null ? "" : String(vehicle.has_cnh)}
              onChange={(e) => setHasCnh(e.target.value === "true")}
            >
              <option value="">Não informado</option>
              <option value="true">Sim</option>
              <option value="false">Não</option>
            </Select>
          </div>

          {hasCnh && (
            <>
              <div className="space-y-2">
                <Label htmlFor="cnh_category">Categoria</Label>
                <Select
                  id="cnh_category"
                  name="cnh_category"
                  defaultValue={vehicle?.cnh_category ?? ""}
                >
                  <option value="">Selecione</option>
                  <option value="A">A — Moto</option>
                  <option value="B">B — Carro</option>
                  <option value="AB">AB — Moto e Carro</option>
                  <option value="C">C — Caminhão</option>
                  <option value="D">D — Ônibus</option>
                  <option value="E">E — Carreta</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnh_valid_until">Validade da CNH</Label>
                <Input
                  id="cnh_valid_until"
                  name="cnh_valid_until"
                  type="date"
                  defaultValue={vehicle?.cnh_valid_until ?? ""}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnh_attached">CNH anexada ao sistema?</Label>
                <Select
                  id="cnh_attached"
                  name="cnh_attached"
                  defaultValue={
                    vehicle?.cnh_attached == null ? "false" : String(vehicle.cnh_attached)
                  }
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </Select>
              </div>
            </>
          )}

          {!hasCnh && (
            <>
              <input type="hidden" name="cnh_category" value="" />
              <input type="hidden" name="cnh_valid_until" value="" />
              <input type="hidden" name="cnh_attached" value="false" />
            </>
          )}
        </div>
      </fieldset>

      {state?.ok === false && <Alert variant="destructive">{state.error}</Alert>}
      {state?.ok && <Alert variant="success">Dados de veículo/CNH salvos.</Alert>}

      <SubmitButton />
    </form>
  );
}
