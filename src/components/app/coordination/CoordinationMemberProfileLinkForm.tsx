"use client";

import { useFormState, useFormStatus } from "react-dom";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  linkCoordinationMemberProfileAction,
  type CoordinationTeamActionResult,
} from "@/modules/identity/presentation/actions/coordinationTeamActions";

type AvailableProfile = { id: string; full_name: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="secondary" disabled={pending}>
      {pending ? "Salvando…" : "Salvar vínculo"}
    </Button>
  );
}

export function CoordinationMemberProfileLinkForm({
  memberId,
  currentProfileId,
  profiles,
}: {
  memberId: string;
  currentProfileId: string | null;
  profiles: AvailableProfile[];
}) {
  const [state, action] = useFormState<CoordinationTeamActionResult | null, FormData>(
    linkCoordinationMemberProfileAction,
    null,
  );

  return (
    <form action={action} className="space-y-2 border-t pt-3">
      <input type="hidden" name="memberId" value={memberId} />
      <label
        className="block text-xs font-medium text-muted-foreground"
        htmlFor={`profile-${memberId}`}
      >
        Conta individual
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Select id={`profile-${memberId}`} name="profileId" defaultValue={currentProfileId ?? ""}>
          <option value="">Sem conta vinculada</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.full_name}
            </option>
          ))}
        </Select>
        <SubmitButton />
      </div>
      <p className="text-xs text-muted-foreground">
        Só aparecem contas ativas da Coordenação. A mudança fica registrada na auditoria.
      </p>
      {state && <Alert variant={state.ok ? "success" : "destructive"}>{state.message}</Alert>}
    </form>
  );
}
