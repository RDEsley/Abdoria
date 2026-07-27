import { Outlet } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { RewardPresentationProvider } from '@/context/RewardPresentationContext';
import { RewardPresentationHost } from '@/components/rewards/RewardPresentationHost';
import { GlobalEffectsHost } from '@/components/effects/GlobalEffectsHost';

export function AppDataProvider() {
  return (
    <AppProvider>
      <RewardPresentationProvider>
        <RewardPresentationHost />
        <GlobalEffectsHost />
        <Outlet />
      </RewardPresentationProvider>
    </AppProvider>
  );
}
