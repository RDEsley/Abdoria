import { createContext, useContext, type ReactNode } from 'react';

const PageEntranceContext = createContext(true);

export function PageEntranceProvider({ ready, children }: { ready: boolean; children: ReactNode }) {
  return <PageEntranceContext.Provider value={ready}>{children}</PageEntranceContext.Provider>;
}

/**
 * Becomes true after the route shell has entered. Data visualizations use it
 * to start only when their cards are already visible instead of racing the
 * page transition.
 */
export function usePageEntranceReady() {
  return useContext(PageEntranceContext);
}
