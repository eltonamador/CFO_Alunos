import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { fetchProfile } from "@/lib/supabase/queries/profiles";
import type { Database } from "@/lib/supabase/types";

type UserRole = "coordenacao" | "secretaria" | "instrutor" | "aluno";

const PUBLIC_PATHS = [
  "/login",
  "/primeiro-acesso",
  "/offline",
  "/api/jobs/birthday-notifications",
];

const ROLE_HOME: Record<UserRole, string> = {
  coordenacao: "/coordenacao",
  secretaria: "/secretaria",
  instrutor: "/instrutor",
  aluno: "/aluno",
};

const ROLE_PREFIXES: Record<UserRole, string[]> = {
  coordenacao: ["/coordenacao"],
  secretaria: ["/secretaria"],
  instrutor: ["/instrutor"],
  aluno: ["/aluno"],
};

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * Refresh de sessão + guard de rotas + redirect por role.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Não autenticado em rota privada → /login
  if (!user) {
    if (!isPublicPath(pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  const isFirstAccess = !user.user_metadata?.password_changed_at;

  // Primeiro acesso: força /primeiro-acesso até trocar
  if (isFirstAccess && pathname !== "/primeiro-acesso" && pathname !== "/offline") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/primeiro-acesso";
    return NextResponse.redirect(redirectUrl);
  }

  // Autenticado em /login ou / → redireciona para home do role
  if (pathname === "/login" || pathname === "/") {
    const profile = await fetchProfile(supabase, user.id);
    const role: UserRole = profile?.role ?? "aluno";
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = isFirstAccess ? "/primeiro-acesso" : ROLE_HOME[role];
    return NextResponse.redirect(redirectUrl);
  }

  // Role gating: rota /coordenacao só para coordenacao, etc.
  const sectionMatch = (Object.entries(ROLE_PREFIXES) as [UserRole, string[]][]).find(
    ([, prefixes]) => prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`)),
  );

  if (sectionMatch) {
    const [expectedRole] = sectionMatch;
    const profile = await fetchProfile(supabase, user.id);
    const actualRole: UserRole = profile?.role ?? "aluno";
    if (actualRole !== expectedRole) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = ROLE_HOME[actualRole];
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}
