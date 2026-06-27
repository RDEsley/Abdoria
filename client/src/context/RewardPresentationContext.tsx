import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RewardPresentationItem } from '@shared/rewards/presentation';
import { partitionRewardPresentation } from '@/lib/reward-presentation';
import {
  buildDevSecretPreviewItem,
  dispatchDevRouteDrinkCelebration,
  type DevSecretPreviewVariant,
} from '@/lib/dev-reward-preview';

type Phase = 'idle' | 'secret' | 'summary';

interface RewardPresentationState {
  phase: Phase;
  secrets: RewardPresentationItem[];
  summary: RewardPresentationItem[];
  secretIndex: number;
}

interface RewardPresentationContextValue {
  state: RewardPresentationState;
  presentRewards: (items: RewardPresentationItem[]) => void;
  advanceSecret: () => void;
  dismiss: () => void;
  isActive: boolean;
}

const IDLE_STATE: RewardPresentationState = {
  phase: 'idle',
  secrets: [],
  summary: [],
  secretIndex: 0,
};

const RewardPresentationContext = createContext<RewardPresentationContextValue | null>(null);

export function RewardPresentationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RewardPresentationState>(IDLE_STATE);

  const presentRewards = useCallback((items: RewardPresentationItem[]) => {
    const { secrets, summary } = partitionRewardPresentation(items);
    if (secrets.length > 0) {
      setState({ phase: 'secret', secrets, summary, secretIndex: 0 });
      return;
    }
    if (summary.length > 0) {
      setState({ phase: 'summary', secrets: [], summary, secretIndex: 0 });
      return;
    }
    setState(IDLE_STATE);
  }, []);

  const advanceSecret = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'secret') return prev;
      const nextIndex = prev.secretIndex + 1;
      if (nextIndex < prev.secrets.length) {
        return { ...prev, secretIndex: nextIndex };
      }
      if (prev.summary.length > 0) {
        return { ...prev, phase: 'summary', secretIndex: nextIndex };
      }
      return IDLE_STATE;
    });
  }, []);

  const dismiss = useCallback(() => {
    setState(IDLE_STATE);
  }, []);

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;

    window.__abdoriaPreviewSecret = (variant: DevSecretPreviewVariant = 'title') => {
      presentRewards(buildDevSecretPreviewItem(variant));
    };
    window.__abdoriaPreviewRouteDrink = () => {
      dispatchDevRouteDrinkCelebration();
    };

    return () => {
      delete window.__abdoriaPreviewSecret;
      delete window.__abdoriaPreviewRouteDrink;
    };
  }, [presentRewards]);

  const value = useMemo(
    () => ({
      state,
      presentRewards,
      advanceSecret,
      dismiss,
      isActive: state.phase !== 'idle',
    }),
    [state, presentRewards, advanceSecret, dismiss],
  );

  return (
    <RewardPresentationContext.Provider value={value}>
      {children}
    </RewardPresentationContext.Provider>
  );
}

export function useRewardPresentation() {
  const ctx = useContext(RewardPresentationContext);
  if (!ctx) throw new Error('useRewardPresentation must be used within RewardPresentationProvider');
  return ctx;
}
