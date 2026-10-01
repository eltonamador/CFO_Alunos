import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/modules/identity/presentation/session";
import {
  deleteDiaryPhoto,
  readDiaryPhoto,
} from "@/modules/internship-management/infrastructure/diaryPhotosDrive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const invalid = () => NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });

async function access(id: string, photoId: string) {
  if (!z.string().uuid().safeParse(id).success || !z.string().regex(/^[A-Za-z0-9_-]{10,160}$/).safeParse(photoId).success)
    return null;
  const session = await getSession();
  if (!session?.active || !["aluno", "coordenacao"].includes(session.role)) return null;
  const { data } = await createSupabaseServerClient()
    .from("internship_diary_entries")
    .select("id,student_id")
    .eq("id", id)
    .maybeSingle();
  return data ? { owner: session.role === "aluno" && data.student_id === session.studentId } : null;
}

export async function GET(_request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  if (!(await access(params.id, params.photoId))) return invalid();
  try {
    const photo = await readDiaryPhoto(params.id, params.photoId);
    if (!photo) return invalid();
    return new NextResponse(new Uint8Array(photo).buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Foto temporariamente indisponível." }, { status: 503 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string; photoId: string } }) {
  const state = await access(params.id, params.photoId);
  if (!state?.owner) return invalid();
  try {
    if (!(await deleteDiaryPhoto(params.id, params.photoId))) return invalid();
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a foto." }, { status: 503 });
  }
}
