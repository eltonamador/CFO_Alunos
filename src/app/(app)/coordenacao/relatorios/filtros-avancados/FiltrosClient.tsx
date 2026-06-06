"use client";

import * as React from "react";
import { FileSpreadsheet, FileText, Loader2, ShieldAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  applyFiltros,
  computeFichaSituacao,
  computeResumo,
  describeFiltros,
  EMPTY_FILTROS,
  hasAllergy,
  hasCnh,
  hasPriorMilitary,
  hasVehicle,
  residesInAmapa,
  uniformValue,
  type AlunoFiltravel,
  type BoolFilter,
  type EnrollmentFilter,
  type FichaSituacao,
  type FiltrosState,
  type InstituicaoMilitar,
  type ResideApFilter,
  type SexoFilter,
} from "@/lib/reports/filtros-avancados";

type Format = "pdf" | "xlsx";

interface Props {
  alunos: AlunoFiltravel[];
  role: string;
}

const SEXO_OPTIONS: { value: SexoFilter; label: string }[] = [
  { value: "M", label: "Masculino" },
  { value: "F", label: "Feminino" },
  { value: "ni", label: "Não informado" },
];
const ENROLLMENT_OPTIONS: { value: EnrollmentFilter; label: string }[] = [
  { value: "confirmada", label: "Confirmada" },
  { value: "pendente", label: "Pendente" },
];
const FICHA_OPTIONS: { value: FichaSituacao; label: string }[] = [
  { value: "completa", label: "Completa" },
  { value: "incompleta", label: "Incompleta" },
  { value: "nao_iniciada", label: "Não iniciada" },
];
const RESIDE_OPTIONS: { value: ResideApFilter; label: string }[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
  { value: "ni", label: "Não informado" },
];
const BOOL_OPTIONS: { value: BoolFilter; label: string }[] = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];
const INSTITUICAO_OPTIONS: { value: InstituicaoMilitar; label: string }[] = [
  { value: "corpo_de_bombeiros_militar", label: "CBM" },
  { value: "policia_militar", label: "Polícia Militar" },
  { value: "forcas_armadas", label: "Forças Armadas" },
  { value: "outra", label: "Outra" },
];

function toggle<T>(arr: T[], v: T): T[] {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

function fichaBadgeVariant(s: FichaSituacao): "success" | "warning" | "outline" {
  if (s === "completa") return "success";
  if (s === "incompleta") return "warning";
  return "outline";
}

function fichaLabel(s: FichaSituacao): string {
  return s === "completa" ? "Completa" : s === "incompleta" ? "Incompleta" : "Não iniciada";
}

export function FiltrosClient({ alunos, role }: Props) {
  const [filtros, setFiltros] = React.useState<FiltrosState>(EMPTY_FILTROS);
  const [loading, setLoading] = React.useState<Format | null>(null);
  const [erro, setErro] = React.useState<string | null>(null);

  const isCoordenacao = role === "coordenacao";

  const filtrados = React.useMemo(() => applyFiltros(alunos, filtros), [alunos, filtros]);
  const resumo = React.useMemo(() => computeResumo(alunos, filtrados), [alunos, filtrados]);
  const criterios = React.useMemo(() => describeFiltros(filtros), [filtros]);
  const gandolaOptions = React.useMemo(
    () =>
      Array.from(
        new Set(alunos.map((a) => uniformValue(a.student_logistics?.gandola_size)).filter(Boolean)),
      ).sort(),
    [alunos],
  );
  const calcaOptions = React.useMemo(
    () =>
      Array.from(
        new Set(alunos.map((a) => uniformValue(a.student_logistics?.pants_size)).filter(Boolean)),
      ).sort(),
    [alunos],
  );

  const filtrosAtivos =
    filtros.sexo.length +
    filtros.enrollment.length +
    filtros.ficha.length +
    filtros.resideAp.length +
    filtros.vemDeOutroEstado.length +
    (filtros.ufEndereco.trim() ? 1 : 0) +
    filtros.temAlergia.length +
    filtros.usaMedicacao.length +
    filtros.temRestricaoFisica.length +
    filtros.temCnh.length +
    filtros.temVeiculo.length +
    filtros.necessitaAlojamento.length +
    filtros.gandola.length +
    filtros.calca.length +
    filtros.expMilitar.length +
    filtros.instituicaoMilitar.length +
    filtros.pendMaterial.length +
    filtros.pendDocumento.length +
    filtros.restricaoReligiosa.length;

  function limpar() {
    setFiltros(EMPTY_FILTROS);
  }

  async function exportar(format: Format) {
    setLoading(format);
    setErro(null);
    try {
      const res = await fetch(`/api/reports/filtros-avancados?format=${format}`, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: filtrados.map((a) => a.id),
          criterios,
          includeSensitive: isCoordenacao,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}: ${text.slice(0, 200) || res.statusText}`);
      }
      const blob = await res.blob();
      const dispo = res.headers.get("Content-Disposition") ?? "";
      const fname =
        dispo.match(/filename="?([^"]+)"?/i)?.[1] ??
        `Filtros_Avancados.${format === "pdf" ? "pdf" : "xlsx"}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* ── Painel de filtros ───────────────────────────────────────── */}
      <aside className="space-y-4">
        <FilterCard title="Identificação" description="Sexo, matrícula e situação da ficha">
          <FilterGroup label="Sexo">
            {SEXO_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.sexo.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, sexo: toggle(f.sexo, o.value) }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Status da matrícula">
            {ENROLLMENT_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.enrollment.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, enrollment: toggle(f.enrollment, o.value) }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Situação da ficha">
            {FICHA_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.ficha.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, ficha: toggle(f.ficha, o.value) }))
                }
              />
            ))}
          </FilterGroup>
        </FilterCard>

        <FilterCard title="Contato / Origem" description="Reside no AP, UF e naturalidade">
          <FilterGroup label="Reside no Amapá">
            {RESIDE_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.resideAp.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, resideAp: toggle(f.resideAp, o.value) }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Vem de outro estado">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.vemDeOutroEstado.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({
                    ...f,
                    vemDeOutroEstado: toggle(f.vemDeOutroEstado, o.value),
                  }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="UF de endereço (contém)">
            <input
              type="text"
              value={filtros.ufEndereco}
              maxLength={4}
              onChange={(e) =>
                setFiltros((f) => ({ ...f, ufEndereco: e.target.value.toUpperCase() }))
              }
              placeholder="Ex.: AP"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm uppercase"
            />
          </FilterGroup>
        </FilterCard>

        {isCoordenacao && (
          <FilterCard
            title="Saúde"
            description="Restrições, alergias, medicação"
            sensitive
          >
            <FilterGroup label="Possui alergia">
              {BOOL_OPTIONS.map((o) => (
                <CheckboxRow
                  key={o.value}
                  label={o.label}
                  checked={filtros.temAlergia.includes(o.value)}
                  onChange={() =>
                    setFiltros((f) => ({ ...f, temAlergia: toggle(f.temAlergia, o.value) }))
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup label="Uso de medicação contínua">
              {BOOL_OPTIONS.map((o) => (
                <CheckboxRow
                  key={o.value}
                  label={o.label}
                  checked={filtros.usaMedicacao.includes(o.value)}
                  onChange={() =>
                    setFiltros((f) => ({ ...f, usaMedicacao: toggle(f.usaMedicacao, o.value) }))
                  }
                />
              ))}
            </FilterGroup>
            <FilterGroup label="Restrição física">
              {BOOL_OPTIONS.map((o) => (
                <CheckboxRow
                  key={o.value}
                  label={o.label}
                  checked={filtros.temRestricaoFisica.includes(o.value)}
                  onChange={() =>
                    setFiltros((f) => ({
                      ...f,
                      temRestricaoFisica: toggle(f.temRestricaoFisica, o.value),
                    }))
                  }
                />
              ))}
            </FilterGroup>
          </FilterCard>
        )}

        <FilterCard
          title="Logística / Materiais"
          description="CNH, veículo, alojamento, experiência militar"
        >
          <FilterGroup label="Possui CNH">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.temCnh.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, temCnh: toggle(f.temCnh, o.value) }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Possui veículo">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.temVeiculo.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, temVeiculo: toggle(f.temVeiculo, o.value) }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Necessita alojamento">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.necessitaAlojamento.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({
                    ...f,
                    necessitaAlojamento: toggle(f.necessitaAlojamento, o.value),
                  }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Gandola">
            {gandolaOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum tamanho informado.</p>
            ) : (
              gandolaOptions.map((size) => (
                <CheckboxRow
                  key={size}
                  label={size}
                  checked={filtros.gandola.includes(size)}
                  onChange={() =>
                    setFiltros((f) => ({ ...f, gandola: toggle(f.gandola, size) }))
                  }
                />
              ))
            )}
          </FilterGroup>
          <FilterGroup label="Calça">
            {calcaOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum tamanho informado.</p>
            ) : (
              calcaOptions.map((size) => (
                <CheckboxRow
                  key={size}
                  label={size}
                  checked={filtros.calca.includes(size)}
                  onChange={() =>
                    setFiltros((f) => ({ ...f, calca: toggle(f.calca, size) }))
                  }
                />
              ))
            )}
          </FilterGroup>
          <FilterGroup label="Experiência militar anterior">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.expMilitar.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, expMilitar: toggle(f.expMilitar, o.value) }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Instituição militar anterior">
            {INSTITUICAO_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.instituicaoMilitar.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({
                    ...f,
                    instituicaoMilitar: toggle(f.instituicaoMilitar, o.value),
                  }))
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup label="Pendência de material/enxoval">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.pendMaterial.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, pendMaterial: toggle(f.pendMaterial, o.value) }))
                }
              />
            ))}
          </FilterGroup>
        </FilterCard>

        <FilterCard title="Documentos" description="Documentos pendentes ou recusados">
          <FilterGroup label="Documento pendente">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.pendDocumento.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({ ...f, pendDocumento: toggle(f.pendDocumento, o.value) }))
                }
              />
            ))}
          </FilterGroup>
        </FilterCard>

        <FilterCard title="Administrativo" description="Religião e situação no curso">
          <FilterGroup label="Restrição religiosa">
            {BOOL_OPTIONS.map((o) => (
              <CheckboxRow
                key={o.value}
                label={o.label}
                checked={filtros.restricaoReligiosa.includes(o.value)}
                onChange={() =>
                  setFiltros((f) => ({
                    ...f,
                    restricaoReligiosa: toggle(f.restricaoReligiosa, o.value),
                  }))
                }
              />
            ))}
          </FilterGroup>
        </FilterCard>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={limpar}
            disabled={filtrosAtivos === 0}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium",
              "hover:bg-muted disabled:opacity-50",
            )}
          >
            <X className="h-4 w-4" /> Limpar filtros ({filtrosAtivos})
          </button>
        </div>

        {isCoordenacao && (
          <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex gap-2">
              <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <p>
                Filtros e relatórios de Saúde e Religião contêm dados sensíveis sob LGPD.
                Uso restrito à Coordenação.
              </p>
            </div>
          </div>
        )}
      </aside>

      {/* ── Resultados ──────────────────────────────────────────────── */}
      <section className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">Resultado</CardTitle>
              <CardDescription>
                {resumo.filtrados} aluno(s) · {resumo.percentual}% da turma ({resumo.total})
              </CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => exportar("pdf")}
                disabled={loading !== null || resumo.filtrados === 0}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {loading === "pdf" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                Gerar PDF
              </button>
              <button
                type="button"
                onClick={() => exportar("xlsx")}
                disabled={loading !== null || resumo.filtrados === 0}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
              >
                {loading === "xlsx" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4" />
                )}
                Exportar XLSX
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <StatBox label="Masculino" value={resumo.porSexo.masculino} />
              <StatBox label="Feminino" value={resumo.porSexo.feminino} />
              <StatBox label="Sexo n/i" value={resumo.porSexo.naoInformado} />
              <StatBox label="Matr. confirmada" value={resumo.porMatricula.confirmada} />
              <StatBox label="Matr. pendente" value={resumo.porMatricula.pendente} />
              <StatBox label="Ficha completa" value={resumo.porFicha.completa} />
              <StatBox label="Ficha incompleta" value={resumo.porFicha.incompleta} />
              <StatBox label="Ficha não iniciada" value={resumo.porFicha.naoIniciada} />
              <StatBox label="Reside no AP" value={resumo.porOrigem.ap} />
              <StatBox label="Fora do AP" value={resumo.porOrigem.foraAp} />
              <StatBox label="Vem de outro estado" value={resumo.porOrigem.outroEstado} />
              {isCoordenacao && (
                <>
                  <StatBox label="Com alergia" value={resumo.porSaude.alergia} />
                  <StatBox label="Usa medicação" value={resumo.porSaude.medicacao} />
                  <StatBox label="Restrição física" value={resumo.porSaude.restricaoFisica} />
                </>
              )}
              <StatBox label="Possui CNH" value={resumo.porLogistica.cnh} />
              <StatBox label="Possui veículo" value={resumo.porLogistica.veiculo} />
              <StatBox label="Exp. militar" value={resumo.porLogistica.expMilitar} />
              <StatBox label="Pend. material" value={resumo.porLogistica.pendMaterial} />
              <StatBox label="Doc. pendentes" value={resumo.porDocumentos.pendentes} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {criterios.map((c) => (
                <Badge key={c} variant="outline" className="font-normal">
                  {c}
                </Badge>
              ))}
            </div>

            {erro && (
              <div className="rounded-md border border-red-300 bg-red-50 p-2 text-xs text-red-900">
                Falha ao exportar: {erro}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Alunos filtrados</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            {filtrados.length === 0 ? (
              <div className="px-6 py-10 text-center text-sm text-muted-foreground">
                Nenhum aluno corresponde aos filtros selecionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left">Nº</th>
                      <th className="px-4 py-2 text-left">Nome de Guerra</th>
                      <th className="px-4 py-2 text-left">Pelotão</th>
                      <th className="px-4 py-2 text-left">Sexo</th>
                      <th className="px-4 py-2 text-left">UF</th>
                      <th className="px-4 py-2 text-left">Matrícula</th>
                      <th className="px-4 py-2 text-left">Ficha</th>
                      <th className="px-4 py-2 text-left">Gandola</th>
                      <th className="px-4 py-2 text-left">Calça</th>
                      <th className="px-4 py-2 text-left">Sinais</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((a) => {
                      const fs = computeFichaSituacao(a);
                      const enr = a.enrollment_status ?? "pendente";
                      const ap = residesInAmapa(a);
                      return (
                        <tr key={a.id} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2 tabular-nums">{a.student_number ?? "—"}</td>
                          <td className="px-4 py-2 font-medium">{a.war_name}</td>
                          <td className="px-4 py-2">{a.pelotao ?? "—"}</td>
                          <td className="px-4 py-2">
                            {a.sex === "M" ? "M" : a.sex === "F" ? "F" : "—"}
                          </td>
                          <td className="px-4 py-2">
                            {a.student_addresses?.state ?? "—"}
                            {ap === true && (
                              <span className="ml-1 text-[10px] text-muted-foreground">(AP)</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant={enr === "confirmada" ? "success" : "warning"}>
                              {enr === "confirmada" ? "Confirmada" : "Pendente"}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant={fichaBadgeVariant(fs)}>{fichaLabel(fs)}</Badge>
                          </td>
                          <td className="px-4 py-2">{a.student_logistics?.gandola_size ?? "—"}</td>
                          <td className="px-4 py-2">{a.student_logistics?.pants_size ?? "—"}</td>
                          <td className="px-4 py-2">
                            <div className="flex flex-wrap gap-1">
                              {hasCnh(a) && <Badge variant="info">CNH</Badge>}
                              {hasVehicle(a) && <Badge variant="info">Veíc.</Badge>}
                              {hasPriorMilitary(a) && <Badge variant="gold">Mil.</Badge>}
                              {isCoordenacao && hasAllergy(a) && (
                                <Badge variant="warning">Alergia</Badge>
                              )}
                              {a.has_pending_equipment && (
                                <Badge variant="destructive">Mat.</Badge>
                              )}
                              {a.has_pending_documents && (
                                <Badge variant="destructive">Doc.</Badge>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Sub-componentes locais
// ──────────────────────────────────────────────────────────────────────
function FilterCard({
  title,
  description,
  sensitive,
  children,
}: {
  title: string;
  description?: string;
  sensitive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {sensitive && (
            <Badge variant="warning" className="shrink-0">
              LGPD
            </Badge>
          )}
        </div>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-border accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
