import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SIGLAS_MAP: Record<string, string> = {
  "RIVALDO": "RIV",
  "IAN LIMA": "LIM",
  "P. AMARAL": "PAM",
  "V. MARTINS": "VMS",
  "SABRINA": "SAB",
  "CAXIAS": "CAX",
  "GABRIEL": "GAB",
  "PABLO": "PAB",
  "CRISTINE": "CRS",
  "GEOVAN": "GEV",
  "GLEITON": "GLT",
  "FERNANDES": "FER",
  "GIOVANNA": "GVN",
  "ARIADNE": "ARD",
  "CAMPOS": "CAM",
  "DIAS JUNIOR": "DJR",
  "SALES": "SAL",
  "SERRA DIAS": "SRD",
  "FREIRE": "FRE",
  "T. SANTOS": "TST",
  "JOAO": "JOA",
  "SAMILO": "SAM",
  "M. NASCIMENTO": "MNS",
  "ARTUR": "ART",
  "FREDSON": "FRD",
  "SILVA NUNES": "SVN",
  "MILENA": "MIL",
  "J. BORGES": "JBG",
  "CAROLINA": "CAR",
  "JULIANA": "JUL"
};

const SIGLAS_ARRAY = [
  "RIV", "LIM", "PAM", "VMS", "SAB", "CAX", "GAB", "PAB", "CRS", "GEV",
  "GLT", "FER", "GVN", "ARD", "CAM", "DJR", "SAL", "SRD", "FRE", "TST",
  "JOA", "SAM", "MNS", "ART", "FRD", "SVN", "MIL", "JBG", "CAR", "JUL"
];

export function getStudentSigla(studentNumber: number | null, warName: string): string {
  if (studentNumber && studentNumber >= 1 && studentNumber <= 30) {
    return SIGLAS_ARRAY[studentNumber - 1] ?? "???";
  }

  const normalizedWarName = warName.trim().toUpperCase();
  if (SIGLAS_MAP[normalizedWarName]) {
    return SIGLAS_MAP[normalizedWarName];
  }

  // Fallback de 3 letras se não estiver mapeado
  const parts = normalizedWarName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "???";
  const first = parts[0] ?? "";
  if (parts.length === 1) return first.slice(0, 3).padEnd(3, "X");
  const last = parts[parts.length - 1] ?? "";
  return (first[0] + last.slice(0, 2)).padEnd(3, "X");
}

