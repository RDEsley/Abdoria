import { useSaoPauloMidnightRefresh } from '@/hooks/useSaoPauloMidnightRefresh';

/** @deprecated Use useSaoPauloMidnightRefresh */
export function useDailyShopResetCountdown(onReset?: () => void) {
  return useSaoPauloMidnightRefresh(onReset);
}
