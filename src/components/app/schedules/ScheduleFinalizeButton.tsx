"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

export function ScheduleFinalizeButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const { error: finalizeError } = await createSupabaseBrowserClient().rpc(
              "schedule_finalize_document",
              { p_document_id: documentId },
            );
            if (finalizeError) setError("O arquivo ainda não foi localizado no Storage.");
            else router.refresh();
          })
        }
      >
        {pending ? "Conferindo…" : "Concluir publicação"}
      </Button>
      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
