"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AcademicActionForm, AcademicField } from "./AcademicActionForm";
import {
  DEFAULT_POLICY_PARAMETERS,
  type PolicyParameters,
} from "@/modules/academic-management/domain/academic";

export function AcademicPolicyForm({
  offeringId,
  current,
}: {
  offeringId: string;
  current?: PolicyParameters;
}) {
  const initial = current ?? DEFAULT_POLICY_PARAMETERS;
  const [values, setValues] = useState({ ...initial });
  const [attendanceMode, setAttendanceMode] = useState<PolicyParameters["attendanceMode"]>(
    initial.attendanceMode,
  );
  const [penaltyStage, setPenaltyStage] = useState<PolicyParameters["absencePenaltyStage"]>(
    initial.absencePenaltyStage,
  );
  const [vfMinAverage, setVfMinAverage] = useState(String(initial.vfMinAverage));
  const [decimals, setDecimals] = useState(String(initial.averageDecimals));
  const [comparisonStage, setComparisonStage] = useState<PolicyParameters["comparisonStage"]>(
    initial.comparisonStage,
  );
  const parameters = JSON.stringify({
    ...values,
    attendanceMode,
    absencePenaltyStage: penaltyStage,
    vfMinAverage: vfMinAverage === "" ? null : Number(vfMinAverage),
    averageDecimals: decimals === "" ? null : Number(decimals),
    comparisonStage,
  });
  const numericFields = [
    { key: "directPassGrade", label: "Média para aprovação direta", max: 10 },
    { key: "vfPassGrade", label: "Média mínima após VF", max: 10 },
    { key: "vfMaxRecordedGrade", label: "Teto da nota registrada após VF", max: 10 },
    { key: "maxVfDisciplines", label: "Limite de disciplinas em VF", max: 20 },
    { key: "absenceLimitPercent", label: "Limite de faltas na disciplina (%)", max: 100 },
    { key: "courseAttendanceMinimum", label: "Frequência mínima do curso (%)", max: 100 },
  ] as const;

  return (
    <AcademicActionForm
      operation="configure_policy"
      hidden={{ offering_id: offeringId, parameters }}
      submitLabel="Registrar política aprovada"
      disabled={vfMinAverage === "" || !decimals}
    >
      <p className="text-sm text-muted-foreground">
        O formulário inicia com a interpretação provisória do RI ABM 2023 adotada pela coordenação.
        Os parâmetros continuam editáveis e ficam registrados na oferta para permitir correções
        futuras sem apagar notas.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicField label="Nome da política">
          <Input
            name="name"
            required
            minLength={3}
            defaultValue="RI ABM 2023 — aplicação provisória"
          />
        </AcademicField>
        <AcademicField label="Referência da decisão da coordenação">
          <Input
            name="decision_ref"
            required
            minLength={5}
            defaultValue="RI ABM 2023 — aplicação provisória"
            placeholder="Ato, despacho ou registro da decisão provisória"
          />
        </AcademicField>
        <AcademicField
          label="Faltas que contam para o limite"
          hint="Padrão provisório: somente faltas não justificadas, conforme art. 43 do RI."
        >
          <Select
            required
            value={attendanceMode}
            onChange={(event) =>
              setAttendanceMode(event.target.value as PolicyParameters["attendanceMode"])
            }
          >
            <option value="total">Justificadas e não justificadas</option>
            <option value="unjustified">Somente não justificadas</option>
          </Select>
        </AcademicField>
        <AcademicField
          label="Momento do desconto por faltas"
          hint="Interpretação provisória: desconto na nota final, conforme redação do art. 43 §5º."
        >
          <Select
            required
            value={penaltyStage}
            onChange={(event) =>
              setPenaltyStage(event.target.value as PolicyParameters["absencePenaltyStage"])
            }
          >
            <option value="before_vf">Na média corrente, antes de avaliar a VF</option>
            <option value="after_vf">Na nota final, após VF e redutor quando houver</option>
          </Select>
        </AcademicField>
        <AcademicField
          label="Média mínima para acesso à VF"
          hint="Padrão provisório: 0, pois o art. 38 do RI não fixa piso para acesso à VF."
        >
          <Input
            type="number"
            min="0"
            max="10"
            step="0.01"
            required
            value={vfMinAverage}
            onChange={(event) => setVfMinAverage(event.target.value)}
          />
        </AcademicField>
        <AcademicField
          label="Precisão da média"
          hint="Arredondamento para o par mais próximo. O momento da comparação dos limites é escolhido no campo seguinte."
        >
          <Select required value={decimals} onChange={(event) => setDecimals(event.target.value)}>
            <option value="" disabled>
              Escolha a precisão aprovada
            </option>
            <option value="2">2 casas decimais</option>
            <option value="3">3 casas decimais</option>
            <option value="7">7 casas decimais</option>
          </Select>
        </AcademicField>
        <AcademicField
          label="Momento de comparar os limites"
          hint="Padrão provisório: aplicar o arredondamento do RI antes da comparação."
        >
          <Select
            required
            value={comparisonStage}
            onChange={(event) =>
              setComparisonStage(event.target.value as PolicyParameters["comparisonStage"])
            }
          >
            <option value="rounded">Comparar após arredondar os valores intermediários</option>
            <option value="exact">Comparar com os valores intermediários exatos</option>
          </Select>
          {comparisonStage === "rounded" && (
            <span className="block text-xs font-normal text-muted-foreground">
              A MVC, a média após VF e o redutor são arredondados antes de comparar os limites de
              aprovação.
            </span>
          )}
          {comparisonStage === "exact" && (
            <span className="block text-xs font-normal text-muted-foreground">
              A comparação usa valores exatos. O arredondamento exibido na tela não altera os
              limites de aprovação.
            </span>
          )}
        </AcademicField>
        {numericFields.map((field) => (
          <AcademicField key={field.key} label={field.label}>
            <Input
              type="number"
              min="0"
              max={field.max}
              step={field.key === "maxVfDisciplines" ? "1" : "0.01"}
              defaultValue={initial[field.key]}
              required
              onChange={(event) =>
                setValues((previous) => ({
                  ...previous,
                  [field.key]: event.target.value === "" ? NaN : Number(event.target.value),
                }))
              }
            />
          </AcademicField>
        ))}
        <AcademicField label="Redução da nota após VF">
          <Select
            value={String(values.vfReduction)}
            onChange={(event) =>
              setValues((previous) => ({ ...previous, vfReduction: event.target.value === "true" }))
            }
          >
            <option value="true">Aplicar redução prevista no Regimento</option>
            <option value="false">Não aplicar, conforme decisão registrada</option>
          </Select>
        </AcademicField>
      </div>
      <p className="text-xs text-muted-foreground">
        O limite de disciplinas em VF apoia alertas. A frequência mínima do curso fica registrada
        para validação futura; esta etapa não calcula a frequência global do curso. A situação
        administrativa do cadete exige análise da coordenação.
      </p>
    </AcademicActionForm>
  );
}
