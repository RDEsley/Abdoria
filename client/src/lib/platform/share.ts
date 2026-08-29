import { Capacitor } from '@capacitor/core';

interface SharePayload {
  title: string;
  text: string;
  url: string;
}

/** Mantém componentes independentes da implementação web ou Capacitor. */
export async function shareContent(
  payload: SharePayload,
): Promise<'shared' | 'copied' | 'cancelled'> {
  try {
    if (Capacitor.isNativePlatform()) {
      const { Share } = await import('@capacitor/share');
      await Share.share({ ...payload, dialogTitle: payload.title });
      return 'shared';
    }
    if (navigator.share) {
      await navigator.share(payload);
      return 'shared';
    }
    await navigator.clipboard.writeText(payload.url);
    return 'copied';
  } catch {
    return 'cancelled';
  }
}
