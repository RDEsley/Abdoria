import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { AppDataProvider } from '@/components/auth/AppDataProvider';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/PageLoader';

const LoginPage = lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/pages/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const OnboardingPage = lazy(() =>
  import('@/pages/OnboardingPage').then((m) => ({ default: m.OnboardingPage })),
);
const DashboardPage = lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const LibraryPage = lazy(() =>
  import('@/pages/LibraryPage').then((m) => ({ default: m.LibraryPage })),
);
const BuilderPage = lazy(() =>
  import('@/pages/BuilderPage').then((m) => ({ default: m.BuilderPage })),
);
const LeaderboardPage = lazy(() =>
  import('@/pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const SettingsPage = lazy(() =>
  import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })),
);
const AchievementsPage = lazy(() =>
  import('@/pages/AchievementsPage').then((m) => ({ default: m.AchievementsPage })),
);
const PlayerPage = lazy(() =>
  import('@/pages/PlayerPage').then((m) => ({ default: m.PlayerPage })),
);

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicOnlyRoute />}>
            <Route
              path="login"
              element={
                <LazyPage>
                  <LoginPage />
                </LazyPage>
              }
            />
            <Route
              path="register"
              element={
                <LazyPage>
                  <RegisterPage />
                </LazyPage>
              }
            />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<AppDataProvider />}>
              <Route
                path="onboarding"
                element={
                  <LazyPage>
                    <OnboardingPage />
                  </LazyPage>
                }
              />
              <Route element={<AppLayout />}>
                <Route
                  index
                  element={
                    <LazyPage>
                      <DashboardPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="biblioteca"
                  element={
                    <LazyPage>
                      <LibraryPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="construtor"
                  element={
                    <LazyPage>
                      <BuilderPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="ranking"
                  element={
                    <LazyPage>
                      <LeaderboardPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="perfil"
                  element={
                    <LazyPage>
                      <ProfilePage />
                    </LazyPage>
                  }
                />
                <Route
                  path="configuracoes"
                  element={
                    <LazyPage>
                      <SettingsPage />
                    </LazyPage>
                  }
                />
                <Route
                  path="conquistas"
                  element={
                    <LazyPage>
                      <AchievementsPage />
                    </LazyPage>
                  }
                />
              </Route>
              <Route
                path="player"
                element={
                  <LazyPage>
                    <PlayerPage />
                  </LazyPage>
                }
              />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
