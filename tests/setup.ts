import "@testing-library/jest-dom/vitest";

// Variáveis mínimas para o módulo env não estourar nos testes.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key-with-enough-length-xxxxxxxx";
process.env.NEXT_PUBLIC_APP_URL ??= "http://localhost:3000";
