export const evaluationCriteria = [
  {
    key: "pontualidade",
    title: "Pontualidade e apresentação",
    description: "Apresenta-se no horário, uniformizado e com os equipamentos individuais exigidos.",
  },
  {
    key: "seguranca",
    title: "Segurança e limites de atuação",
    description: "Usa EPI, reconhece riscos e não executa tarefas sem ensino, treinamento ou autorização.",
  },
  {
    key: "tecnica",
    title: "Materiais e prontificação",
    description: "Confere, organiza, conserva e recompõe os materiais da viatura sob orientação.",
  },
  {
    key: "equipe",
    title: "Comunicação e trabalho em equipe",
    description: "Comunica-se com clareza, coopera com a guarnição e respeita o fluxo de comando.",
  },
  {
    key: "postura",
    title: "Disciplina e postura profissional",
    description: "Cumpre orientações, respeita a hierarquia, as pessoas e a confidencialidade.",
  },
  {
    key: "aprendizagem",
    title: "Iniciativa e aprendizagem",
    description: "Oferece apoio dentro dos limites, faz perguntas pertinentes e aplica a devolutiva recebida.",
  },
] as const;
export const evaluationTechnicalCriteria = {
  usb: [
    {
      key: "usb_abordagem",
      title: "Cena e avaliação inicial",
      description: "Apoia a avaliação da cena e os sinais vitais conforme orientação e conteúdo já ministrado.",
    },
    {
      key: "usb_cuidado",
      title: "APH, movimentação e transferência",
      description: "Prepara materiais e auxilia na mobilização, transporte e passagem da vítima sob supervisão.",
    },
  ],
  ar: [
    {
      key: "ar_preparo",
      title: "Reconhecimento e preparo",
      description: "Identifica riscos e zonas de trabalho e prepara equipamentos compatíveis com sua formação.",
    },
    {
      key: "ar_apoio",
      title: "Apoio e recomposição",
      description: "Apoia técnicas autorizadas e ajuda a limpar e prontificar a AR após a ocorrência.",
    },
  ],
  guarda_vida: [
    {
      key: "praia_prevencao",
      title: "Prevenção e vigilância",
      description: "Observa a área de banho, identifica riscos e comunica orientações e alertas sob supervisão.",
    },
    {
      key: "praia_apoio",
      title: "Apoio ao salvamento e prontificação",
      description: "Prepara materiais, apoia a resposta e recompõe o posto somente nas atividades ensinadas e autorizadas.",
    },
  ],
  geral: [],
} as const;
export type EvaluationServiceCode = keyof typeof evaluationTechnicalCriteria;
export function evaluationServiceCode(activityName: string): EvaluationServiceCode {
  if (/^USB\b/i.test(activityName)) return "usb";
  if (/^AR\b/i.test(activityName)) return "ar";
  if (/guarda[- ]?vidas?|serviço de praia|praia/i.test(activityName)) return "guarda_vida";
  return "geral";
}
export const evaluationTechnicalTitle: Record<EvaluationServiceCode, string> = {
  usb: "USB · APH",
  ar: "AR · Salvamento",
  guarda_vida: "Serviço de praia · Guarda-vidas",
  geral: "",
};
export const evaluationActivities = [
  { value: "materiais", label: "Conferência de material" },
  { value: "cena", label: "Avaliação da cena" },
  { value: "apoio", label: "Apoio técnico" },
  { value: "comunicacao", label: "Comunicação" },
  { value: "prontificacao", label: "Prontificação" },
] as const;
export const evaluationAnswers = [
  { value: "reforco", label: "Necessita de reforço" },
  { value: "esperado", label: "Atende ao esperado" },
  { value: "acima", label: "Acima do esperado" },
  { value: "nao_observado", label: "Não observado" },
] as const;
export type EvaluationRatings = Record<
  (typeof evaluationCriteria)[number]["key"],
  (typeof evaluationAnswers)[number]["value"]
>;
export type EvaluationDetails = {
  formVersion: 2;
  evaluatorFunction: "comandante" | "chefe" | "outro" | "nao_informado";
  evaluatorFunctionOther: string;
  vehiclePrefix: string;
  occurrenceCount: number;
  activities: (typeof evaluationActivities)[number]["value"][];
  technicalRatings: Record<string, (typeof evaluationAnswers)[number]["value"]>;
  positiveNote: string;
  feedbackGiven: "sim" | "nao" | "nao_informado";
  coordinationNotified: boolean;
};
export type EvaluationContext = {
  student_number: number;
  war_name: string;
  course_phase: string;
  activity_name: string;
  site_name: string;
  starts_at: string;
  ends_at: string;
};
export const evaluationStatus: Record<string, string> = {
  aguardando: "Aguardando oficial",
  respondida: "Recebida · revisar",
  liberada: "Revisada e liberada",
  devolvida: "Revisão solicitada",
  revogada: "Convite cancelado",
};
export function evaluationDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Belem",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
