/**
 * Tipos neutros de notificação, compartilhados pelos módulos que avisam
 * alguém — hoje aniversários e acompanhamento do cadete.
 */
export interface NotificationContent {
  title: string;
  body: string;
  /** Caminho relativo aberto ao tocar na notificação. */
  url: string;
  /** Agrupa notificações do mesmo assunto no dispositivo. */
  tag: string;
}

export interface PushTarget {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface NotificationSendResult {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  /** Assinatura morta (404/410): deve ser desativada, não retentada. */
  permanentFailure?: boolean;
}

export interface WebPushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export interface EmailConfig {
  apiKey: string;
  from: string;
  appUrl: string;
}
