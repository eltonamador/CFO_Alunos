import type { UserRoleValue } from "@/shared/domain";

export type ReportType =
  | "lista_geral"
  | "contatos"
  | "emergencia"
  | "veiculos"
  | "outro_estado"
  | "pendencias_documentos"
  | "pendencias_materiais_por_aluno"
  | "pendencias_materiais_por_item"
  | "duvidas_abertas";

export interface ReportRequest {
  type: ReportType;
  classId: string;
  requestedBy: string;
  actorRole: UserRoleValue;
}

export interface IReportGenerator {
  generate(request: ReportRequest): Promise<Buffer>;
}
