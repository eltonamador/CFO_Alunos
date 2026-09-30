import { Button } from "@/components/ui/Button";
import { HandoverForm } from "./HandoverForm";
import {
  cancelInternshipAssignmentAction,
  rescheduleInternshipAssignmentAction,
  substituteInternshipAssignmentAction,
} from "./actions";

type Resource = {
  id: string;
  site_id: string;
  resource_type: string;
};

type Site = {
  id: string;
  name: string;
};

type Cadet = {
  id: string;
  student_number: number | null;
  war_name: string;
};

type Props = {
  assignmentId: string;
  studentId: string;
  canRemap: boolean;
  hasExecution: boolean;
  approvedMinutes: number | null;
  plannedMinutes: number;
  startsOn: string;
  endsOn: string;
  startsAt: string;
  endsAt: string;
  handedOver: boolean;
  resources: Resource[];
  gbms: Site[];
  cadets: Cadet[];
  requiresApproval: boolean;
};

const inputClass = "h-11 w-full rounded-md border border-input bg-background px-3";

export function AssignmentMovementForms(props: Props) {
  if (props.handedOver) return <p className="text-sm text-muted-foreground">Período encerrado por passagem de serviço. Confira e homologue a ficha individual.</p>;
  if (!props.hasExecution && Date.parse(props.startsAt) < Date.now())
    return <HandoverForm {...props} now={new Date().toISOString()} />;
  const canCreateReplacement =
    props.hasExecution &&
    props.approvedMinutes !== null &&
    props.approvedMinutes < props.plannedMinutes;

  return (
    <div className="space-y-2 border-t pt-3">
      <p className="font-medium">Movimentação da escala</p>
      {props.requiresApproval && <p className="text-xs text-muted-foreground">Substituições e remanejamentos solicitados por você só alteram a escala após homologação da Coordenação.</p>}
      {!props.hasExecution ? (
        <div className="grid gap-2 lg:grid-cols-3">
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-medium">Cancelar participação</summary>
            <form action={cancelInternshipAssignmentAction} className="mt-3 space-y-3">
              <HiddenIds assignmentId={props.assignmentId} studentId={props.studentId} />
              <ReasonInput label="Motivo do cancelamento" />
              <Button type="submit" variant="destructive" size="sm">
                Confirmar cancelamento
              </Button>
            </form>
          </details>
          <details className="rounded-md border p-3">
            <summary className="cursor-pointer font-medium">Substituir cadete</summary>
            <form action={substituteInternshipAssignmentAction} className="mt-3 space-y-3">
              <HiddenIds assignmentId={props.assignmentId} studentId={props.studentId} />
              <label className="space-y-1">
                <span className="text-xs font-medium">Novo cadete</span>
                <select name="newStudentId" required defaultValue="" className={inputClass}>
                  <option value="" disabled>
                    Selecione
                  </option>
                  {props.cadets
                    .filter((cadet) => cadet.id !== props.studentId)
                    .map((cadet) => (
                      <option key={cadet.id} value={cadet.id}>
                        {cadet.war_name} — {String(cadet.student_number ?? "").padStart(2, "0")}
                      </option>
                    ))}
                </select>
              </label>
              <ReasonInput label="Motivo da substituição" />
              <Button type="submit" variant="outline" size="sm">
                {props.requiresApproval ? "Solicitar homologação" : "Confirmar substituição"}
              </Button>
            </form>
          </details>
          {props.canRemap ? (
            <GbmMovementForm {...props} source="remanejamento" />
          ) : (
            <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
              Em guarda-vida, utilize a substituição no mesmo posto. O remanejamento para novo turno
              está disponível inicialmente para plantões em GBM.
            </div>
          )}
        </div>
      ) : canCreateReplacement ? (
        <GbmMovementForm {...props} source="reposicao" />
      ) : (
        <p className="text-xs text-muted-foreground">
          A participação já possui execução e não pode ser cancelada ou substituída. Não há déficit
          deste plantão que permita criar reposição.
        </p>
      )}
    </div>
  );
}

function GbmMovementForm(props: Props & { source: "remanejamento" | "reposicao" }) {
  const remap = props.source === "remanejamento";
  return (
    <details className="rounded-md border p-3">
      <summary className="cursor-pointer font-medium">
        {remap ? "Remanejar para novo plantão GBM" : "Criar plantão de reposição em GBM"}
      </summary>
      <form
        action={rescheduleInternshipAssignmentAction}
        className="mt-3 grid gap-3 md:grid-cols-2"
      >
        <HiddenIds assignmentId={props.assignmentId} studentId={props.studentId} />
        <input type="hidden" name="source" value={props.source} />
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium">GBM e modalidade</span>
          <select name="resourceId" required defaultValue="" className={inputClass}>
            <option value="" disabled>
              Selecione
            </option>
            {props.resources.map((resource) => (
              <option key={resource.id} value={resource.id}>
                {props.gbms.find((site) => site.id === resource.site_id)?.name ?? "GBM"} ·{" "}
                {resource.resource_type.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Nova data</span>
          <input
            type="date"
            name="shiftDate"
            min={props.startsOn}
            max={props.endsOn}
            required
            className={inputClass}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Horário inicial</span>
          <input type="time" name="shiftTime" required className={inputClass} />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium">Jornada</span>
          <select name="durationMinutes" defaultValue={String(props.plannedMinutes === 1440 ? 1440 : 720)} className={inputClass}>
            <option value="720">12 horas</option>
            <option value="1440">24 horas (AR no fim de semana)</option>
          </select>
        </label>
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-medium">Oficial responsável pelo serviço (opcional)</span>
          <input name="supervisorName" minLength={3} maxLength={120} className={inputClass} />
        </label>
        <div className="md:col-span-2">
          <ReasonInput label={remap ? "Motivo do remanejamento" : "Motivo da reposição"} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" variant="outline" size="sm">
            {remap ? props.requiresApproval ? "Solicitar homologação" : "Confirmar remanejamento" : "Criar reposição"}
          </Button>
        </div>
      </form>
    </details>
  );
}

function HiddenIds({ assignmentId, studentId }: { assignmentId: string; studentId: string }) {
  return (
    <>
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <input type="hidden" name="studentId" value={studentId} />
    </>
  );
}

function ReasonInput({ label }: { label: string }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium">{label}</span>
      <input name="reason" minLength={5} maxLength={500} required className={inputClass} />
    </label>
  );
}
