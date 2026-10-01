import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import { cleanDiaryJpeg, DIARY_PHOTO_MAX_BYTES } from "@/modules/internship-management/domain/diaryPhoto";
import {
  diaryPhotosConfigured,
  listDiaryPhotos,
  uploadDiaryPhoto,
} from "@/modules/internship-management/infrastructure/diaryPhotosDrive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const invalid = () => NextResponse.json({ error: "Relato não encontrado." }, { status: 404 });

async function entryAccess(id: string) {
  if (!z.string().uuid().safeParse(id).success) return null;
  const session = await getSession();
  if (!session?.active || !["aluno", "coordenacao"].includes(session.role)) return null;
  const { data } = await createSupabaseServerClient()
    .from("internship_diary_entries")
    .select("id,student_id")
    .eq("id", id)
    .maybeSingle();
  return data ? { owner: session.role === "aluno" && data.student_id === session.studentId } : null;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await entryAccess(params.id))) return invalid();
  if (!diaryPhotosConfigured()) return NextResponse.json({ enabled: false, photos: [] });
  try {
    return NextResponse.json(
      { enabled: true, photos: await listDiaryPhotos(params.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json({ error: "Fotos temporariamente indisponíveis." }, { status: 503 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const access = await entryAccess(params.id);
  if (!access?.owner) return invalid();
  if (!diaryPhotosConfigured())
    return NextResponse.json({ error: "Fotos ainda não configuradas." }, { status: 503 });
  const declared = Number(request.headers.get("content-length"));
  if (declared > DIARY_PHOTO_MAX_BYTES + 10_000)
    return NextResponse.json({ error: "Foto acima de 1 MiB." }, { status: 413 });
  let form: FormData;
  try { form = await request.formData(); }
  catch { return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 }); }
  if (form.get("confirmado") !== "true")
    return NextResponse.json({ error: "Confirme a regra de uso de imagens." }, { status: 400 });
  const file = form.get("foto");
  if (!(file instanceof File) || file.type !== "image/jpeg" || file.size > DIARY_PHOTO_MAX_BYTES)
    return NextResponse.json({ error: "Envie uma foto JPEG de até 1 MiB." }, { status: 400 });
  const clean = cleanDiaryJpeg(new Uint8Array(await file.arrayBuffer()));
  if (!clean) return NextResponse.json({ error: "Imagem inválida ou grande demais." }, { status: 400 });
  try {
    const photo = await uploadDiaryPhoto(params.id, clean);
    return NextResponse.json({ photo }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof RangeError)
      return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ error: "Não foi possível enviar a foto ao Drive." }, { status: 503 });
  }
}
