import webpush from 'web-push';
import { buildWebPushNotificationPayload } from '../../../shared/notification-catalog.js';
import {
  deriveActivityReminders,
  derivedReminderSourceId,
  isFollowUpReminderId,
  listReminderOccurrencesInLookback,
  normalizePersonalizedReminders,
  type PersonalizedReminder,
} from '../../../shared/reminders.js';
import { getTodaySaoPaulo } from '../../../shared/utils/timezone.js';
import { Activities, ActivityLogs, Routines } from '../repositories/activities-repository.js';
import { User } from '../domain/User.js';
import { isExpiredPushSubscriptionStatus, isTransientPushFailure } from './push-delivery-claim.js';
import {
  assertReminderPushConfigured,
  getReminderPushLookbackMinutes,
} from './reminder-push-config.js';
import {
  PushDeliveryLog,
  PushSubscriptions,
  type PushSubscriptionRow,
} from '../repositories/push-subscription-repository.js';

export { ReminderPushMisconfiguredError } from './reminder-push-config.js';

async function sendPush(
  subscription: PushSubscriptionRow,
  reminder: PersonalizedReminder,
  occurrenceKey: string,
): Promise<void> {
  assertReminderPushConfigured();

  const payload = buildWebPushNotificationPayload(reminder, occurrenceKey);

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
    { TTL: 120 },
  );
}

function readPushErrorStatus(error: unknown): number {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    return Number((error as { statusCode?: number }).statusCode) || 0;
  }
  return 0;
}

export async function dispatchDuePersonalReminders(now = new Date()): Promise<{
  scanned: number;
  sent: number;
  skipped: number;
  occurrences: number;
}> {
  assertReminderPushConfigured();

  const subscriptions = await PushSubscriptions.listAll();
  const lookbackMinutes = getReminderPushLookbackMinutes();
  const derivedCache = new Map<string, PersonalizedReminder[]>();
  let sent = 0;
  let skipped = 0;
  let occurrences = 0;

  for (const subscription of subscriptions) {
    const user = await User.findById(subscription.user_id, { lean: true });
    if (!user?.preferencias || user.preferencias.notificacoes_opt_out) {
      skipped += 1;
      continue;
    }

    const personal = normalizePersonalizedReminders(user.preferencias.lembretes_personalizados);
    let derived = derivedCache.get(user.id);
    if (!derived) {
      try {
        const [activities, routines] = await Promise.all([
          Activities.list(user.id),
          Routines.list(user.id),
        ]);
        derived = deriveActivityReminders(activities, routines);
      } catch (error) {
        console.error('Falha ao derivar lembretes de atividade:', error);
        derived = [];
      }
      derivedCache.set(user.id, derived);
    }
    const reminders = [...personal, ...derived];
    if (reminders.length === 0) {
      skipped += 1;
      continue;
    }

    const timeZone = subscription.time_zone || 'America/Sao_Paulo';
    const dueOccurrences = listReminderOccurrencesInLookback(
      reminders,
      now,
      timeZone,
      lookbackMinutes,
    );

    if (dueOccurrences.length === 0) {
      skipped += 1;
      continue;
    }

    for (const occurrence of dueOccurrences) {
      occurrences += 1;
      if (isFollowUpReminderId(occurrence.reminder.id)) {
        const sourceId = derivedReminderSourceId(occurrence.reminder.id);
        if (sourceId) {
          try {
            const done = await ActivityLogs.hasActivityOnDay(
              subscription.user_id,
              sourceId,
              getTodaySaoPaulo(now),
            );
            if (done) {
              skipped += 1;
              continue;
            }
          } catch {
            /* tabela ausente — entrega o follow-up normalmente */
          }
        }
      }
      const claim = await PushDeliveryLog.claim(subscription.id, occurrence.occurrenceKey, now);
      if (claim === 'skip') {
        skipped += 1;
        continue;
      }

      try {
        await sendPush(subscription, occurrence.reminder, occurrence.occurrenceKey);
        await PushDeliveryLog.markSent(subscription.id, occurrence.occurrenceKey, now);
        sent += 1;
      } catch (error) {
        const statusCode = readPushErrorStatus(error);
        if (isExpiredPushSubscriptionStatus(statusCode)) {
          await PushSubscriptions.deleteByEndpoint(subscription.user_id, subscription.endpoint);
          await PushDeliveryLog.markFailed(
            subscription.id,
            occurrence.occurrenceKey,
            `subscription expired (${statusCode})`,
            now,
          );
          skipped += 1;
          break;
        }

        const message =
          error instanceof Error ? error.message : 'falha desconhecida ao enviar push';
        await PushDeliveryLog.markFailed(subscription.id, occurrence.occurrenceKey, message, now);

        if (!isTransientPushFailure(statusCode)) {
          console.error('Web push failed:', statusCode || error);
        }
        skipped += 1;
      }
    }
  }

  await PushDeliveryLog.pruneOlderThan(14).catch((error) => {
    console.error('push_delivery_log prune failed:', error);
  });

  return { scanned: subscriptions.length, sent, skipped, occurrences };
}
