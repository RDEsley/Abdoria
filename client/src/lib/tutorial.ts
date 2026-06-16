import { updateMe } from '@/lib/api';
import type { IUserDocument } from '@/types';

/** Persiste que o usuário viu o tutorial interativo. */
export async function markTutorialSeen(user: IUserDocument): Promise<void> {
  if (user.preferencias?.tutorial_visto) return;
  await updateMe({
    preferencias: {
      ...user.preferencias,
      tutorial_visto: true,
    },
  });
}

export function shouldShowFirstTimeTutorial(user: IUserDocument | null): boolean {
  return Boolean(user?.onboarding_completed && user.preferencias?.tutorial_visto === false);
}
