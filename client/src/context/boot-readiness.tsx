/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface BootReadinessValue {
  dataReady: boolean;
  markDataReady: () => void;
  resetDataReady: () => void;
}

const BootReadinessContext = createContext<BootReadinessValue | null>(null);

export function BootReadinessProvider({ children }: { children: ReactNode }) {
  const [dataReady, setDataReady] = useState(false);
  const value = useMemo(
    () => ({
      dataReady,
      markDataReady: () => setDataReady(true),
      resetDataReady: () => setDataReady(false),
    }),
    [dataReady],
  );
  return <BootReadinessContext.Provider value={value}>{children}</BootReadinessContext.Provider>;
}

export function useBootReadiness() {
  const context = useContext(BootReadinessContext);
  if (!context) throw new Error('useBootReadiness must be used within BootReadinessProvider');
  return context;
}
