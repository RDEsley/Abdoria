import { describe, expect, it } from "vitest";
import {
  buildReminderOccurrenceKey,
  listReminderOccurrencesInLookback,
  type PersonalizedReminder,
} from "../../shared/reminders.js";
import {
  decideDeliveryClaim,
  isExpiredPushSubscriptionStatus,
  isTransientPushFailure,
} from "../src/services/push-delivery-claim.js";
import {
  assertReminderPushConfigured,
  getReminderPushLookbackMinutes,
} from "../src/services/reminder-push-config.js";
import { ReminderPushMisconfiguredError } from "../src/services/reminder-push.js";

const baseReminder: PersonalizedReminder = {
  version: 2,
  id: "water",
  title: "Água",
  message: "",
  icon: "water",
  color: "sky",
  sound: "default",
  schedule: {
    kind: "recurring",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    times: ["18:03"],
  },
  enabled: true,
  createdAt: "2026-08-29T10:00:00.000Z",
  updatedAt: "2026-08-29T10:00:00.000Z",
};

describe("listReminderOccurrencesInLookback", () => {
  it("recupera lembrete alguns minutos depois do horário agendado", () => {
    const now = new Date("2026-09-02T21:07:00.000Z");
    const occurrences = listReminderOccurrencesInLookback(
      [baseReminder],
      now,
      "America/Sao_Paulo",
      15,
    );
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].minuteKey).toBe("2026-09-02T18:03");
    expect(occurrences[0].occurrenceKey).toBe(
      buildReminderOccurrenceKey(baseReminder, "2026-09-02T18:03"),
    );
  });

  it("não duplica a mesma ocorrência dentro da janela", () => {
    const now = new Date("2026-09-02T21:07:00.000Z");
    const occurrences = listReminderOccurrencesInLookback(
      [baseReminder, { ...baseReminder, title: "Duplicata lógica" }],
      now,
      "America/Sao_Paulo",
      15,
    );
    expect(occurrences).toHaveLength(1);
  });

  it("ignora lembretes desabilitados (opt-out de entrega no perfil é camada acima)", () => {
    const now = new Date("2026-09-02T21:07:00.000Z");
    const occurrences = listReminderOccurrencesInLookback(
      [{ ...baseReminder, enabled: false }],
      now,
      "America/Sao_Paulo",
      15,
    );
    expect(occurrences).toHaveLength(0);
  });

  it("suporta múltiplos horários no mesmo dia", () => {
    const reminder: PersonalizedReminder = {
      ...baseReminder,
      schedule: {
        kind: "recurring",
        weekdays: [0, 1, 2, 3, 4, 5, 6],
        times: ["18:03", "18:08"],
      },
    };
    const now = new Date("2026-09-02T21:12:00.000Z");
    const occurrences = listReminderOccurrencesInLookback(
      [reminder],
      now,
      "America/Sao_Paulo",
      15,
    );
    expect(occurrences.map((item) => item.minuteKey).sort()).toEqual([
      "2026-09-02T18:03",
      "2026-09-02T18:08",
    ]);
  });

  it("preserva lembrete único (once) dentro da janela", () => {
    const once: PersonalizedReminder = {
      ...baseReminder,
      schedule: { kind: "once", at: "2026-09-02T21:03:00.000Z" },
    };
    const now = new Date("2026-09-02T21:10:00.000Z");
    const occurrences = listReminderOccurrencesInLookback(
      [once],
      now,
      "America/Sao_Paulo",
      15,
    );
    expect(occurrences).toHaveLength(1);
    expect(occurrences[0].occurrenceKey).toContain(":once:");
  });

  it("respeita timezone da subscription", () => {
    const reminder: PersonalizedReminder = {
      ...baseReminder,
      schedule: { kind: "recurring", weekdays: [3], times: ["09:30"] },
    };
    const now = new Date("2026-09-02T12:35:00.000Z");
    const sp = listReminderOccurrencesInLookback(
      [reminder],
      now,
      "America/Sao_Paulo",
      10,
    );
    const utc = listReminderOccurrencesInLookback([reminder], now, "UTC", 10);
    expect(sp).toHaveLength(1);
    expect(utc).toHaveLength(0);
  });
});

describe("decideDeliveryClaim", () => {
  const now = 1_700_000_000_000;

  it("insere quando não há registro anterior", () => {
    expect(decideDeliveryClaim(null, now)).toBe("insert");
  });

  it("não reenvia ocorrência já marcada como sent", () => {
    expect(
      decideDeliveryClaim(
        { status: "sent", attempts: 1, updatedAtMs: now - 60_000 },
        now,
      ),
    ).toBe("skip");
  });

  it("permite retry após falha transitória respeitando cooldown", () => {
    expect(
      decideDeliveryClaim(
        { status: "failed", attempts: 1, updatedAtMs: now - 120_000 },
        now,
      ),
    ).toBe("retry");
    expect(
      decideDeliveryClaim(
        { status: "failed", attempts: 1, updatedAtMs: now - 10_000 },
        now,
      ),
    ).toBe("skip");
  });

  it("cada subscription decide de forma independente (estado isolado)", () => {
    const subA = decideDeliveryClaim(
      { status: "sent", attempts: 1, updatedAtMs: now },
      now,
    );
    const subB = decideDeliveryClaim(null, now);
    expect(subA).toBe("skip");
    expect(subB).toBe("insert");
  });

  it("para após atingir o máximo de tentativas", () => {
    expect(
      decideDeliveryClaim(
        { status: "failed", attempts: 5, updatedAtMs: now - 120_000 },
        now,
      ),
    ).toBe("skip");
  });
});

describe("push failure classification", () => {
  it("identifica subscriptions expiradas 404/410", () => {
    expect(isExpiredPushSubscriptionStatus(404)).toBe(true);
    expect(isExpiredPushSubscriptionStatus(410)).toBe(true);
    expect(isExpiredPushSubscriptionStatus(500)).toBe(false);
  });

  it("identifica falhas transitórias para retry", () => {
    expect(isTransientPushFailure(503)).toBe(true);
    expect(isTransientPushFailure(429)).toBe(true);
    expect(isTransientPushFailure(404)).toBe(false);
  });
});

describe("reminder push config", () => {
  it("usa lookback padrão de 15 minutos", () => {
    const previous = process.env.REMINDER_PUSH_LOOKBACK_MINUTES;
    delete process.env.REMINDER_PUSH_LOOKBACK_MINUTES;
    expect(getReminderPushLookbackMinutes()).toBe(15);
    process.env.REMINDER_PUSH_LOOKBACK_MINUTES = previous;
  });

  it("falha claramente sem VAPID_SUBJECT", () => {
    const subject = process.env.VAPID_SUBJECT;
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    process.env.VAPID_PUBLIC_KEY = "test-public";
    process.env.VAPID_PRIVATE_KEY = "test-private";
    delete process.env.VAPID_SUBJECT;
    expect(() => assertReminderPushConfigured()).toThrow(
      ReminderPushMisconfiguredError,
    );
    process.env.VAPID_SUBJECT = subject;
    process.env.VAPID_PUBLIC_KEY = publicKey;
    process.env.VAPID_PRIVATE_KEY = privateKey;
  });
});
