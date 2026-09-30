export function normalizeEvaluatorWhatsApp(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  if (/^9\d{8}$/.test(digits)) return `5596${digits}`;
  if (/^\d{2}9\d{8}$/.test(digits)) return `55${digits}`;
  if (/^55\d{2}9\d{8}$/.test(digits)) return digits;
  return null;
}
