"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { recordInternshipPoint } from "./pointActions";
import { locationLabels, type AttendancePointData } from "../domain/attendance";
import { EXIT_AFTER_ENTRY_MINUTES, EXIT_BEFORE_END_MINUTES, pointExitReleaseAt } from "../domain/pointExit";
export function AttendancePoint({
  assignmentId,
  points,
  available,
  supervisor,
  endsAt,
  earlyExitReason: savedEarlyExitReason,
}: {
  assignmentId: string;
  points: AttendancePointData[];
  available: boolean;
  supervisor: string | null;
  endsAt: string;
  earlyExitReason?: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(
    points.find((p) => p.supervisor_name)?.supervisor_name ?? supervisor ?? "",
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [earlyExitType, setEarlyExitType] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(timer);
  }, []);
  const entry = points.find((p) => p.point_type === "entrada"),
    exit = points.find((p) => p.point_type === "saida");
  const releaseAt = entry ? pointExitReleaseAt(endsAt, entry.recorded_at) : null;
  const canExit = available && releaseAt !== null && now !== null && now >= releaseAt;
  const earlyWindow = Boolean(entry && !exit && available && now !== null && now < Date.parse(endsAt) - EXIT_BEFORE_END_MINUTES * 60_000);
  const afterMinimum = Boolean(entry && now !== null && now >= Date.parse(entry.recorded_at) + EXIT_AFTER_ENTRY_MINUTES * 60_000);
  const earlyExitReason = earlyExitType === "instrucao"
    ? "Saída antecipada para instrução na ABM, por orientação da Coordenação."
    : otherReason.trim();
  const canExitEarly = earlyWindow && afterMinimum && earlyExitReason.length >= 5;
  const record = async (kind: "entrada" | "saida") => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (!navigator.geolocation)
        throw Error(
          "Este aparelho não disponibilizou GPS. Procure a administração para registrar a ocorrência.",
        );
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(
          resolve,
          () =>
            reject(
              Error(
                "Não foi possível obter o GPS. Permita a localização, tente novamente em área aberta ou procure a administração do estágio.",
              ),
            ),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
        ),
      );
      const result = await recordInternshipPoint({
        assignmentId,
        pointType: kind,
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        supervisorName: name,
        ...(kind === "saida" && earlyWindow ? { earlyExitReason } : {}),
      });
      if (result.error) throw Error(result.error);
      setMessage(
        `${kind === "entrada" ? "Entrada" : earlyWindow ? "Saída antecipada" : "Saída"} registrada. A Coordenação conferirá o horário real e decidirá a carga homologada.`,
      );
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Não foi possível registrar o ponto.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="space-y-3 rounded-md border p-3">
      <h3 className="font-semibold">Ponto do estágio</h3>
      <p className="text-xs text-muted-foreground">
        A localização é coletada somente ao apertar entrada ou saída, sem foto. O horário é
        registrado pelo servidor. O ponto auxilia a conferência e não altera sua carga
        automaticamente.
      </p>
      {points.map((p) => (
        <p key={p.id} className="rounded bg-muted p-2 text-sm">
          <strong>{p.point_type === "entrada" ? "Entrada" : "Saída"}</strong>:{" "}
          {new Intl.DateTimeFormat("pt-BR", {
            timeZone: "America/Belem",
            dateStyle: "short",
            timeStyle: "short",
          }).format(new Date(p.recorded_at))}{" "}
          · {locationLabels[p.location_status]} · precisão aproximada {Math.round(p.accuracy_m)} m
          {p.supervisor_name ? ` · Oficial responsável: ${p.supervisor_name}` : ""}
        </p>
      ))}
      {savedEarlyExitReason && (
        <p className="rounded-md border border-amber-400 p-3 text-sm">
          <strong>Saída antecipada informada.</strong> Motivo: {savedEarlyExitReason} A Coordenação vai conferir a jornada e decidir as horas homologadas.
        </p>
      )}
      {!exit && (
        <label className="block space-y-1 text-sm">
          <span>Oficial responsável pelo serviço (pode informar na saída)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            className="h-11 w-full rounded-md border border-input bg-background px-3"
            placeholder="Posto e nome do oficial responsável"
          />
        </label>
      )}
      {!available && !exit && (
        <p className="text-sm text-muted-foreground">
          O ponto fica disponível nas datas do plantão.
        </p>
      )}
      {earlyWindow && (
        <div className="space-y-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <p className="font-semibold">Precisa sair antes do horário previsto?</p>
          <p>Se a Coordenação orientou sua saída para assistir à instrução na ABM, registre a saída real com GPS quando deixar o serviço. Isso não retira automaticamente as 12 ou 24 horas previstas: a Coordenação conferirá e decidirá a carga a homologar.</p>
          <label className="block space-y-1">
            <span>Motivo da saída antecipada</span>
            <select value={earlyExitType} onChange={(event) => setEarlyExitType(event.target.value)} className="h-11 w-full rounded-md border border-input bg-background px-3">
              <option value="">Selecione o motivo</option>
              <option value="instrucao">Instrução na ABM, por orientação da Coordenação</option>
              <option value="outro">Outro motivo</option>
            </select>
          </label>
          {earlyExitType === "outro" && (
            <label className="block space-y-1">
              <span>Descreva o motivo</span>
              <input value={otherReason} onChange={(event) => setOtherReason(event.target.value)} maxLength={500} minLength={5} className="h-11 w-full rounded-md border border-input bg-background px-3" />
            </label>
          )}
          {!afterMinimum && <p>Para evitar um registro acidental, a saída fica disponível 30 minutos após a entrada.</p>}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {!entry && (
          <Button type="button" disabled={busy || !available} onClick={() => record("entrada")}>
            {busy ? "Obtendo localização…" : "Registrar entrada com GPS"}
          </Button>
        )}
        {entry && !exit && (
          <Button type="button" disabled={busy || !(canExit || canExitEarly)} onClick={() => record("saida")}>
            {busy ? "Obtendo localização…" : earlyWindow ? "Registrar saída antecipada com GPS" : "Registrar saída com GPS"}
          </Button>
        )}
      </div>
      {entry && !exit && (
        <p className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
          <strong>Entrada registrada · plantão em andamento.</strong>{" "}
          {!available
            ? "O período do plantão terminou. Procure a administração para corrigir a saída."
            : canExit
              ? "A saída está liberada. Registre-a somente quando realmente deixar o local."
              : `A saída comum será liberada às ${new Intl.DateTimeFormat("pt-BR", {
                  timeZone: "America/Belem",
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(
                  new Date(releaseAt!),
                )}. Se precisar sair antes, selecione o motivo acima e registre a saída real com GPS.`}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
