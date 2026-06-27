import { Outlet } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { DailyShopAutoClaim } from '@/components/shop/DailyShopAutoClaim';
import { RewardPresentationProvider } from '@/context/RewardPresentationContext';
import { RewardPresentationHost } from '@/components/rewards/RewardPresentationHost';

export function AppDataProvider() {
  return (
    <AppProvider>
      <RewardPresentationProvider>
        <DailyShopAutoClaim />
        <RewardPresentationHost />
        <Outlet />
      </RewardPresentationProvider>
    </AppProvider>
  );
}
