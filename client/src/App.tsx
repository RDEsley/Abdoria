import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { AuthProvider } from '@/context/AuthContext';
import { AchievementProvider } from '@/context/AchievementContext';
import { AppDataProvider } from '@/components/auth/AppDataProvider';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/auth/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { PageLoader } from '@/components/ui/PageLoader';
import { PwaInstallProvider } from '@/context/PwaInstallContext';

const LoginPage = lazy(() => import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
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
const AtividadesPlayerPage = lazy(() =>
  import('@/pages/AtividadesPlayerPage').then((m) => ({ default: m.AtividadesPlayerPage })),
);
const AdminPage = lazy(() => import('@/pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const CampaignBookPage = lazy(() =>
  import('@/pages/CampaignBookPage').then((m) => ({ default: m.CampaignBookPage })),
);
const MyPlantPage = lazy(() =>
  import('@/pages/MyPlantPage').then((m) => ({ default: m.MyPlantPage })),
);
const ActivitiesPage = lazy(() =>
  import('@/pages/ActivitiesPage').then((m) => ({ default: m.ActivitiesPage })),
);

/**
 * DESATIVADO TEMPORARIAMENTE: o arquivo com todos os capítulos anteriores da
 * Campanha continua preservado, mas não deve possuir rota nem acesso no front-end.
 * O Mapa de Campanha exibe somente o capítulo atual e o imediatamente anterior.
 */
const CAMPAIGN_ARCHIVE_ENABLED = false;

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
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
          <MotionPreferenceGate>
            <AchievementProvider>
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
                        path="atividades"
                        element={
                          <LazyPage>
                            <ActivitiesPage />
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
                        path="atividades-player"
                        element={
                          <LazyPage>
                            <AtividadesPlayerPage />
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
                    {CAMPAIGN_ARCHIVE_ENABLED ? (
                      <Route
                        path="campanha"
                        element={
                          <LazyPage>
                            <CampaignBookPage />
                          </LazyPage>
                        }
                      />
                    ) : null}
                  </Route>
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AchievementProvider>
          </MotionPreferenceGate>
        </AuthProvider>
      </BrowserRouter>
    </PwaInstallProvider>
  );
}
