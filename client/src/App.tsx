import { lazy, Suspense, useEffect } from 'react';
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
import { PwaInstallProvider } from '@/context/PwaInstallContext';

const AuthScenePage = lazy(() =>
  import('@/pages/AuthScenePage').then((m) => ({ default: m.AuthScenePage })),
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
const TrainingPage = lazy(() =>
  import('@/pages/TrainingPage').then((m) => ({ default: m.TrainingPage })),
);
const LeaderboardPage = lazy(() =>
  import('@/pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })),
);
const ProfilePage = lazy(() =>
  import('@/pages/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);
const PublicProfilePage = lazy(() =>
  import('@/pages/PublicProfilePage').then((m) => ({ default: m.PublicProfilePage })),
);
const FriendsPage = lazy(() =>
  import('@/pages/FriendsPage').then((m) => ({ default: m.FriendsPage })),
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
const RoutineRunnerPage = lazy(() =>
  import('@/features/activities/RoutineRunner').then((m) => ({ default: m.RoutineRunnerPage })),
);
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const MyPlantPage = lazy(() =>
  import('@/pages/MyPlantPage').then((m) => ({ default: m.MyPlantPage })),
);
const ActivitiesPage = lazy(() =>
  import('@/pages/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })),
);
const RemindersPage = lazy(() =>
  import('@/pages/RemindersPage').then((m) => ({ default: m.RemindersPage })),
);

function LazyPage({ children }: { children: React.ReactNode }) {
  const booted = typeof document !== 'undefined' && document.documentElement.classList.contains('evolyn-booted');
  return (
    <Suspense fallback={booted ? <div className="route-fallback" aria-hidden /> : <PageLoader />}>
      {children}
    </Suspense>
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
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <BootReadinessProvider>
          <AppBootGate>
            <MotionPreferenceGate>
              <AchievementProvider>
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
        </AuthProvider>
      </BrowserRouter>
    </PwaInstallProvider>
  );
}
