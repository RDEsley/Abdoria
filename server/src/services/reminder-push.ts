import webpush from 'web-push';
import {
  formatReminderMinuteKey,
  getReminderClockParts,
  isReminderDueInTimeZone,
  normalizePersonalizedReminders,
  type PersonalizedReminder,
} from '../../../shared/reminders.js';
import { User } from '../domain/User.js';
import {
  PushDeliveryLog,
  PushSubscriptions,
  type PushSubscriptionRow,
} from '../repositories/push-subscription-repository.js';

const VAPID_SUBJECT = process.env.VAPID_SUBJECT?.trim() || 'mailto:richardesleyso@gmail.com';

let vapidConfigured = false;

function ensureVapid(): boolean {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);
    vapidConfigured = true;
  }
  return true;
}

function buildDeliveryKey(reminder: PersonalizedReminder, minuteKey: string): string {
  if (reminder.schedule.kind === 'once') return `${reminder.id}:once:${minuteKey}`;
  const time = minuteKey.slice(11);
  return `${reminder.id}:recurring:${reminder.schedule.weekdays.join('-')}:${time}:${minuteKey}`;
}

async function sendPush(
  subscription: PushSubscriptionRow,
  reminder: PersonalizedReminder,
): Promise<void> {
  const payload = JSON.stringify({
    title: reminder.title,
    body: reminder.message || 'Hora do seu lembrete no Evolyn.',
    tag: reminder.id,
    icon: '/brand/favicon-192.png',
  });

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    payload,
    { TTL: 120 },
  );
}

async function handleExpiredSubscription(
  subscription: PushSubscriptionRow,
  statusCode: number,
): Promise<void> {
  if (statusCode === 404 || statusCode === 410) {
    await PushSubscriptions.deleteByEndpoint(subscription.user_id, subscription.endpoint);
  }
}

export async function dispatchDuePersonalReminders(now = new Date()): Promise<{
  scanned: number;
  sent: number;
  skipped: number;
}> {
  if (!ensureVapid()) {
    return { scanned: 0, sent: 0, skipped: 0 };
  }

  const subscriptions = await PushSubscriptions.listAll();
  let sent = 0;
  let skipped = 0;

  const byUser = new Map<string, PushSubscriptionRow[]>();
  for (const row of subscriptions) {
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  for (const [userId, userSubs] of byUser) {
    const user = await User.findById(userId, { lean: true });
    if (!user?.preferencias || user.preferencias.notificacoes_opt_out) {
      skipped += userSubs.length;
      continue;
    }

    const reminders = normalizePersonalizedReminders(user.preferencias.lembretes_personalizados);
    if (reminders.length === 0) {
      skipped += userSubs.length;
      continue;
    }

    for (const subscription of userSubs) {
      const timeZone = subscription.time_zone || 'America/Sao_Paulo';
      const minuteKey = formatReminderMinuteKey(getReminderClockParts(now, timeZone));
      const due = reminders.filter((reminder) => isReminderDueInTimeZone(reminder, now, timeZone));

      if (due.length === 0) {
        skipped += 1;
        continue;
      }

      for (const reminder of due) {
        const deliveryKey = buildDeliveryKey(reminder, minuteKey);
        const recorded = await PushDeliveryLog.tryRecord(userId, deliveryKey);
        if (!recorded) {
          skipped += 1;
          continue;
        }

        try {
          await sendPush(subscription, reminder);
          sent += 1;
        } catch (error) {
          const statusCode =
            error && typeof error === 'object' && 'statusCode' in error
              ? Number((error as { statusCode?: number }).statusCode)
              : 0;
          await handleExpiredSubscription(subscription, statusCode);
          if (statusCode !== 404 && statusCode !== 410) {
            console.error('Web push failed:', statusCode || error);
          }
          skipped += 1;
        }
      }
    }
  }

  await PushDeliveryLog.pruneOlderThan(14).catch((error) => {
    console.error('push_delivery_log prune failed:', error);
  });

  return { scanned: subscriptions.length, sent, skipped };
}
