"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Avatar } from "@/components/ui/Avatar";
import { updateStudentPhotoAction } from "@/modules/student-profile/presentation/actions/studentActions";

interface Props {
  studentId: string;
  photoUrl: string | null;
  initials: string;
  alt: string;
  /** Se falso, renderiza apenas o avatar (sem affordance de upload). */
  canEdit?: boolean;
}

/**
 * Avatar do cadete com upload de foto (coordenação ou o próprio aluno).
 * Mantém o comportamento de iniciais quando não há foto cadastrada.
 */
export function StudentPhotoUpload({ studentId, photoUrl, initials, alt, canEdit }: Props) {
  const [state, formAction] = useFormState(updateStudentPhotoAction, null);
  const formRef = React.useRef<HTMLFormElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    // Conclusão da action (sucesso ou erro): encerra o estado de envio.
    setPending(false);
    if (inputRef.current) inputRef.current.value = "";
  }, [state]);

  if (!canEdit) {
    return <Avatar src={photoUrl ?? undefined} alt={alt} initials={initials} size="xl" />;
  }

  return (
    <form ref={formRef} action={formAction} className="shrink-0">
      <input type="hidden" name="studentId" value={studentId} />
      <input
        ref={inputRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={() => {
          if (inputRef.current?.files?.length) {
            setPending(true);
            formRef.current?.requestSubmit();
          }
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        title="Alterar foto do cadete"
        aria-label="Alterar foto do cadete"
        className="group relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar src={photoUrl ?? undefined} alt={alt} initials={initials} size="xl" />
        <span
          className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 text-[10px] font-semibold uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden
        >
          {pending ? "Enviando…" : "Alterar"}
        </span>
      </button>
      {state?.ok === false && (
        <p className="mt-1 max-w-[80px] text-[10px] leading-tight text-destructive">{state.error}</p>
      )}
    </form>
  );
}
