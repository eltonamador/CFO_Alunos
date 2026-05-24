/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { AuditLogRow } from "@/lib/supabase/queries/students";

interface Props {
  _studentId: string;
  logs: AuditLogRow[];
  studentMap: Record<string, string>; // Maps student UUID -> student War Name
}

const FIELD_LABELS: Record<string, string> = {
  student_number: "Número",
  pelotao: "Fase do CFO",
  war_name: "Nome de Guerra",
  full_name: "Nome Completo",
  situation: "Situação",
  sex: "Sexo",
  birth_date: "Data de Nascimento",
  cpf: "CPF",
  rg: "RG",
  enrollment_id: "Matrícula",
  marital_status: "Estado Civil",
  education_level: "Escolaridade",
  whatsapp: "WhatsApp",
  phone_secondary: "Telefone Secundário",
  email_personal: "E-mail Pessoal",
  email_institutional: "E-mail Institucional",
  blood_type: "Tipo Sanguíneo",
  rh_factor: "Fator RH",
  allergies: "Alergias",
  continuous_medication: "Medicação Contínua",
  chronic_disease: "Doença Crônica",
  physical_restriction: "Restrição Física",
  dietary_restriction: "Restrição Alimentar",
  uses_glasses: "Usa Óculos/Lentes",
  medical_notes: "Notas Médicas",
  operational_summary: "Resumo Operacional",
  validation_status: "Status de Validação",
  has_fixed_residence_macapa: "Residência Fixa Macapá",
  course_address: "Endereço no Curso",
  needs_housing: "Necessita Alojamento",
  has_family_in_ap: "Família no AP",
  local_contact: "Contato Local",
  has_vehicle: "Possui Veículo",
  vehicle_type: "Tipo de Veículo",
  plate: "Placa",
  has_cnh: "Possui CNH",
  cnh_category: "Categoria CNH",
  cnh_valid_until: "Validade CNH",
  cnh_attached: "CNH Anexada",
  available_for_deployment: "Disponível para Escala",
  canga_student_id: "Canga (Companheiro)",
  is_current: "Designação Atual",
  notes: "Notas/Observações",
};

const ACTION_COLORS: Record<string, string> = {
  insert: "bg-blue-50 text-blue-700 border-blue-200",
  update: "bg-amber-50 text-amber-700 border-amber-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  validate: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reject: "bg-rose-50 text-rose-700 border-rose-200",
  view_emergency_contact: "bg-purple-50 text-purple-700 border-purple-200",
};

const ENTITY_LABELS: Record<string, string> = {
  students: "Dados Gerais / Cadastrais",
  health_restrictions: "Saúde / Ficha Médica",
  documents: "Documentos Anexados",
  canga_assignments: "Designação de Canga",
  emergency_contacts: "Contato de Emergência",
  student_contacts: "Dados de Contato",
  student_addresses: "Dados de Endereço",
  student_logistics: "Logística / Alojamento",
  vehicles: "Veículos / CNH",
};

export function HistoricoTab({ _studentId, logs, studentMap }: Props) {
  // Helper to format values for presentation
  const formatValue = (key: string, value: any) => {
    if (value === null || value === undefined || value === "") return <span className="text-muted-foreground italic">vazio</span>;
    if (typeof value === "boolean") return value ? "Sim" : "Não";
    
    // Resolve UUIDs for canga or student fields
    if (key === "canga_student_id" && typeof value === "string") {
      return studentMap[value] || `Aluno (${value.substring(0, 6)})`;
    }
    
    return String(value);
  };

  // Extract changed fields side-by-side
  const getModifiedFields = (before: any, after: any) => {
    if (!before && !after) return [];
    
    const changes: Array<{ field: string; beforeVal: any; afterVal: any }> = [];
    const beforeObj = before || {};
    const afterObj = after || {};
    const allKeys = Array.from(new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]));

    for (const key of allKeys) {
      if (["id", "created_at", "updated_at", "student_id", "assigned_by", "assigned_at"].includes(key)) {
        continue;
      }
      const bVal = beforeObj[key];
      const aVal = afterObj[key];
      
      if (JSON.stringify(bVal) !== JSON.stringify(aVal)) {
        changes.push({
          field: key,
          beforeVal: bVal,
          afterVal: aVal,
        });
      }
    }
    return changes;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          Histórico e Auditoria do Aluno
        </CardTitle>
        <CardDescription>
          Registro cronológico imutável (append-only) de todas as consultas a dados sensíveis, cadastros e alterações administrativas.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum log de auditoria registrado para este aluno.
          </div>
        ) : (
          <div className="relative border-l border-zinc-200 ml-4 pl-6 space-y-8">
            {logs.map((log) => {
              const dateObj = new Date(log.created_at);
              const formattedDate = dateObj.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              });
              const formattedTime = dateObj.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              });

              const changes = getModifiedFields(log.before_data, log.after_data);
              const isUpdate = log.action === "update";
              const isInsert = log.action === "insert";
              const isDelete = log.action === "delete";
              const isView = log.action === "view_emergency_contact";

              // Icon/Bullet colors depending on action
              let bulletColor = "bg-zinc-200 border-zinc-300 ring-zinc-100";
              if (isInsert) bulletColor = "bg-blue-500 border-blue-600 ring-blue-100";
              if (isUpdate) bulletColor = "bg-amber-500 border-amber-600 ring-amber-100";
              if (isDelete) bulletColor = "bg-red-500 border-red-600 ring-red-100";
              if (isView) bulletColor = "bg-purple-500 border-purple-600 ring-purple-100";

              return (
                <div key={log.id} className="relative group">
                  {/* Timeline Bullet */}
                  <div className={`absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 ${bulletColor} ring-4 transition-transform group-hover:scale-110`} />
                  
                  {/* Log Content Card */}
                  <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-100 shadow-sm transition-all hover:shadow hover:border-zinc-200">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      {/* Action & Entity Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`font-semibold px-2 py-0.5 rounded-md border text-xs capitalize ${
                            ACTION_COLORS[log.action] || "bg-zinc-50 text-zinc-700"
                          }`}
                        >
                          {log.action === "view_emergency_contact" ? "visualização" : log.action}
                        </Badge>
                        <span className="text-zinc-400 text-xs">•</span>
                        <span className="font-semibold text-zinc-700 text-xs">
                          {ENTITY_LABELS[log.entity] || log.entity}
                        </span>
                      </div>
                      
                      {/* Date & Time */}
                      <div className="text-xs text-muted-foreground font-mono">
                        {formattedDate} às {formattedTime}
                      </div>
                    </div>

                    {/* Change Description */}
                    <div className="text-sm text-zinc-800 mb-2">
                      {isView && (
                        <span>
                          Os contatos de emergência deste aluno foram consultados por{" "}
                          <strong className="text-zinc-900">{log.actor_name}</strong>.
                        </span>
                      )}
                      
                      {!isView && (
                        <span>
                          Registro modificado por{" "}
                          <strong className="text-zinc-900">{log.actor_name}</strong> (
                          <span className="text-xs text-muted-foreground uppercase">{log.actor_role}</span>).
                        </span>
                      )}
                      
                      {log.reason && (
                        <p className="mt-1 text-xs text-zinc-500 italic bg-white border border-zinc-100 rounded p-2">
                          <strong>Motivo: </strong> {log.reason}
                        </p>
                      )}
                    </div>

                    {/* Comparisons and details for changes */}
                    {changes.length > 0 && (
                      <div className="mt-3 overflow-x-auto border border-zinc-200 rounded-lg bg-white">
                        <table className="min-w-full divide-y divide-zinc-200 text-xs">
                          <thead className="bg-zinc-50">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold text-zinc-600">Campo</th>
                              <th className="px-3 py-2 text-left font-semibold text-zinc-600">Valor Anterior</th>
                              <th className="px-3 py-2 text-left font-semibold text-zinc-600">Novo Valor</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-100 font-mono">
                            {changes.map((ch, idx) => (
                              <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                                <td className="px-3 py-2 font-sans font-semibold text-zinc-700">
                                  {FIELD_LABELS[ch.field] || ch.field}
                                </td>
                                <td className="px-3 py-2 text-red-600 line-through whitespace-pre-wrap">
                                  {formatValue(ch.field, ch.beforeVal)}
                                </td>
                                <td className="px-3 py-2 text-emerald-700 font-semibold bg-emerald-50/20 whitespace-pre-wrap">
                                  {formatValue(ch.field, ch.afterVal)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Show whole row data for Inserts / Deletes (only if not an update and has data) */}
                    {!isUpdate && !isView && (log.before_data || log.after_data) && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <details className="cursor-pointer group">
                          <summary className="font-semibold text-zinc-600 group-hover:text-zinc-900 transition-colors">
                            Visualizar dados completos do registro ({isInsert ? "Inserido" : "Removido"})
                          </summary>
                          <pre className="mt-2 p-3 bg-zinc-950 text-zinc-200 rounded-lg overflow-x-auto font-mono text-[11px] leading-relaxed">
                            {JSON.stringify(log.after_data || log.before_data, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
