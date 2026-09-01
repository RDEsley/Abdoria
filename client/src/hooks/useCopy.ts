import { resolveCopy, type CopyKey } from '@shared/copy';

export function useCopy() {
  return (key: CopyKey) => resolveCopy(key);
}
