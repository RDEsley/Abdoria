import { createContext } from 'react';

export type PwaInstallResult =
  'accepted' | 'dismissed' | 'already-installed' | 'ios-instructions' | 'browser-instructions';

export interface PwaInstallValue {
  installed: boolean;
  promptAvailable: boolean;
  install: () => Promise<PwaInstallResult>;
}

export const PwaInstallContext = createContext<PwaInstallValue | null>(null);
