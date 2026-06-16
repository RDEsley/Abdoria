import { Outlet } from 'react-router-dom';
import { AppProvider } from '@/context/AppContext';

export function AppDataProvider() {
  return (
    <AppProvider>
      <Outlet />
    </AppProvider>
  );
}
