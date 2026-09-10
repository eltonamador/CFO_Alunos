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
  const [attendanceMode, setAttendanceMode] = useState("");
  const [penaltyStage, setPenaltyStage] = useState("");
  const [vfMinAverage, setVfMinAverage] = useState("");
  const [decimals, setDecimals] = useState("");
  const [comparisonStage, setComparisonStage] = useState("");
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
      disabled={
        !attendanceMode || !penaltyStage || vfMinAverage === "" || !decimals || !comparisonStage
      }
    >
      <p className="text-sm text-muted-foreground">
        Os valores abaixo são uma proposta para conferência. A coordenação deve registrar o ato que
        resolve as divergências antes de habilitar o cálculo. A política aprovada fica fixada a esta
        oferta.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        <AcademicField label="Nome da política">
          <Input name="name" required minLength={3} placeholder="Política aprovada para a oferta" />
        </AcademicField>
        <AcademicField label="Referência da decisão da coordenação">
          <Input
            name="decision_ref"
            required
            minLength={5}
            placeholder="Ato, data e identificação da decisão"
          />
        </AcademicField>
        <AcademicField
          label="Faltas que contam para o limite"
          hint="Escolha explícita necessária: há divergência normativa."
        >
          <Select
            required
            value={attendanceMode}
            onChange={(event) => setAttendanceMode(event.target.value)}
          >
            <option value="" disabled>
              Escolha a regra aprovada
            </option>
            <option value="total">Justificadas e não justificadas</option>
            <option value="unjustified">Somente não justificadas</option>
          </Select>
        </AcademicField>
        <AcademicField label="Momento do desconto por faltas" hint="Escolha explícita necessária.">
          <Select
            required
            value={penaltyStage}
            onChange={(event) => setPenaltyStage(event.target.value)}
          >
            <option value="" disabled>
              Escolha a regra aprovada
            </option>
            <option value="before_vf">Na média corrente, antes de avaliar a VF</option>
            <option value="after_vf">Na nota final, após VF e redutor quando houver</option>
          </Select>
        </AcademicField>
        <AcademicField
          label="Média mínima para acesso à VF"
          hint={`Proposta para conferência: ${initial.vfMinAverage}. Informe o valor aprovado.`}
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
          hint="Escolha explícita necessária para resolver a divergência normativa."
        >
          <Select
            required
            value={comparisonStage}
            onChange={(event) => setComparisonStage(event.target.value)}
          >
            <option value="" disabled>
              Escolha o critério aprovado
            </option>
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
