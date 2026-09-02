import { Capacitor } from '@capacitor/core';
import { hydrateNativeWorkoutSnapshot } from '@/lib/workout-session-storage';

const isNativeApp = () => Capacitor.isNativePlatform();
let nativeSplashHidden = false;

export async function hideNativeSplash(): Promise<void> {
  if (!isNativeApp() || nativeSplashHidden) return;
  nativeSplashHidden = true;
  const { SplashScreen } = await import('@capacitor/splash-screen');
  await SplashScreen.hide();
}

export async function initializeNativeRuntime(): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  await hydrateNativeWorkoutSnapshot();
  const [{ App }, { StatusBar, Style }] = await Promise.all([
    import('@capacitor/app'),
    import('@capacitor/status-bar'),
  ]);
  await StatusBar.setStyle({ style: Style.Dark });
  if (Capacitor.getPlatform() === 'android')
    await StatusBar.setBackgroundColor({ color: '#f4faf7' });
  const stateListener = await App.addListener('appStateChange', ({ isActive }) =>
    window.dispatchEvent(new CustomEvent('evolyn:app-state', { detail: { isActive } })),
  );
  const backListener = await App.addListener('backButton', ({ canGoBack }) =>
    canGoBack ? window.history.back() : void App.minimizeApp(),
  );
  const urlListener = await App.addListener('appUrlOpen', ({ url }) =>
    window.dispatchEvent(new CustomEvent('evolyn:deep-link', { detail: { url } })),
  );
  return () => {
    void stateListener.remove();
    void backListener.remove();
    void urlListener.remove();
  };
}

export async function selectionHaptic(): Promise<void> {
  if (!isNativeApp()) return;
  const { Haptics } = await import('@capacitor/haptics');
  await Haptics.selectionChanged();
}

export async function actionHaptic(): Promise<void> {
  if (!isNativeApp()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Medium });
}

export async function successHaptic(): Promise<void> {
  if (!isNativeApp()) return;
  const { Haptics, NotificationType } = await import('@capacitor/haptics');
  await Haptics.notification({ type: NotificationType.Success });
}
