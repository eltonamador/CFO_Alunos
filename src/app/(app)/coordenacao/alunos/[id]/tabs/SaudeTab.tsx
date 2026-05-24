"use client";

import { useFormState, useFormStatus } from "react-dom";
import {
  updateHealthAction,
  updateOperationalSummaryAction,
  type ActionResult,
} from "@/modules/student-profile/presentation/actions/studentActions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Alert } from "@/components/ui/Alert";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import type { HealthRestrictionRow } from "@/lib/supabase/queries/students";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Salvando..." : label}
    </Button>
  );
}

interface Props {
  studentId: string;
  health: HealthRestrictionRow | null;
  /** Se true (Coordenação), exibe formulário para editar o resumo operacional. */
  canCurate?: boolean;
}

export function SaudeTab({ studentId, health, canCurate = false }: Props) {
  const [healthState, healthAction] = useFormState<ActionResult | null, FormData>(
    updateHealthAction,
    null,
  );
  const [summaryState, summaryAction] = useFormState<ActionResult | null, FormData>(
    updateOperationalSummaryAction,
    null,
  );

  const validationBadge = () => {
    if (!health) return <Badge variant="outline">Sem registro</Badge>;
    if (health.validation_status === "validado") return <Badge variant="success">Validado</Badge>;
    if (health.validation_status === "recusado") return <Badge variant="destructive">Recusado</Badge>;
    return <Badge variant="warning">Aguardando validação</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Dados clínicos</CardTitle>
            <CardDescription>
              Dados sensíveis — vistos apenas pela Coordenação e pelo próprio aluno.
            </CardDescription>
          </div>
          {validationBadge()}
        </CardHeader>
        <CardContent>
          <form action={healthAction} className="space-y-4">
            <input type="hidden" name="studentId" value={studentId} />

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="blood_type">Tipo sanguíneo</Label>
                <Select id="blood_type" name="blood_type" defaultValue={health?.blood_type ?? ""}>
                  <option value="">—</option>
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rh_factor">Fator RH</Label>
                <Select id="rh_factor" name="rh_factor" defaultValue={health?.rh_factor ?? ""}>
                  <option value="">—</option>
                  <option value="+">+</option>
                  <option value="-">-</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="altura_cm">Altura (cm)</Label>
                <Input
                  id="altura_cm"
                  name="altura_cm"
                  type="number"
                  min={100}
                  max={230}
                  placeholder="Ex: 175"
                  defaultValue={health?.altura_cm ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="peso_kg">Peso (kg)</Label>
                <Input
                  id="peso_kg"
                  name="peso_kg"
                  type="number"
                  min={30}
                  max={300}
                  step="0.1"
                  placeholder="Ex: 72.5"
                  defaultValue={health?.peso_kg ?? ""}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="uses_glasses">Usa óculos / lente?</Label>
                <Select
                  id="uses_glasses"
                  name="uses_glasses"
                  defaultValue={String(health?.uses_glasses ?? false)}
                >
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cirurgia_ocular">Fez cirurgia ocular de grau?</Label>
                <Select
                  id="cirurgia_ocular"
                  name="cirurgia_ocular"
                  defaultValue={health?.cirurgia_ocular == null ? "" : String(health.cirurgia_ocular)}
                >
                  <option value="">—</option>
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cirurgia_ocular_obs">Observação sobre cirurgia ocular</Label>
              <Textarea
                id="cirurgia_ocular_obs"
                name="cirurgia_ocular_obs"
                placeholder="Descreva o tipo, data ou outras informações relevantes"
                defaultValue={health?.cirurgia_ocular_obs ?? ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="allergies">Alergias</Label>
              <Textarea id="allergies" name="allergies" defaultValue={health?.allergies ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="continuous_medication">Medicamento contínuo</Label>
              <Textarea
                id="continuous_medication"
                name="continuous_medication"
                defaultValue={health?.continuous_medication ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="chronic_disease">Doença crônica relevante</Label>
              <Textarea
                id="chronic_disease"
                name="chronic_disease"
                defaultValue={health?.chronic_disease ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="physical_restriction">Restrição física</Label>
              <Textarea
                id="physical_restriction"
                name="physical_restriction"
                defaultValue={health?.physical_restriction ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dietary_restriction">Restrição alimentar</Label>
              <Textarea
                id="dietary_restriction"
                name="dietary_restriction"
                defaultValue={health?.dietary_restriction ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medical_notes">Observação médica</Label>
              <Textarea id="medical_notes" name="medical_notes" defaultValue={health?.medical_notes ?? ""} />
            </div>

            {healthState?.ok === false && <Alert variant="destructive">{healthState.error}</Alert>}
            {healthState?.ok && (
              <Alert variant="success">
                Dados salvos. Aguardando validação da Coordenação.
              </Alert>
            )}

            <Submit label="Salvar dados clínicos" />
          </form>
        </CardContent>
      </Card>

      {canCurate && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo operacional (visível ao Instrutor)</CardTitle>
            <CardDescription>
              Texto curto e operacional. NÃO inclua diagnóstico. Será o único campo de saúde
              exposto ao Instrutor no card rápido.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={summaryAction} className="space-y-3">
              <input type="hidden" name="studentId" value={studentId} />
              <Textarea
                name="operational_summary"
                defaultValue={health?.operational_summary ?? ""}
                maxLength={300}
                placeholder='Ex.: "Sem mergulho", "Sem corrida prolongada"'
              />
              {summaryState?.ok === false && <Alert variant="destructive">{summaryState.error}</Alert>}
              {summaryState?.ok && <Alert variant="success">Resumo atualizado.</Alert>}
              <Submit label="Salvar resumo operacional" />
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
