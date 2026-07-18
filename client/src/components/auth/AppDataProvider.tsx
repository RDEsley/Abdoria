import { Outlet } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { RewardPresentationProvider } from '@/context/RewardPresentationContext';
import { RewardPresentationHost } from '@/components/rewards/RewardPresentationHost';

export function AppDataProvider() {
  return (
    <AppProvider>
      <RewardPresentationProvider>
        <RewardPresentationHost />
        <Outlet />
      </RewardPresentationProvider>
    </AppProvider>
  );
}
