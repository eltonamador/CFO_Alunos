"use client";

import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import type {
  AcademicCalendarEvent,
  AcademicClass,
  AcademicCourse,
  AcademicYear,
  OfferingView,
} from "@/modules/academic-management/application/types";

const eventLabel: Record<AcademicCalendarEvent["event_type"], string> = {
  holiday: "Feriado",
  recess: "Recesso",
  suspension: "Suspensão",
  institutional: "Atividade institucional",
  class_exception: "Exceção de turma",
};

function dateLabel(value: string) {
  return value.split("-").reverse().join("/");
}

export function AcademicCalendarPanel({
  canManage,
  courses,
  classes,
  years,
  events,
  offerings,
}: {
  canManage: boolean;
  courses: AcademicCourse[];
  classes: AcademicClass[];
  years: AcademicYear[];
  events: AcademicCalendarEvent[];
  offerings: OfferingView[];
}) {
  const [yearId, setYearId] = useState(years[0]?.id ?? "");
  const selectedYear = years.find((item) => item.id === yearId) ?? null;
  const yearEvents = useMemo(
    () => events.filter((item) => item.academic_year_id === yearId).sort((a, b) => a.event_date.localeCompare(b.event_date)),
    [events, yearId],
  );
  const course = selectedYear ? courses.find((item) => item.id === selectedYear.course_id) : null;
  const yearClasses = selectedYear
    ? classes.filter((item) => item.course_id === selectedYear.course_id)
    : [];
  const unlinked = selectedYear
    ? offerings.filter(
        (item) => item.class_id && yearClasses.some((entry) => entry.id === item.class_id) && !item.academic_year_id,
      )
    : [];

  return (
    <section className="space-y-4" aria-labelledby="academic-calendar-title">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="academic-calendar-title" className="font-display text-xl font-semibold">
            Calendário letivo
          </h2>
          <p className="text-sm text-muted-foreground">
            Dias bloqueados não entram na cadência das disciplinas. A hora-aula é de 50 minutos.
          </p>
        </div>
        {years.length > 0 && (
          <label className="min-w-64 text-sm font-medium">
            Ano letivo
            <Select value={yearId} onChange={(event) => setYearId(event.target.value)} className="mt-1">
              {years.map((item) => {
                const itemCourse = courses.find((course) => course.id === item.course_id);
                return (
                  <option key={item.id} value={item.id}>
                    {itemCourse?.name ?? "Curso"} · {item.year} · {item.status}
                  </option>
                );
              })}
            </Select>
          </label>
        )}
      </div>

      {!years.length && (
        <Alert>
          Nenhum calendário acadêmico foi cadastrado. Crie o ano letivo com a referência oficial antes
          de vincular ofertas ou publicar o próximo QTS.
        </Alert>
      )}

      {selectedYear && (
        <Card className="space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold">
                {course?.name ?? "Curso"} · {selectedYear.year}
              </p>
              <p className="text-sm text-muted-foreground">
                {dateLabel(selectedYear.starts_on)} a {dateLabel(selectedYear.ends_on)} · {selectedYear.source_ref}
              </p>
            </div>
            <Badge variant={selectedYear.status === "open" ? "success" : selectedYear.status === "closed" ? "default" : "warning"}>
              {selectedYear.status === "open" ? "Aberto" : selectedYear.status === "closed" ? "Fechado" : "Rascunho"}
            </Badge>
          </div>
          {!selectedYear.source_verified && (
            <Alert>
              A referência oficial ainda não foi conferida. O calendário não pode ser aberto para lançamentos.
            </Alert>
          )}
          {canManage && selectedYear.status === "open" && (
            <AcademicActionForm
              operation="close_academic_year"
              hidden={{ academic_year_id: selectedYear.id }}
              submitLabel="Fechar ano letivo"
            >
              <AcademicField label="Motivo do fechamento">
                <Input name="reason" minLength={5} required placeholder="Conferência final do período" />
              </AcademicField>
            </AcademicActionForm>
          )}
          {canManage && selectedYear.status === "draft" && (
            <div className="space-y-3">
              <details className="rounded-md border border-border p-3">
                <summary className="cursor-pointer font-medium">Corrigir rascunho do calendário</summary>
                <div className="mt-3">
                  <AcademicActionForm
                    operation="update_academic_year"
                    hidden={{ academic_year_id: selectedYear.id, expected_revision: selectedYear.revision }}
                    submitLabel="Salvar correção"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <AcademicField label="Início">
                        <Input name="starts_on" type="date" required defaultValue={selectedYear.starts_on} />
                      </AcademicField>
                      <AcademicField label="Término">
                        <Input name="ends_on" type="date" required defaultValue={selectedYear.ends_on} />
                      </AcademicField>
                      <AcademicField label="Documento de referência">
                        <Input name="source_ref" minLength={5} required defaultValue={selectedYear.source_ref} />
                      </AcademicField>
                      <AcademicField label="Motivo da correção">
                        <Input name="reason" minLength={5} required defaultValue="Atualização do calendário provisório" />
                      </AcademicField>
                      <div className="space-y-2 text-sm font-medium">
                        <span>Referência oficial</span>
                        <label className="flex items-start gap-2 text-sm font-normal text-muted-foreground">
                          <input
                            aria-label="Referência oficial conferida"
                            name="source_verified"
                            type="checkbox"
                            value="true"
                            defaultChecked={selectedYear.source_verified}
                          />
                          Confirmo que o documento de referência foi conferido pela coordenação.
                        </label>
                      </div>
                    </div>
                  </AcademicActionForm>
                </div>
              </details>
              <AcademicActionForm
                operation="open_academic_year"
                hidden={{ academic_year_id: selectedYear.id }}
                submitLabel="Abrir para lançamentos"
                disabled={!selectedYear.source_verified}
              >
                <AcademicField label="Motivo da abertura">
                  <Input name="reason" minLength={5} required defaultValue="Calendário conferido pela coordenação" />
                </AcademicField>
              </AcademicActionForm>
            </div>
          )}
          {canManage && selectedYear.status === "closed" && (
            <AcademicActionForm
              operation="reopen_academic_year"
              hidden={{ academic_year_id: selectedYear.id }}
              submitLabel="Reabrir com justificativa"
            >
              <AcademicField label="Motivo da reabertura">
                <Input name="reason" minLength={5} required placeholder="Correção acadêmica aprovada" />
              </AcademicField>
            </AcademicActionForm>
          )}
        </Card>
      )}

      {canManage && (
        <details className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold">Cadastrar ano letivo</summary>
          <div className="mt-4">
            <AcademicActionForm operation="create_academic_year" submitLabel="Salvar ano letivo">
              <div className="grid gap-4 md:grid-cols-2">
                <AcademicField label="Curso">
                  <Select name="course_id" required defaultValue="">
                    <option value="" disabled>
                      Selecione
                    </option>
                    {courses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.year}
                      </option>
                    ))}
                  </Select>
                </AcademicField>
                <AcademicField label="Ano">
                  <Input name="year" type="number" min="2020" max="2200" required defaultValue="2026" />
                </AcademicField>
                <AcademicField label="Início">
                  <Input name="starts_on" type="date" required />
                </AcademicField>
                <AcademicField label="Término">
                  <Input name="ends_on" type="date" required />
                </AcademicField>
                <AcademicField label="Documento de referência">
                  <Input name="source_ref" minLength={5} required placeholder="Calendário acadêmico aprovado…" />
                </AcademicField>
                <AcademicField label="Situação inicial">
                  <Select name="status" defaultValue="draft">
                    <option value="open">Aberto para lançamentos</option>
                    <option value="draft">Rascunho para conferência</option>
                  </Select>
                </AcademicField>
                <div className="space-y-2 text-sm font-medium">
                  <span>Referência oficial</span>
                  <label className="flex items-start gap-2 text-sm font-normal text-muted-foreground">
                    <input aria-label="Referência oficial conferida" name="source_verified" type="checkbox" value="true" />
                    Confirmo que o documento de referência foi conferido pela coordenação.
                  </label>
                </div>
              </div>
            </AcademicActionForm>
          </div>
        </details>
      )}

      {selectedYear && canManage && selectedYear.status === "open" && (
        <details className="rounded-lg border border-border bg-card p-4">
          <summary className="cursor-pointer font-semibold">Adicionar evento ao calendário</summary>
          <div className="mt-4">
            <AcademicActionForm
              operation="save_calendar_event"
              hidden={{ event_id: "", academic_year_id: selectedYear.id }}
              submitLabel="Salvar evento"
            >
              <div className="grid gap-4 md:grid-cols-2">
                <AcademicField label="Data">
                  <Input name="event_date" type="date" min={selectedYear.starts_on} max={selectedYear.ends_on} required />
                </AcademicField>
                <AcademicField label="Tipo">
                  <Select name="event_type" defaultValue="holiday">
                    {Object.entries(eventLabel).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </AcademicField>
                <AcademicField label="Turma afetada">
                  <Select name="class_id" defaultValue="">
                    <option value="">Todo o curso</option>
                    {yearClasses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </Select>
                </AcademicField>
                <AcademicField label="Descrição">
                  <Input name="title" minLength={3} required />
                </AcademicField>
                <AcademicField label="Referência">
                  <Input name="source_ref" minLength={5} required />
                </AcademicField>
              </div>
              <input type="hidden" name="blocks_instruction" value="true" />
              <input type="hidden" name="reason" value="Inclusão no calendário letivo" />
            </AcademicActionForm>
          </div>
        </details>
      )}

      {selectedYear && unlinked.length > 0 && canManage && (
        <Card className="space-y-3 p-4">
          <h3 className="font-semibold">Ofertas sem calendário vinculado</h3>
          <p className="text-sm text-muted-foreground">
            Essas ofertas continuam históricas, mas não entram no diário nem nas projeções até serem vinculadas.
          </p>
          {unlinked.map((offering) => (
            <AcademicActionForm
              key={offering.id}
              operation="link_offering_year"
              hidden={{ offering_id: offering.id, academic_year_id: selectedYear.id }}
              submitLabel={`Vincular ${offering.discipline.name}`}
            >
              <AcademicField label="Motivo">
                <Input name="reason" minLength={5} required defaultValue="Vínculo da oferta ao calendário acadêmico" />
              </AcademicField>
            </AcademicActionForm>
          ))}
        </Card>
      )}

      {selectedYear && (
        <Card className="p-4">
          <h3 className="font-semibold">Eventos registrados</h3>
          {!yearEvents.length ? (
            <p className="mt-2 text-sm text-muted-foreground">Nenhum evento registrado neste período.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {yearEvents.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2 last:border-0">
                  <span>
                    <strong>{dateLabel(item.event_date)}</strong> · {eventLabel[item.event_type]} · {item.title}
                  </span>
                  <Badge variant={item.blocks_instruction ? "warning" : "default"}>
                    {item.blocks_instruction ? "Bloqueia instrução" : "Informativo"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </section>
  );
}
