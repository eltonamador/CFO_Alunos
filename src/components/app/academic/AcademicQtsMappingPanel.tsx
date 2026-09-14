"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import type { InstructionSession, OfferingView } from "@/modules/academic-management/application/types";

function MappingForm({ session, offerings }: { session: InstructionSession; offerings: OfferingView[] }) {
  const [classification, setClassification] = useState<"instruction" | "non_instruction">("instruction");
  const [offeringId, setOfferingId] = useState("");
  const compatible = offerings.filter(
    (offering) => offering.class_id === session.class_id && offering.academic_year_id === session.academic_year_id,
  );

  return (
    <AcademicActionForm
      operation="map_qts_session"
      hidden={{
        session_id: session.id,
        expected_revision: session.revision,
        offering_id: classification === "instruction" ? offeringId : "",
      }}
      submitLabel="Salvar classificação"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <AcademicField label="Classificação">
          <Select
            name="classification"
            value={classification}
            onChange={(event) => {
              const next = event.target.value as "instruction" | "non_instruction";
              setClassification(next);
              if (next === "non_instruction") setOfferingId("");
            }}
          >
            <option value="instruction">Instrução</option>
            <option value="non_instruction">Atividade não instrucional</option>
          </Select>
        </AcademicField>
        <AcademicField label="Oferta da disciplina">
          <Select
            value={offeringId}
            onChange={(event) => setOfferingId(event.target.value)}
            disabled={classification === "non_instruction"}
            required={classification === "instruction"}
          >
            <option value="">{classification === "instruction" ? "Selecione a disciplina" : "Não se aplica"}</option>
            {compatible.map((offering) => (
              <option key={offering.id} value={offering.id}>
                {offering.discipline.name}
              </option>
            ))}
          </Select>
        </AcademicField>
      </div>
      {classification === "instruction" && !compatible.length && (
        <p className="text-sm text-destructive">
          Não há oferta deste ano letivo para esta turma. Vincule ou crie a oferta antes de classificar a instrução.
        </p>
      )}
      <AcademicField label="Motivo ou referência">
        <Input name="reason" minLength={5} required defaultValue="Vínculo conferido pela coordenação" />
      </AcademicField>
    </AcademicActionForm>
  );
}

export function AcademicQtsMappingPanel({
  sessions,
  offerings,
}: {
  sessions: InstructionSession[];
  offerings: OfferingView[];
}) {
  const pending = sessions.filter((item) => item.classification === "unmapped" && item.status === "planned");
  if (!pending.length) return null;

  return (
    <section className="space-y-3" aria-labelledby="qts-mapping-title">
      <div>
        <h2 id="qts-mapping-title" className="font-display text-xl font-semibold">
          Vínculos pendentes do QTS
        </h2>
        <p className="text-sm text-muted-foreground">
          O QTS cria o planejamento. Escolha a disciplina ou classifique a atividade como não instrucional antes de ela entrar no diário.
        </p>
      </div>
      {pending.map((session) => (
        <Card key={session.id} className="p-4">
          <p className="font-semibold">
            {session.scheduled_on.split("-").reverse().join("/")} · {session.title}
          </p>
          <p className="mb-3 text-sm text-muted-foreground">
            {session.planned_starts_at}–{session.planned_ends_at} · {session.planned_hours.toFixed(2).replace(".", ",")} h/a
          </p>
          {!session.planned_starts_at && (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
              Horário pendente de complementação: a carga só será apurada após o horário real ser informado e validado.
            </p>
          )}
          <MappingForm session={session} offerings={offerings} />
        </Card>
      ))}
    </section>
  );
}
