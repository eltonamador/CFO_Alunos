import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "CFO Alunos — CBMAP",
    template: "%s — CFO Alunos",
  },
  description:
    "Sistema de gestão dos alunos do Curso de Formação de Oficiais — Corpo de Bombeiros Militar do Amapá.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CFO Alunos",
  },
};

export const viewport: Viewport = {
  themeColor: "#B91C1C",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  );
}
