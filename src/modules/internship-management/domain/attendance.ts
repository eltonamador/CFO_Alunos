export const locationLabels: Record<string, string> = {
  dentro: "Dentro do raio cadastrado",
  fora: "Fora do raio — conferir",
  impreciso: "Precisão insuficiente — conferir",
  sem_configuracao: "Local sem coordenadas cadastradas — conferir",
  praia_livre: "Praia — posição registrada sem raio fixo",
};
export type AttendancePointData = {
  id: string;
  point_type: string;
  recorded_at: string;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  distance_m: number | null;
  location_status: string;
  supervisor_name: string | null;
};
