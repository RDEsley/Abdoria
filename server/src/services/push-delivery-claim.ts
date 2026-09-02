export type DeliveryStatus = 'pending' | 'sent' | 'failed';

export interface DeliveryClaimState {
  status: DeliveryStatus;
  attempts: number;
  updatedAtMs: number;
}

export interface DeliveryClaimOptions {
  pendingLeaseMs: number;
  maxAttempts: number;
  retryCooldownMs: number;
}

export const DEFAULT_DELIVERY_CLAIM_OPTIONS: DeliveryClaimOptions = {
  pendingLeaseMs: 120_000,
  maxAttempts: 5,
  retryCooldownMs: 60_000,
};

export type DeliveryClaimDecision = 'insert' | 'retry' | 'skip';

export function decideDeliveryClaim(
  existing: DeliveryClaimState | null,
  nowMs: number,
  options: DeliveryClaimOptions = DEFAULT_DELIVERY_CLAIM_OPTIONS,
): DeliveryClaimDecision {
  if (!existing) return 'insert';
  if (existing.status === 'sent') return 'skip';

  if (existing.status === 'pending') {
    if (nowMs - existing.updatedAtMs < options.pendingLeaseMs) return 'skip';
    if (existing.attempts >= options.maxAttempts) return 'skip';
    return 'retry';
  }

  if (existing.attempts >= options.maxAttempts) return 'skip';
  if (nowMs - existing.updatedAtMs < options.retryCooldownMs) return 'skip';
  return 'retry';
}

export function isExpiredPushSubscriptionStatus(statusCode: number): boolean {
  return statusCode === 404 || statusCode === 410;
}

export function isTransientPushFailure(statusCode: number): boolean {
  if (statusCode === 0) return true;
  return statusCode === 408 || statusCode === 429 || statusCode >= 500;
}
