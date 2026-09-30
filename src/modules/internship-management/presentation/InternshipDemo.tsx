"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  applyDemo,
  createDemo,
  demoPhase,
  demoSchema,
  demoTotals,
  type DemoAction,
  type DemoSession,
  type DemoShift,
} from "../domain/demo";
import { evaluationDate } from "../domain/evaluation";
import { formatMinutes, minutesBetween } from "../domain/workload";
import { parseEvaluationForm } from "../domain/evaluationValidation";
import { EvaluationForm } from "./EvaluationForm";
import { EvaluationResult } from "./EvaluationResult";

export function InternshipDemo({ userId }: { userId: string }) {
  const storageKey = `cfo:internship-demo:v1:${userId}`;
  const [session, setSession] = useState<DemoSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [storageWarning, setStorageWarning] = useState("");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = demoSchema.safeParse(JSON.parse(saved));
        if (parsed.success) setSession(parsed.data);
        else setMessage("O teste salvo não é compatível. Crie uma nova demonstração.");
      }
    } catch {
      setStorageWarning(
        "O navegador não permitiu recuperar o teste. Você pode usar uma demonstração nesta tela.",
      );
    }
    setLoaded(true);
  }, [storageKey]);
  function persist(next: DemoSession | null) {
    try {
      if (next) localStorage.setItem(storageKey, JSON.stringify(next));
      else localStorage.removeItem(storageKey);
      setStorageWarning("");
    } catch {
      setStorageWarning(
        next
          ? "O teste está apenas na memória desta tela; o navegador não permitiu salvá-lo."
          : "A tela foi limpa, mas o navegador não permitiu remover a cópia salva. Apague os dados deste site nas configurações do navegador.",
      );
    }
    setSession(next);
  }
  function act(action: DemoAction, success: string): { error?: string; success?: boolean } {
    if (!session) return { error: "Crie a demonstração primeiro." };
    try {
      persist(applyDemo(session, action));
      setMessage(success);
      return { success: true };
    } catch (error) {
      const text = error instanceof Error ? error.message : "Não foi possível concluir o teste.";
      setMessage(text);
      return { error: text };
    }
  }
  const totals = session ? demoTotals(session) : null;
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <a href="/coordenacao/estagio" className="text-sm font-semibold text-primary underline">
        Voltar ao estágio oficial
      </a>
      <header>
        <p className="font-semibold uppercase tracking-wider text-amber-800">
          Demonstração · dados fictícios
        </p>
        <h1 className="font-display text-3xl font-bold">
          Testar o estágio: passado, presente e futuro
        </h1>
        <p className="mt-2 text-muted-foreground">
          Cadete de teste · sem vínculo com a turma. As ações ficam neste navegador e nesta conta.
          As horas, avaliações e pontos de teste não entram na escala nem nos relatórios oficiais.
        </p>
      </header>
      <div className="rounded-lg border border-amber-400 bg-amber-50 p-4 text-sm text-amber-950">
        Use o mesmo formulário de avaliação e as mesmas funções de cálculo de horas do módulo. Aqui
        você representa o oficial, a administração e o cadete. O relógio é simulado e fica parado
        até você avançá-lo; o GPS é apenas simulado, sem solicitar sua localização.
      </div>
      {storageWarning && (
        <p role="alert" className="rounded-md border p-3 text-sm">
          {storageWarning}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-md bg-muted p-3">
          {message}
        </p>
      )}
      {!loaded ? (
        <p>Carregando teste…</p>
      ) : !session ? (
        <section className="space-y-3 rounded-lg border bg-card p-5">
          <h2 className="text-xl font-semibold">Pronto para experimentar</h2>
          <p>
            Crie um plantão passado de 12 horas, um em andamento de 24 horas e outro futuro de 12
            horas. A carga inicial será 48 horas previstas e zero homologadas.
          </p>
          <Button
            onClick={() => {
              persist(createDemo(new Date().toISOString()));
              setMessage(
                "Teste criado. Comece pelo plantão passado: ele já pode ser avaliado e homologado.",
              );
            }}
          >
            Criar teste com 3 plantões
          </Button>
        </section>
      ) : (
        <>
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="font-semibold">Relógio do teste: {evaluationDate(session.clock)}</h2>
            <p className="text-sm text-muted-foreground">
              As datas são geradas ao criar o teste. Os horários fictícios demonstram as etapas e
              não representam uma escala operacional válida.
            </p>
            <ol className="list-inside list-decimal space-y-1 text-sm">
              <li>No passado, preencha a avaliação, revise e homologue as 12 horas.</li>
              <li>
                No presente, simule a entrada e avance até o fim para registrar a saída e homologar.
              </li>
              <li>No futuro, confira os bloqueios; depois avance até o início e o término.</li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => window.print()}>
                Imprimir resumo do teste
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  persist(null);
                  setMessage(
                    "Teste excluído deste navegador. Você pode criar outro quando quiser.",
                  );
                }}
              >
                Excluir todos os dados deste teste
              </Button>
            </div>
          </section>
          {totals && (
            <section id="internship-demo-print" className="space-y-3 rounded-lg border bg-card p-4">
              <h2 className="font-display text-xl font-bold">
                Contador do cadete fictício · TESTE
              </h2>
              <p className="text-sm">
                Sem validade oficial · relógio simulado: {evaluationDate(session.clock)}
              </p>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Metric label="Carga prevista" value={totals.plannedMinutes} />
                <Metric label="Carga realizada registrada" value={totals.performedMinutes} />
                <Metric label="Carga homologada" value={totals.validatedMinutes} />
                <Metric label="Falta para 250 horas" value={totals.missingRequiredMinutes} />
              </div>
              <p className="text-sm">
                Ponto e avaliação não somam horas automaticamente. Neste teste, a homologação
                registra a jornada cumprida e atualiza a carga oficial simulada.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th className="p-2">Cenário</th>
                      <th>Serviço</th>
                      <th>Situação atual</th>
                      <th>Previstas</th>
                      <th>Homologadas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {session.shifts.map((s) => (
                      <tr key={s.id} className="border-t">
                        <td className="p-2 capitalize">{s.id}</td>
                        <td>{s.service}</td>
                        <td>{demoPhase(s, session.clock)}</td>
                        <td>{formatMinutes(minutesBetween(s.startsAt, s.endsAt))}</td>
                        <td>{formatMinutes(s.execution?.approved ?? 0)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Com os três plantões integralmente homologados: 48 horas cumpridas e 202 horas
                restantes.
              </p>
            </section>
          )}
          <div className="space-y-5">
            {session.shifts.map((shift) => (
              <DemoCard key={shift.id} shift={shift} clock={session.clock} act={act} />
            ))}
          </div>
        </>
      )}
      <style>{`@media print {body * {display:none!important} body :has(#internship-demo-print), #internship-demo-print, #internship-demo-print * {display:revert!important} #internship-demo-print {position:absolute;left:0;top:0;width:100%;color:#000;background:#fff;border:none;padding:10mm} @page {size:A4 landscape;margin:10mm}}`}</style>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted p-3">
      <p className="text-sm">{label}</p>
      <p
        className="font-display text-2xl font-bold"
        aria-label={`${label}: ${formatMinutes(value)}`}
      >
        {formatMinutes(value)}
      </p>
    </div>
  );
}
function DemoCard({
  shift,
  clock,
  act,
}: {
  shift: DemoShift;
  clock: string;
  act: (action: DemoAction, success: string) => { error?: string; success?: boolean };
}) {
  const phase = demoPhase(shift, clock);
  const ended = phase === "Encerrado";
  const planned = minutesBetween(shift.startsAt, shift.endsAt);
  const names = {
    passado: "1. Passado — plantão já encerrado",
    presente: "2. Presente — plantão iniciado no dia do teste",
    futuro: "3. Futuro — plantão ainda agendado",
  };
  return (
    <article aria-label={`Cenário ${shift.id}`} className="space-y-4 rounded-lg border bg-card p-5">
      <header>
        <h2 className="font-display text-2xl font-semibold">{names[shift.id]}</h2>
        <p>
          {shift.service} · {shift.site} · {formatMinutes(planned)}
        </p>
        <p className="text-sm">
          {evaluationDate(shift.startsAt)} a {evaluationDate(shift.endsAt)}
        </p>
        <p className="mt-2 font-semibold">
          Agora no teste: {phase}
          {shift.execution ? " · horas homologadas" : ""}
        </p>
      </header>
      {!ended && (
        <div className="flex flex-wrap gap-2">
          {phase === "Agendado" && (
            <Button
              variant="outline"
              onClick={() =>
                act(
                  { type: "advance", id: shift.id, to: "start" },
                  "Relógio avançado para o início. Agora você pode simular a entrada.",
                )
              }
            >
              Avançar até o início deste plantão
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() =>
              act(
                { type: "advance", id: shift.id, to: "end" },
                "Relógio avançado para o término. Avaliação e homologação estão disponíveis.",
              )
            }
          >
            Avançar até o término deste plantão
          </Button>
        </div>
      )}
      <section className="space-y-2 border-t pt-3">
        <h3 className="font-semibold">1 · Cadete: ponto simulado</h3>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={phase !== "Em andamento" || !!shift.entry}
            onClick={() =>
              act(
                { type: "point", id: shift.id, kind: "entry" },
                "Entrada de teste registrada. O contador de horas continua igual.",
              )
            }
          >
            Simular entrada
          </Button>
          <Button
            variant="outline"
            disabled={!shift.entry || !!shift.exit || Date.parse(clock) <= Date.parse(shift.entry)}
            onClick={() =>
              act(
                { type: "point", id: shift.id, kind: "exit" },
                "Saída de teste registrada. A administração ainda precisa homologar as horas.",
              )
            }
          >
            Simular saída
          </Button>
        </div>
        <p className="text-sm">
          Entrada: {shift.entry ? evaluationDate(shift.entry) : "não registrada"} · Saída:{" "}
          {shift.exit ? evaluationDate(shift.exit) : "não registrada"}
        </p>
        <p className="text-xs text-muted-foreground">
          O ponto auxilia a conferência; a ausência de ponto não impede o lançamento administrativo
          da ficha.
        </p>
      </section>
      <section className="space-y-3 border-t pt-3">
        <h3 className="font-semibold">2 · Oficial: avaliação de teste</h3>
        {!shift.evaluation ? (
          <>
            {!ended && (
              <p className="text-sm text-amber-800">
                Envio bloqueado até o término. Use o relógio acima para testar a liberação.
              </p>
            )}
            <details>
              <summary className="cursor-pointer font-semibold text-primary">
                Abrir avaliação como oficial (teste)
              </summary>
              <div className="mt-4">
                <EvaluationForm
                  mode="digital"
                  recipientName="Cap. Oficial Fictício"
                  disabled={!ended}
                  demoSave={async (form) => {
                    const parsed = parseEvaluationForm(form);
                    if (!parsed.success)
                      return {
                        error:
                          "Confira os seis critérios, a identificação e a confirmação. Reforço e situação relevante exigem descrição.",
                      };
                    return act(
                      { type: "evaluate", id: shift.id, body: parsed.data },
                      "Avaliação de teste recebida. Revise abaixo; as horas ainda não foram homologadas.",
                    );
                  }}
                />
              </div>
            </details>
          </>
        ) : (
          <div className="space-y-2">
            <p className="font-semibold">
              {shift.evaluation.released
                ? "Avaliação revisada e liberada ao cadete fictício"
                : "Avaliação recebida — aguardando revisão"}
            </p>
            <EvaluationResult
              ratings={shift.evaluation.body.ratings}
              guidance={shift.evaluation.body.guidance}
            />
            {!shift.evaluation.released && (
              <Button
                onClick={() =>
                  act(
                    { type: "release", id: shift.id },
                    "Avaliação liberada na visão do cadete fictício. A carga de horas não muda com a avaliação.",
                  )
                }
              >
                Simular conferência e liberar avaliação
              </Button>
            )}
          </div>
        )}
      </section>
      <section className="space-y-2 border-t pt-3">
        <h3 className="font-semibold">3 · Administração: homologar horas</h3>
        <p className="text-sm">
          Sem ocorrência excepcional, considere a jornada prevista de {formatMinutes(planned)}.
          Oficial responsável e referência são fictícios nesta demonstração.
        </p>
        <Button
          disabled={!ended || !!shift.execution}
          onClick={() =>
            act(
              { type: "homologate", id: shift.id, approved: planned, reason: "" },
              `${formatMinutes(planned)} homologadas no teste. Confira o contador acima.`,
            )
          }
        >
          {shift.execution
            ? "Jornada já homologada no teste"
            : `Homologar ${planned / 60} horas no teste`}
        </Button>
        {!ended && (
          <p className="text-sm">
            Indisponível enquanto o plantão estiver no futuro ou em andamento.
          </p>
        )}
      </section>
      <details className="border-t pt-3">
        <summary className="cursor-pointer font-semibold">
          4 · Ver resultado como cadete (teste)
        </summary>
        <div className="mt-3 space-y-2">
          <p>Carga deste plantão: {formatMinutes(shift.execution?.approved ?? 0)} homologadas.</p>
          {shift.evaluation?.released ? (
            <EvaluationResult
              ratings={shift.evaluation.body.ratings}
              guidance={shift.evaluation.body.guidance}
            />
          ) : (
            <p className="text-sm">A avaliação aparecerá aqui após a revisão da administração.</p>
          )}
        </div>
      </details>
    </article>
  );
}
