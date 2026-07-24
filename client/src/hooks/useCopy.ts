import { useAuth } from '@/context/AuthContext';
import { resolveCopy, type CopyKey } from '@shared/copy';

/** Resolve texto conforme a preferência de tom (Linguagem de Jogo × Normal). */
export function useCopy() {
  const { user } = useAuth();
  const tom = user?.preferencias?.tom_texto;
  return (key: CopyKey) => resolveCopy(key, tom);
}
