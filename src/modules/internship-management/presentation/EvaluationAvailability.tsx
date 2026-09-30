"use client";

import { useEffect, useState } from "react";
import { evaluationDate } from "../domain/evaluation";
import { EvaluationForm } from "./EvaluationForm";

export function EvaluationAvailability({
  availableAt,
  canSubmit,
  token,
  recipientName,
  activityName,
}: {
  availableAt: string;
  canSubmit: boolean;
  token: string;
  recipientName: string;
  activityName: string;
}) {
  const [ready, setReady] = useState(canSubmit);

  useEffect(() => {
    const update = () => setReady(Date.now() >= new Date(availableAt).getTime());
    update();
    const interval = window.setInterval(update, 15000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", update);
    };
  }, [availableAt]);

  return (
    <>
      {!ready && (
        <p role="status" className="rounded-md bg-muted p-3 text-sm">
          O envio da avaliação será liberado após metade do plantão, em {evaluationDate(availableAt)}.
        </p>
      )}
      <EvaluationForm
        mode="digital"
        token={token}
        recipientName={recipientName}
        activityName={activityName}
        disabled={!ready}
      />
    </>
  );
}
