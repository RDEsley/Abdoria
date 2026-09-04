import { Suspense, useEffect, useState, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/context/AuthContext';
import { BootReadinessProvider } from '@/context/boot-readiness';
import { AchievementProvider } from '@/context/AchievementContext';
import { AppDataProvider } from '@/components/auth/AppDataProvider';
import { AppBootGate } from '@/components/auth/AppBootGate';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/PageLoader';
import { RouteErrorBoundary } from '@/components/routing/RouteErrorBoundary';
import { PwaInstallProvider } from '@/context/PwaInstallContext';
import { AppUpdateProvider } from '@/context/AppUpdateContext';
import { AppUpdateBanner } from '@/components/updates/AppUpdateBanner';
import { NotificationPermissionProvider } from '@/context/NotificationPermissionContext';
import { lazyWithRecovery } from '@/lib/lazy-with-recovery';

function recoverLazy<T extends ComponentType<unknown>>(
  moduleId: string,
  importer: () => Promise<Record<string, T>>,
  exportName: string,
) {
  return lazyWithRecovery(moduleId, async () => {
    const mod = await importer();
    return { default: mod[exportName] };
  });
}

const AuthScenePage = recoverLazy('AuthScenePage', () => import('@/pages/AuthScenePage'), 'AuthScenePage');
const OnboardingPage = recoverLazy('OnboardingPage', () => import('@/pages/OnboardingPage'), 'OnboardingPage');
const DashboardPage = recoverLazy('DashboardPage', () => import('@/pages/DashboardPage'), 'DashboardPage');
const LibraryPage = recoverLazy('LibraryPage', () => import('@/pages/LibraryPage'), 'LibraryPage');
const TrainingPage = recoverLazy('TrainingPage', () => import('@/pages/TrainingPage'), 'TrainingPage');
const LeaderboardPage = recoverLazy(
  'LeaderboardPage',
  () => import('@/pages/LeaderboardPage'),
  'LeaderboardPage',
);
const ProfilePage = recoverLazy('ProfilePage', () => import('@/pages/ProfilePage'), 'ProfilePage');
const PublicProfilePage = recoverLazy(
  'PublicProfilePage',
  () => import('@/pages/PublicProfilePage'),
  'PublicProfilePage',
);
const FriendsPage = recoverLazy('FriendsPage', () => import('@/pages/FriendsPage'), 'FriendsPage');
const SettingsPage = recoverLazy('SettingsPage', () => import('@/pages/SettingsPage'), 'SettingsPage');
const AchievementsPage = recoverLazy(
  'AchievementsPage',
  () => import('@/pages/AchievementsPage'),
  'AchievementsPage',
);
const RecordsPage = recoverLazy('RecordsPage', () => import('@/pages/RecordsPage'), 'RecordsPage');
const PlayerPage = recoverLazy('PlayerPage', () => import('@/pages/PlayerPage'), 'PlayerPage');
const RoutineRunnerPage = recoverLazy(
  'RoutineRunnerPage',
  () => import('@/features/activities/RoutineRunner'),
  'RoutineRunnerPage',
);
const AdminPage = recoverLazy('AdminPage', () => import('@/pages/AdminPage'), 'AdminPage');
const MyPlantPage = recoverLazy('MyPlantPage', () => import('@/pages/MyPlantPage'), 'MyPlantPage');
const ActivitiesPage = recoverLazy('ActivitiesPage', () => import('@/pages/ActivitiesPage'), 'ActivitiesPage');
const NutritionPage = recoverLazy('NutritionPage', () => import('@/pages/NutritionPage'), 'NutritionPage');
const RemindersPage = recoverLazy('RemindersPage', () => import('@/pages/RemindersPage'), 'RemindersPage');

function LazyPage({ children }: { children: React.ReactNode }) {
  const [retryKey, setRetryKey] = useState(0);
  const booted =
    typeof document !== 'undefined' &&
    document.documentElement.classList.contains('evolyn-booted');
  return (
    <RouteErrorBoundary key={retryKey} onRetry={() => setRetryKey((value) => value + 1)}>
      <Suspense
        fallback={
          booted ? (
            <div className="route-page-fallback" aria-busy="true" aria-label="Carregando página">
              <div className="route-page-fallback__bar" />
              <div className="route-page-fallback__card" />
              <div className="route-page-fallback__card route-page-fallback__card--short" />
            </div>
          ) : (
            <PageLoader />
          )
        }
      >
        {children}
      </Suspense>
    </RouteErrorBoundary>
  );
}

/** Cada destino começa no topo, inclusive quando o navegador restaura a posição anterior. */
function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.querySelector('main')?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [pathname]);

  return null;
}

/** Framer Motion segue a preferência de acessibilidade do sistema. */
function MotionPreferenceGate({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

export default function App() {
  return (
    <PwaInstallProvider>
      <AppUpdateProvider>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <NotificationPermissionProvider>
          <BootReadinessProvider>
          <AppBootGate>
            <MotionPreferenceGate>
              <AchievementProvider>
                <AppUpdateBanner />
                <Routes>
                  <Route element={<PublicOnlyRoute />}>
                    <Route
                      path="welcome"
                      element={
                        <LazyPage>
                          <AuthScenePage />
                        </LazyPage>
                      }
                    />
                    <Route
                      path="login"
                      element={
                        <LazyPage>
                          <AuthScenePage />
                        </LazyPage>
                      }
                    />
                    <Route
                      path="register"
                      element={
                        <LazyPage>
                          <AuthScenePage />
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
                          path="atividades"
                          element={
                            <LazyPage>
                              <ActivitiesPage />
                            </LazyPage>
                          }
                        />
                        <Route
                          path="lembretes"
                          element={
                            <LazyPage>
                              <RemindersPage />
                            </LazyPage>
                          }
                        />
                        <Route
                          path="myplant"
                          element={
                            <LazyPage>
                              <MyPlantPage />
                            </LazyPage>
                          }
                        />
                        <Route
                          path="alimentacao"
                          element={
                            <LazyPage>
                              <NutritionPage />
                            </LazyPage>
                          }
                        />
                        <Route path="exploracao" element={<Navigate to="/myplant" replace />} />
                        <Route
                          path="exploracao/jornada"
                          element={<Navigate to="/myplant" replace />}
                        />
                        <Route
                          path="treino"
                          element={
                            <LazyPage>
                              <TrainingPage />
                            </LazyPage>
                          }
                        />
                        <Route path="construtor" element={<Navigate to="/treino" replace />} />
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
                          path="perfil/:userId"
                          element={
                            <LazyPage>
                              <PublicProfilePage />
                            </LazyPage>
                          }
                        />
                        <Route
                          path="amigos"
                          element={
                            <LazyPage>
                              <FriendsPage />
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
                        <Route
                          path="recordes"
                          element={
                            <LazyPage>
                              <RecordsPage />
                            </LazyPage>
                          }
                        />
                        <Route
                          path="admin"
                          element={
                            <LazyPage>
                              <AdminPage />
                            </LazyPage>
                          }
                        />
                        <Route
                          path="rotina/:routineId"
                          element={
                            <LazyPage>
                              <RoutineRunnerPage />
                            </LazyPage>
                          }
                        />
                        <Route
                          path="atividades-player"
                          element={<Navigate to="/atividades" replace />}
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
              </AchievementProvider>
            </MotionPreferenceGate>
          </AppBootGate>
          </BootReadinessProvider>
          </NotificationPermissionProvider>
        </AuthProvider>
      </BrowserRouter>
      </AppUpdateProvider>
    </PwaInstallProvider>
  );
}
