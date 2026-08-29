import { Outlet } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';
import { GlobalEffectsHost } from '@/components/effects/GlobalEffectsHost';

export function AppDataProvider() {
  return (
    <AppProvider>
      <GlobalEffectsHost />
      <Outlet />
    </AppProvider>
  );
}
