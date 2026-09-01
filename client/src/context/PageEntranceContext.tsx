import type { ReactNode } from 'react';
import { PageEntranceContext } from '@/context/page-entrance-context';

export function PageEntranceProvider({ ready, children }: { ready: boolean; children: ReactNode }) {
  return <PageEntranceContext.Provider value={ready}>{children}</PageEntranceContext.Provider>;
}
