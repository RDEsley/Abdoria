import webpush from "web-push";

export class ReminderPushMisconfiguredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReminderPushMisconfiguredError";
  }
}

let vapidConfigured = false;

export function getReminderPushLookbackMinutes(): number {
  const raw = Number(process.env.REMINDER_PUSH_LOOKBACK_MINUTES ?? 15);
  if (!Number.isFinite(raw) || raw < 0) return 15;
  return Math.min(60, Math.floor(raw));
}

export function assertReminderPushConfigured(): {
  publicKey: string;
  privateKey: string;
  subject: string;
} {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim();

  if (!publicKey || !privateKey) {
    throw new ReminderPushMisconfiguredError(
      "Web Push indisponível: configure VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.",
    );
  }
  if (!subject) {
    throw new ReminderPushMisconfiguredError(
      "Web Push indisponível: configure VAPID_SUBJECT (ex.: mailto:suporte@seu-dominio.com).",
    );
  }

  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }

  return { publicKey, privateKey, subject };
}
