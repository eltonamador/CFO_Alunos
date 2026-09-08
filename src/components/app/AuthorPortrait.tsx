"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PortraitFraming {
  /** Fator de ampliação sobre o recorte quadrado padrão. */
  zoom: number;
  /** Ponto da imagem (% da largura) que deve ficar no centro do círculo. */
  focusX: number;
  /** Ponto da imagem (% da altura) que deve ficar no centro do círculo. */
  focusY: number;
}

interface AuthorPortraitProps {
  src: string;
  alt: string;
  initials: string;
  framing?: PortraitFraming;
  className?: string;
}

const DEFAULT_FRAMING: PortraitFraming = { zoom: 1, focusX: 50, focusY: 50 };

/**
 * Retrato circular do autor — moldura discreta em dourado institucional.
 * Se a imagem não estiver disponível, degrada para as iniciais sobre
 * fundo vermelho-CBMAP (mesmo padrão visual do <Avatar />).
 */
export function AuthorPortrait({
  src,
  alt,
  initials,
  framing = DEFAULT_FRAMING,
  className,
}: AuthorPortraitProps) {
  const [failed, setFailed] = React.useState(false);

  // Leva o ponto de foco ao centro (translate) e só então amplia (scale).
  const transform = `scale(${framing.zoom}) translate(${50 - framing.focusX}%, ${50 - framing.focusY}%)`;

  return (
    <div
      className={cn(
        "flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full",
        "ring-1 ring-brand-gold/60 ring-offset-2 ring-offset-card",
        "sm:h-32 sm:w-32",
        failed
          ? "bg-primary font-display text-2xl font-semibold uppercase tracking-[0.04em] text-primary-foreground"
          : "bg-white",
        className,
      )}
    >
      {failed ? (
        <span aria-hidden>{initials}</span>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          style={{ transform, transformOrigin: "center" }}
          draggable={false}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
