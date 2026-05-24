"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClientUntyped } from "@/lib/supabase/untyped";
import { getSession } from "@/modules/identity/presentation/session";
import { getDefaultClassId } from "@/modules/operational-duty/infrastructure/queries";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/webm",
]);

function attachmentTypeForMime(mimeType: string) {
  if (mimeType.includes("pdf") || mimeType.includes("word")) return "documento";
  if (mimeType.includes("excel") || mimeType.includes("spreadsheet") || mimeType === "text/csv") {
    return "planilha";
  }
  if (mimeType.startsWith("image/")) return "imagem";
  if (mimeType.startsWith("video/")) return "video";
  return "documento";
}

async function requireCoord() {
  const session = await getSession();
  if (!session) return { error: "Sessao expirada" as const };
  if (session.role !== "coordenacao") return { error: "Apenas Coordenacao" as const };
  return { session };
}

const announcementSchema = z.object({
  title: z.string().min(3),
  body: z.string().optional(),
  audienceType: z.enum(["turma", "perfil", "individual"]),
  targetRole: z.enum(["instrutor", "aluno", "secretaria", "coordenacao"]).optional(),
  priority: z.enum(["normal", "alta", "urgente"]).default("normal"),
  externalUrl: z.string().url().optional().or(z.literal("")),
});

export async function createAnnouncementAction(
  formData: FormData,
): Promise<void> {
  const auth = await requireCoord();
  if ("error" in auth) return;

  const parsed = announcementSchema.safeParse({
    title: formData.get("title"),
    body: formData.get("body") || undefined,
    audienceType: formData.get("audienceType"),
    targetRole: formData.get("targetRole") || undefined,
    priority: formData.get("priority") || "normal",
    externalUrl: formData.get("externalUrl") || "",
  });
  if (!parsed.success) return;

  const targetStudentIds = formData
    .getAll("targetStudentIds")
    .map(String)
    .filter((value) => value.length > 0);

  if (parsed.data.audienceType === "individual" && targetStudentIds.length === 0) {
    return;
  }

  const files = formData
    .getAll("files")
    .filter((file): file is File => file instanceof File && file.size > 0);

  if (files.length > 10) return;

  for (const file of files) {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return;
    }
    if (file.size > 104_857_600) {
      return;
    }
  }

  const supabase = createServerClientUntyped();

  try {
    const classId = await getDefaultClassId(supabase);
    const body = parsed.data.body?.trim() || "Material enviado pela Coordenacao.";
    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert({
        class_id: parsed.data.audienceType === "turma" ? classId ?? null : null,
        title: parsed.data.title,
        body,
        audience_type: parsed.data.audienceType,
        target_role: parsed.data.audienceType === "perfil" ? parsed.data.targetRole : null,
        target_student_ids:
          parsed.data.audienceType === "individual" ? targetStudentIds : null,
        priority: parsed.data.priority,
        status: "publicado",
        published_at: new Date().toISOString(),
        created_by: auth.session.userId,
      })
      .select("id")
      .single();
    if (error) return;

    const attachmentRows: any[] = [];
    let sortOrder = 0;

    for (const file of files) {
      const attachmentId = crypto.randomUUID();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `${announcement.id}/${attachmentId}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("announcement-attachments")
        .upload(storagePath, file, { contentType: file.type, upsert: false });
      if (uploadError) return;

      attachmentRows.push({
        id: attachmentId,
        announcement_id: announcement.id,
        storage_path: storagePath,
        original_filename: file.name,
        mime_type: file.type,
        file_size_bytes: file.size,
        attachment_type: attachmentTypeForMime(file.type),
        sort_order: sortOrder,
        uploaded_by: auth.session.userId,
      });
      sortOrder++;
    }

    if (parsed.data.externalUrl) {
      attachmentRows.push({
        announcement_id: announcement.id,
        external_url: parsed.data.externalUrl,
        original_filename: "Link externo",
        mime_type: "text/uri-list",
        attachment_type: "link",
        sort_order: sortOrder,
        uploaded_by: auth.session.userId,
      });
    }

    if (attachmentRows.length > 0) {
      const { error: attachmentError } = await supabase
        .from("announcement_attachments")
        .insert(attachmentRows);
      if (attachmentError) return;
    }

    revalidatePath("/coordenacao/comunicados");
    revalidatePath("/coordenacao/operacional");
    revalidatePath("/aluno/comunicados");
    revalidatePath("/aluno/operacional");
    revalidatePath("/instrutor/operacional");
    return;
  } catch (error) {
    console.error(error);
  }
}

const readSchema = z.object({
  announcementId: z.string().uuid(),
});

export async function confirmAnnouncementReadAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session || session.role !== "aluno" || !session.studentId) return;

  const parsed = readSchema.safeParse({ announcementId: formData.get("announcementId") });
  if (!parsed.success) return;

  const supabase = createServerClientUntyped();
  await supabase.from("announcement_reads").upsert(
    {
      announcement_id: parsed.data.announcementId,
      student_id: session.studentId,
      read_by: session.userId,
    },
    { onConflict: "announcement_id,student_id" },
  );

  revalidatePath("/aluno/comunicados");
  revalidatePath("/aluno/operacional");
}
