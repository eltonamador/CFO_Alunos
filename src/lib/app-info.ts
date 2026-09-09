/**
 * Metadados institucionais do aplicativo — usados na tela "Sobre o aplicativo".
 * Mantenha `version` em sincronia com o campo `version` do package.json.
 */
export const APP_INFO = {
  /** Nome por extenso do aplicativo (bloco "Aplicativo"). */
  name: "Sistema de Gestão de Alunos — CFO",
  /** Identificação curta do sistema (bloco "Identificação"). */
  identifier: "CFO-Alunos",
  /** Unidade responsável — usada no rodapé da tela. */
  organization: "CBMAP · Academia Bombeiro Militar",
  version: "0.1.0",
  year: 2026,
  author: {
    name: "Cap QOEM BM Amador",
    organization: "Corpo de Bombeiros Militar do Amapá — CBMAP",
    initials: "FA",
    photo: "/sobre/cap-amador.jpg",
    /**
     * Enquadramento do retrato circular. A arte original é de corpo inteiro
     * sobre fundo branco, então aproximamos o recorte na cabeça/ombros:
     * `zoom` amplia e `focusX`/`focusY` (% da imagem) marcam o ponto que deve
     * ficar no centro do círculo.
     *
     * Se a imagem for substituída por um retrato já recortado (quadrado,
     * centrado no rosto), use `zoom: 1, focusX: 50, focusY: 50`.
     */
    portraitFraming: { zoom: 1.4, focusX: 46, focusY: 33 },
  },
  description:
    "Aplicativo desenvolvido para apoiar o acompanhamento e a gestão das informações dos cadetes do Curso de Formação de Oficiais.",
} as const;
