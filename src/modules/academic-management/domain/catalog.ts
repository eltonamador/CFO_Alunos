import type { AcademicKind } from "./academic";

export interface AcademicCatalogEntry {
  readonly code: string;
  readonly name: string;
  readonly phase: 1 | 2 | 3;
  readonly kind: AcademicKind;
  readonly workloadHours: number;
  readonly matrixName: string;
  readonly syllabusHours: number | null;
  readonly sourceRef: string;
  readonly conflicts: readonly string[];
}

/** Reference catalog only: no weights, staff assignments or approved offering rules. */
export const ACADEMIC_CATALOG: readonly AcademicCatalogEntry[] = Object.freeze(
  (
    [
      {
        code: "CFO1-01",
        name: "Sistema de Segurança Pública e Administração Militar",
        phase: 1,
        kind: "disciplina",
        workloadHours: 20,
        matrixName: "SISTEMA DE SEGURANÇA PÚBLICA E ADMINISTRAÇÃO MILITAR",
        syllabusHours: 20,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 3; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 4, CH 20 h/a, página 34. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-02",
        name: "História do Corpo de Bombeiros Militar do Amapá",
        phase: 1,
        kind: "disciplina",
        workloadHours: 20,
        matrixName: "HISTÓRIA DO CORPO DE BOMBEIROS MILITAR DO AMAPÁ",
        syllabusHours: 20,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 4; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 5, CH 20 h/a, página 36. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-03",
        name: "ÉTICA E CIDADANIA NA SEGURANÇA PÚBLICA",
        phase: 1,
        kind: "disciplina",
        workloadHours: 4,
        matrixName: "ÉTICA E CIDADANIA NA SEGURANÇA PÚBLICA",
        syllabusHours: null,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 5; páginas renderizadas 21,22. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "Ementa específica não encontrada no Anexo I; não foi criada ementa presumida.",
        ],
      },
      {
        code: "CFO1-04",
        name: "Direito Administrativo",
        phase: 1,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "DIREITO ADMINISTRATIVO",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 6; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 6, CH 60 h/a, página 37. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-05",
        name: "Direito Constitucional",
        phase: 1,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "DIREITO CONSTITUCIONAL",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 7; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 7, CH 30 h/a, página 39. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-06",
        name: "Direito Administrativo Disciplinar Militar I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "DIREITO ADMINISTRATIVO DISCIPLINAR MILITAR I",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 8; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 8, CH 40 h/a, página 41. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-07",
        name: "Direito Penal Militar I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "DIREITO PENAL MILITAR I",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 9; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 9, CH 30 h/a, página 43. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-08",
        name: "Direito Processual Penal Militar I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "DIREITO PROCESSUAL PENAL MILITAR I",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 10; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 10, CH 30 h/a, página 44. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-09",
        name: "Legislação Bombeiro Militar",
        phase: 1,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "LEGISLAÇÃO BOMBEIRO MILITAR",
        syllabusHours: 38,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 11; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 11, CH 38 h/a, página 46. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "CH divergente: matriz 30 h/a × ementário 38 h/a; exige decisão da coordenação.",
        ],
      },
      {
        code: "CFO1-10",
        name: "Treinamento Físico Militar I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 160,
        matrixName: "TREINAMENTO FÍSICO MILITAR I",
        syllabusHours: 160,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 12; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 12, CH 160 h/a, página 47. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-11",
        name: "Defesa Pessoal, Contenção e Imobilização",
        phase: 1,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "DEFESA PESSOAL CONTENÇÃO E IMPO",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 13; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 13, CH 30 h/a, página 49. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-12",
        name: "Ordem Unida e Instrução Militar I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "ORDEM UNIDA/INSTRUÇÃO MILITAR I",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 14; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 14, CH 80 h/a. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-13",
        name: "Armamento, Munição e Tiro",
        phase: 1,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "ARMAMENTO, MUNIÇÃO E TIRO",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 15; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 15, CH 60 h/a, página 52. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-14",
        name: "Topografia, Orientação, Cartografia e Geotecnologias",
        phase: 1,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "TOPOGRAFIA, ORIENTAÇÃO-CARTOGRAFIA E GEOTECNOLOGIAS",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 16; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 23, CH 30 h/a, página 66. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-15",
        name: "Hidráulica Aplicada à Atividade Bombeiro Militar",
        phase: 1,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "HIDRÁULICA APLICADA A ATIVIDADE BOMBEIRO MILITAR",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 17; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 24, CH 60 h/a, página 68. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-16",
        name: "Anatomia e Fisiologia",
        phase: 1,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "ANATOMIA E FISIOLOGIA",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 18; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 25, CH 40 h/a, página 69. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-17",
        name: "Segurança Contra Incêndio e Pânico I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "SEGURANÇA CONTRA INCÊNDIO PÂNICO I",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 19; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 26, CH 60 h/a, página 71. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-18",
        name: "Salvamento Veicular I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO VEICULAR I",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 20; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 17, CH 80 h/a, página 57. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-19",
        name: "Combate a Incêndios Florestais I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 50,
        matrixName: "COMBATE A INCÊNDIOS FLORESTAIS I",
        syllabusHours: 50,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 21; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 22, CH 50 h/a, página 64. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-20",
        name: "Combate a Incêndio Urbano I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "COMBATE A INCÊNDIOS URBANO I",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 22; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 16, CH 80 h/a, página 55. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-21",
        name: "Atendimento Pré-Hospitalar I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "ATENDIMENTO PRÉ- HOSPITALAR I",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 23; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 18, CH 40 h/a, página 58. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "CH divergente: matriz 80 h/a × ementário 40 h/a; exige decisão da coordenação.",
        ],
      },
      {
        code: "CFO1-22",
        name: "Salvamento Aquático I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO AQUÁTICO I",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 24; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 19, CH 80 h/a, página 59. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-23",
        name: "Salvamento em Altura I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO EM ALTURA I",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 25; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 20, CH 80 h/a, página 61. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-24",
        name: "Salvamento Terrestre I",
        phase: 1,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO TERRESTRE I",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 26; páginas renderizadas 21,22. Anexo I, tabela OOXML índice 21, CH 80 h/a, página 63. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-25",
        name: "ESTÁGIO SUPERVISIONADO",
        phase: 1,
        kind: "estagio",
        workloadHours: 250,
        matrixName: "ESTÁGIO SUPERVISIONADO",
        syllabusHours: null,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 27; páginas renderizadas 21,22. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO1-26",
        name: "ATIVIDADES SÓCIO-CULTURAIS, FORMATURAS PALESTRAS",
        phase: 1,
        kind: "atividade",
        workloadHours: 30,
        matrixName: "ATIVIDADES SÓCIO-CULTURAIS, FORMATURAS PALESTRAS",
        syllabusHours: null,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.1, matriz 1º ano; tabela OOXML índice 1, linha 28; páginas renderizadas 21,22. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-01",
        name: "Gestão de Pessoas",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "GESTÃO DE PESSOAS",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 3; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 27, CH 40 h/a, página 72. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "CH divergente: matriz 30 h/a × ementário 40 h/a; exige decisão da coordenação.",
        ],
      },
      {
        code: "CFO2-02",
        name: "Fundamentos da Gestão Pública – Gestão Pública I",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "FUNDAMENTO DA GESTÃO PÚBLICA  - GESTÃO PÚBLICA I",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 4; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 28, CH 30 h/a, página 73. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-03",
        name: "Atividade de Inteligência Bombeiro Militar",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "ATIVIDADE DE INTELIGÊNCIA BOMBEIRO MILITAR",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 5; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 29, CH 30 h/a, página 74. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-04",
        name: "Metodologia de Ensino",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "METODOLOGIA DE ENSINO",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 6; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 30, CH 30 h/a, página 76. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-05",
        name: "Chefia e Liderança",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "CHEFIA E LIDERANÇA",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 7; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 31, CH 30 h/a, página 77. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-06",
        name: "Psicologia das Emergências e Desastres",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "PSICOLOGIA DAS EMERGÊNCIAS/DESASTRES",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 8; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 32, CH 30 h/a, página 78. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-07",
        name: "Direito Administrativo Disciplinar Militar II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "DIREITO ADMINISTRATIVO DICIPLINAR MILITAR II",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 9; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 33, CH 40 h/a, página 79. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-08",
        name: "Processos de Compras e Licitações",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "PROCESSOS DE COMPRAS E LICITAÇÕES",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 10; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 34, CH 30 h/a, página 80. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-09",
        name: "Direito Ambiental",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "DIREITO AMBIENTAL",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 11; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 35, CH 30 h/a, página 82. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-10",
        name: "Treinamento Físico Militar II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 120,
        matrixName: "TREINAMENTO FÍSICO MILITAR II",
        syllabusHours: 120,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 12; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 36, CH 120 h/a, página 83. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-11",
        name: "Proteção e Defesa Civil I",
        phase: 2,
        kind: "disciplina",
        workloadHours: 50,
        matrixName: "PROTEÇÃO E DEFESA CIVIL I",
        syllabusHours: 50,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 13; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 48, CH 50 h/a, página 100. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-12",
        name: "Ordem Unida e Instrução Militar II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 70,
        matrixName: "ORDEM UNIDA/INSTRUÇÃO MILITAR II",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 14; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 37, CH 80 h/a, página 84. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "CH divergente: matriz 70 h/a × ementário 80 h/a; exige decisão da coordenação.",
        ],
      },
      {
        code: "CFO2-13",
        name: "Sistema de Comando de Incidentes – SCI",
        phase: 2,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "SISTEMA DE COMANDO DE INCIDENTES - SCI",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 15; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 38, CH 40 h/a, página 86. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-14",
        name: "Estatística Aplicada à Segurança Pública",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "ESTATÍSTICA APLICADA À SEGURANÇA PÚBLICA",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 16; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 51, CH 30 h/a, página 104. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-15",
        name: "Metodologia da Pesquisa Científica",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "METODOLOGIA DA PESQUISA CIENTÍFICA",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 17; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 52, CH 30 h/a, página 105. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-16",
        name: "Desenho Técnico",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "DESENHO TÉCNICO",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 18; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 53, CH 30 h/a, página 107. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-17",
        name: "Resistência dos Materiais",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "RESISTÊNCIA DOS MATERIAIS",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 19; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 54, CH 30 h/a, página 108. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-18",
        name: "Geoprocessamento Aplicado à Segurança Pública",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "GEOPROCESSAMENTO APLICADO A SEGURANÇA PÚBLICA",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 20; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 50, CH 30 h/a, página 103. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-19",
        name: "Análise de Risco Estrutural",
        phase: 2,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "ANÁLISE DE RISCO ESTRUTURAL",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 21; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 55, CH 30 h/a, página 109. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-20",
        name: "Segurança Contra Incêndio e Pânico II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SEGURANÇA CONTRA INCÊNDIO PÂNICO II",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 22; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 56, CH 80 h/a, página 110. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-21",
        name: "Equipamento Motomecanizado",
        phase: 2,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "EQUIPAMENTO MOTOMECANIZADO",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 23; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 39, CH 40 h/a, página 87. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-22",
        name: "Planejamento e Comando de Operações Bombeiro Militar",
        phase: 2,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "PLANEJAMENTO E COMANDO DE OPERAÇÕES BOMBEIRO MILITAR",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 24; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 40, CH 40 h/a, página 88. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-23",
        name: "Atendimento Pré-Hospitalar II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "ATENDIMENTO PRÉ- HOSPITALAR II",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 25; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 41, CH 40 h/a, página 90. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-24",
        name: "Busca e Resgate em Estrutura Colapsada",
        phase: 2,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "BUSCA E RESGATE EM ESTRUTURA COLAPSADA",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 26; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 42, CH 40 h/a, página 91. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-25",
        name: "Emergências com Produtos Perigosos",
        phase: 2,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "EMERGÊNCIA COM PRODUTOS PERIGOSOS",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 27; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 43, CH 60 h/a, página 92. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-26",
        name: "Combate a Incêndios Urbanos II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "COMBATE A INCÊNDIOS URBANO II",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 28; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 44, CH 80 h/a, página 94. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-27",
        name: "Operações Bombeiro Militar em Área de Selva",
        phase: 2,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "OPERAÇÕES BOMBEIRO MILITAR EM ÁREA DE SELVA",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 29; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 49, CH 80 h/a, página 101. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-28",
        name: "Salvamento Aquático II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO AQUÁTICO II",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 30; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 45, CH 80 h/a, página 95. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-29",
        name: "Salvamento em Altura II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO EM ALTURA II",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 31; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 46, CH 80 h/a, página 97. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-30",
        name: "Salvamento Terrestre II",
        phase: 2,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO TERRESTRE II",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 32; páginas renderizadas 22,23. Anexo I, tabela OOXML índice 47, CH 80 h/a, página 99. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-31",
        name: "ESTÁGIO SUPERVISIONADO",
        phase: 2,
        kind: "estagio",
        workloadHours: 250,
        matrixName: "ESTÁGIO SUPERVISIONADO",
        syllabusHours: null,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 33; páginas renderizadas 22,23. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO2-32",
        name: "ATIVIDADES SÓCIO-CULTURAIS, FORMATURAS PALESTRAS",
        phase: 2,
        kind: "atividade",
        workloadHours: 60,
        matrixName: "ATIVIDADES SÓCIO-CULTURAIS, FORMATURAS PALESTRAS",
        syllabusHours: null,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.2, matriz 2º ano; tabela OOXML índice 2, linha 34; páginas renderizadas 22,23. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-01",
        name: "Gestão Pública II",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "GESTÃO PÚBLICA II",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 3; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 57, CH 30 h/a, página 112. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-02",
        name: "Saúde e Segurança Aplicada ao Trabalho",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "SAÚDE E SEGURANÇA APLICADA AO TRABALHO",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 4; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 58, CH 30 h/a, página 113. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-03",
        name: "comunicação Social Aplicada à atividade Bombeiro Militar",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "COMUNICAÇÃO SOCIAL BOMBEIRO MILITAR",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 5; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 60, CH 30 h/a, página 116. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-04",
        name: "Direitos Humanos",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "DIREITOS HUMANOS",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 6; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 59, CH 30 h/a, página 114. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-05",
        name: "Proteção e Defesa Civil II",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "PROTEÇÃO E DEFESA CIVIL II",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 7; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 72, CH 30 h/a, página 134. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-06",
        name: "Ordem Unida / Instrução Militar III",
        phase: 3,
        kind: "disciplina",
        workloadHours: 70,
        matrixName: "ORDEM UNIDA",
        syllabusHours: 70,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 8; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 62, CH 70 h/a, página 119. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-07",
        name: "Inteligência Artificial Aplicada à Atividade Bombeiro Militar",
        phase: 3,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "INTELIGENCIA ARTIFICIAL APLICADO A ATIVIDADE BM",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 9; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 73, CH 60 h/a, página 135. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-08",
        name: "Trabalho de Conclusão de Curso",
        phase: 3,
        kind: "tcc",
        workloadHours: 60,
        matrixName: "TRABALHO DE CONCLUSÃO DE CURSO",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 10; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 74, CH 60 h/a, página 137. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-09",
        name: "Fundamentos de Investigação e Perícia de Incêndio",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "FUNDAMENTOS DE INVESTIGAÇÃO E PERÍCIA DE INCÊNDIO",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 12; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 75, CH 30 h/a, página 138. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-10",
        name: "Instalações Hidráulicas de Segurança Contra Incêndio",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "INSTALAÇÕES HIDRÁULICAS DE SEG. CONTRA INCÊNDIO",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 13; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 76, CH 30 h/a, página 140. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-11",
        name: "Viaturas Operacionais",
        phase: 3,
        kind: "disciplina",
        workloadHours: 30,
        matrixName: "VIATURAS OPERACIONAIS",
        syllabusHours: 30,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 14; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 77, CH 30 h/a, página 141. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-12",
        name: "Atividades Técnicas – Vistoria e Análise de Projetos (CAPIEAR)",
        phase: 3,
        kind: "disciplina",
        workloadHours: 110,
        matrixName: "ATIVIDADES TÉCNICAS (VISTORIAS E ANÁLISE DE PROJETOS) CURSO CAPIEAR",
        syllabusHours: 110,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 15; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 78, CH 110 h/a, página 142. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-13",
        name: "Gerenciamento de Ocorrências",
        phase: 3,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "GERENCIAMENTO DE OCORRÊNCIAS",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 16; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 64, CH 40 h/a, página 122. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "A matriz contém Gerenciamento de Ocorrências e SCI como componentes distintos; preservar ambos.",
        ],
      },
      {
        code: "CFO3-14",
        name: "Treinamento Físico Militar III",
        phase: 3,
        kind: "disciplina",
        workloadHours: 160,
        matrixName: "TREINAMENTO FÍSICO MILITAR III",
        syllabusHours: 160,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 17; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 61, CH 160 h/a, página 117. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-15",
        name: "Sistema de Comando de Incidentes - SCI",
        phase: 3,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "SISTEMA DE COMANDO DE INCIDENTES - SCI  (GERENCIAMENTO DE OCORRÊNCIAS)",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 18; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 63, CH 60 h/a, página 120. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "A matriz contém Gerenciamento de Ocorrências e SCI como componentes distintos; preservar ambos.",
        ],
      },
      {
        code: "CFO3-16",
        name: "Perícia de Incêndio e Explosão (Inspeção de Incêndio)",
        phase: 3,
        kind: "disciplina",
        workloadHours: 60,
        matrixName: "PERICIA DE INCÊNDIO E EXPLOSÃO (INSPEÇÃO DE INCÊNDIO)",
        syllabusHours: 60,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 19; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 65, CH 60 h/a, página 123. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-17",
        name: "Abordagem Técnica à Tentativas de Suicídio",
        phase: 3,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "ABORDAGEM TÉCNCA A TENTATIVA DE SUICÍDIO",
        syllabusHours: 43,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 20; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 66, CH 43 h/a, página 124. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [
          "CH divergente: matriz 40 h/a × ementário 43 h/a; exige decisão da coordenação.",
        ],
      },
      {
        code: "CFO3-18",
        name: "Atendimento Pré-Hospitalar III",
        phase: 3,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "ATENDIMENTO PRÉ- HOSPITALAR III",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 21; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 67, CH 40 h/a, página 126. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-19",
        name: "Combate a Incêndio Urbano III",
        phase: 3,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "COMBATE A INCÊNDIOS URBANO III",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 22; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 68, CH 80 h/a, página 127. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-20",
        name: "Salvamento Aquático III",
        phase: 3,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO AQUÁTICO III",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 23; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 69, CH 80 h/a, página 129. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-21",
        name: "Salvamento Veicular II",
        phase: 3,
        kind: "disciplina",
        workloadHours: 40,
        matrixName: "SALVAMENTO VEICULAR II",
        syllabusHours: 40,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 24; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 70, CH 40 h/a, página 130. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-22",
        name: "Salvamento em Altura III",
        phase: 3,
        kind: "disciplina",
        workloadHours: 80,
        matrixName: "SALVAMENTO ALTURA III",
        syllabusHours: 80,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 25; páginas renderizadas 23,24. Anexo I, tabela OOXML índice 71, CH 80 h/a, página 132. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-23",
        name: "ESTÁGIO SUPERVISIONADO",
        phase: 3,
        kind: "estagio",
        workloadHours: 300,
        matrixName: "ESTÁGIO SUPERVISIONADO",
        syllabusHours: null,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 26; páginas renderizadas 23,24. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
      {
        code: "CFO3-24",
        name: "ATIVIDADES SÓCIO-CULTURAIS, FORMATURAS PALESTRAS",
        phase: 3,
        kind: "atividade",
        workloadHours: 60,
        matrixName: "ATIVIDADES SÓCIO-CULTURAIS, FORMATURAS PALESTRAS",
        syllabusHours: null,
        sourceRef:
          "PPC CFO CBMAP 2026–2029, revisão local, seção 4.6.3, matriz 3º ano; tabela OOXML índice 3, linha 27; páginas renderizadas 23,24. SHA256 822a4db4eaa233922d41ea46834ac64fdf6a03160911c26285c4f6299f697ace. Cadastro de referência, pendente de homologação.",
        conflicts: [],
      },
    ] as AcademicCatalogEntry[]
  ).map((entry) => Object.freeze({ ...entry, conflicts: Object.freeze(entry.conflicts) })),
);

/** Conflicting counts are shown as evidence; this function never selects a policy. */
export function vcCountEvidence(workloadHours: number): {
  ppcMinimum: number;
  regimentoRequired: number | null;
  requiresDecision: boolean;
} {
  if (!Number.isFinite(workloadHours) || workloadHours <= 0)
    throw new RangeError("Carga horária inválida.");
  const ppcMinimum = workloadHours <= 30 ? 1 : workloadHours <= 60 ? 2 : 3;
  const regimentoRequired =
    workloadHours <= 20 ? 1 : workloadHours <= 40 ? 2 : workloadHours > 60 ? 3 : null;
  return {
    ppcMinimum,
    regimentoRequired,
    requiresDecision: regimentoRequired === null || ppcMinimum !== regimentoRequired,
  };
}
