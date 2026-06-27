import { useDailyShopAutoClaim } from '@/hooks/useDailyShopAutoClaim';

/** Ativa a coleta automática das recompensas grátis ao entrar no app. */
export function DailyShopAutoClaim() {
  useDailyShopAutoClaim();
  return null;
}
