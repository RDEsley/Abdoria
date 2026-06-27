import { CURRENCY_NAME } from '@/types';

export function overflowToastMessage(overflow: number | undefined | null): string | null {
  if (!overflow || overflow <= 0) return null;
  return `${overflow} item${overflow === 1 ? '' : 's'} excedente${overflow === 1 ? '' : 's'} virou${overflow === 1 ? '' : 'ram'} ${overflow} ${CURRENCY_NAME}.`;
}
