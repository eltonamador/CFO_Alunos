import { z } from "zod";

/**
 * Validação centralizada de variáveis de ambiente.
 * Falha cedo, no boot, com mensagem clara.
 */
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20).optional(),
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().min(20).optional(),
  VAPID_PRIVATE_KEY: z.string().min(20).optional(),
  VAPID_SUBJECT: z.string().min(5).optional(),
  RESEND_API_KEY: z.string().min(10).optional(),
  BIRTHDAY_EMAIL_FROM: z.string().min(5).optional(),
  CRON_SECRET: z.string().min(16).optional(),
  NEXT_PUBLIC_APP_NAME: z.string().default("CFO Alunos"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_SUBJECT: process.env.VAPID_SUBJECT,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  BIRTHDAY_EMAIL_FROM: process.env.BIRTHDAY_EMAIL_FROM,
  CRON_SECRET: process.env.CRON_SECRET,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!parsed.success) {
  console.error("❌ Variáveis de ambiente inválidas:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuração inválida — verifique .env.local (veja .env.example).");
}

export const env = parsed.data;
