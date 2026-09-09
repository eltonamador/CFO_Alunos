import { Badge } from "@/components/ui/Badge";
import {
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_TYPE_LABELS,
  PUNISHMENT_STATUS_LABELS,
  type FollowUpStatus,
  type FollowUpType,
  type PunishmentStatus,
} from "@/modules/cadet-followup/domain/followUp";

type BadgeVariant = React.ComponentProps<typeof Badge>["variant"];

const STATUS_VARIANT: Record<FollowUpStatus, BadgeVariant> = {
  registrado: "default",
  aguardando_manifestacao: "warning",
  aguardando_analise: "info",
  prazo_expirado: "destructive",
  deferido: "success",
  indeferido: "primary",
  aguardando_cumprimento: "warning",
  concluido: "success",
  cancelado: "outline",
};

const TYPE_VARIANT: Record<FollowUpType, BadgeVariant> = {
  fo_negativo: "primary",
  fo_positivo: "success",
  saude: "info",
  missao: "gold",
  administrativo: "default",
};

const PUNISHMENT_VARIANT: Record<PunishmentStatus, BadgeVariant> = {
  aguardando_cumprimento: "warning",
  cumprida: "success",
  parcialmente_cumprida: "info",
  nao_cumprida: "destructive",
  cancelada: "outline",
};

export function TypeBadge({ type }: { type: FollowUpType }) {
  return <Badge variant={TYPE_VARIANT[type]}>{FOLLOW_UP_TYPE_LABELS[type]}</Badge>;
}

export function StatusBadge({ status }: { status: FollowUpStatus }) {
  return <Badge variant={STATUS_VARIANT[status]} dot>{FOLLOW_UP_STATUS_LABELS[status]}</Badge>;
}

export function PunishmentBadge({ status }: { status: PunishmentStatus }) {
  return <Badge variant={PUNISHMENT_VARIANT[status]}>{PUNISHMENT_STATUS_LABELS[status]}</Badge>;
}
