import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths exceto:
     * - _next/static (assets)
     * - _next/image
     * - favicon.ico, manifest, sw, ícones
     * - rotas de imagem (svg, png, jpg…)
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|offline\\.html$|escala-offline\\.html$|qts-offline\\.html$|schedule-readers/|icons/.*\\.png$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
