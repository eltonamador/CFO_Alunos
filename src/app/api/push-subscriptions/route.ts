import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { getSession } from "@/modules/identity/presentation/session";

const subscriptionSchema = z.object({
  endpoint: z.string().url().startsWith("https://"),
  expirationTime: z.number().nullable().optional(),
  keys: z.object({
    p256dh: z.string().min(20),
    auth: z.string().min(8),
  }),
});

async function requireAdministrativeSession() {
  const session = await getSession();
  if (!session)
    return {
      session: null,
      response: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  if (session.role !== "coordenacao" && session.role !== "secretaria") {
    return {
      session: null,
      response: NextResponse.json({ error: "Acesso negado" }, { status: 403 }),
    };
  }
  return { session, response: null };
}

export async function GET() {
  const auth = await requireAdministrativeSession();
  if (!auth.session) return auth.response;

  const supabase = createServerClientUntyped();
  const { count, error } = await supabase
    .from("push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", auth.session.userId)
    .eq("enabled", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({
    publicKey: env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? null,
    pushConfigured: Boolean(
      env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT,
    ),
    emailConfigured: Boolean(env.RESEND_API_KEY && env.BIRTHDAY_EMAIL_FROM),
    subscriptionCount: count ?? 0,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdministrativeSession();
  if (!auth.session) return auth.response;
  if (!env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) {
    return NextResponse.json({ error: "Web Push ainda não foi configurado" }, { status: 503 });
  }

  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Assinatura Web Push inválida" }, { status: 400 });
  }

  const supabase = createServerClientUntyped();
  const { data, error } = await supabase
    .from("push_subscriptions")
    .upsert(
      {
        user_id: auth.session.userId,
        endpoint: parsed.data.endpoint,
        p256dh: parsed.data.keys.p256dh,
        auth: parsed.data.keys.auth,
        user_agent: request.headers.get("user-agent"),
        enabled: true,
      },
      { onConflict: "endpoint" },
    )
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdministrativeSession();
  if (!auth.session) return auth.response;

  const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!body || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "Endpoint não informado" }, { status: 400 });
  }

  const supabase = createServerClientUntyped();
  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", auth.session.userId)
    .eq("endpoint", body.endpoint);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
