"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { DIARY_PHOTO_MAX_BYTES, DIARY_PHOTO_RULE } from "../domain/diaryPhoto";

type Photo = { id: string; name: string };

function endpoint(entryId: string) {
  return `/api/estagio/diario/${entryId}/fotos`;
}

async function convertToJpeg(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Este navegador não conseguiu preparar a imagem.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.82, 0.7, 0.56, 0.42]) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      if (blob && blob.size <= DIARY_PHOTO_MAX_BYTES)
        return new File([blob], "foto.jpg", { type: "image/jpeg" });
    }
    throw new Error("A foto ficou acima de 1 MiB. Escolha outra imagem.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function DiaryPhotos({
  entryId,
  allowUpload = false,
  collapsed = false,
}: {
  entryId: string;
  allowUpload?: boolean;
  collapsed?: boolean;
}) {
  const [opened, setOpened] = useState(!collapsed);
  const [loaded, setLoaded] = useState(false);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try {
      const response = await fetch(endpoint(entryId), { cache: "no-store" });
      if (!response.ok) throw new Error("Não foi possível carregar as fotos.");
      const body = (await response.json()) as { photos: Photo[] };
      setPhotos(body.photos);
      setLoaded(true);
      setError("");
    } catch {
      setError("Não foi possível carregar as fotos.");
    }
  }, [entryId]);

  useEffect(() => {
    if (opened && !loaded) void load();
  }, [opened, loaded, load]);

  async function upload(file: File | undefined) {
    if (!file) return;
    if (!accepted) { setError("Confirme a regra de uso de imagens."); return; }
    setBusy(true);
    setError("");
    try {
      const clean = await convertToJpeg(file);
      const form = new FormData();
      form.set("foto", clean);
      form.set("confirmado", "true");
      const response = await fetch(endpoint(entryId), { method: "POST", body: form });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        throw new Error(body.error ?? "Não foi possível enviar a foto.");
      }
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a foto.");
    } finally {
      setBusy(false);
    }
  }

  async function remove(photoId: string) {
    if (!window.confirm("Excluir esta foto do relato?")) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${endpoint(entryId)}/${photoId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setPhotos((current) => current.filter((photo) => photo.id !== photoId));
    } catch {
      setError("Não foi possível excluir a foto.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border p-3 text-sm">
      {collapsed ? (
        <button type="button" className="font-medium text-primary underline" onClick={() => setOpened((value) => !value)}>
          {opened ? "Ocultar fotos" : "Ver fotos do relato"}
        </button>
      ) : <h2 className="font-semibold">Fotos do relato</h2>}
      {opened ? (
        <>
          {loaded && photos.length === 0 ? <p className="text-muted-foreground">Nenhuma foto anexada.</p> : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {photos.map((photo, index) => {
              const url = `${endpoint(entryId)}/${photo.id}`;
              return (
                <div key={photo.id} className="space-y-1">
                  <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Abrir foto ${index + 1}`}>
                    {/* A rota autenticada não tem URL externa para usar no otimizador de imagens. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Foto ${index + 1} do relato`} loading="lazy" className="aspect-square w-full rounded-md border object-cover" />
                  </a>
                  {allowUpload ? (
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void remove(photo.id)}>
                      Excluir foto
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
          {allowUpload && photos.length < 3 ? (
            <div className="space-y-2 border-t pt-3">
              <p>{DIARY_PHOTO_RULE}</p>
              <label className="flex items-start gap-2">
                <input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} />
                <span>Li a regra e confirmo que tenho autorização para enviar esta imagem.</span>
              </label>
              <label className="block space-y-1">
                <span className="font-medium">Adicionar foto ({photos.length}/3)</span>
                <input type="file" accept="image/*" disabled={busy || !accepted} onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  void upload(file);
                }} className="block w-full text-sm" />
              </label>
              <p className="text-xs text-muted-foreground">A foto é reduzida para JPEG de até 1 MiB. Ela fica no Drive privado, fora do banco do aplicativo.</p>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-destructive">{error}</p> : null}
        </>
      ) : null}
    </section>
  );
}
