import { resolveCopy, type CopyKey } from '@shared/copy';

/** A interface usa uma linguagem única, direta e normal. */
export function useCopy() {
  return (key: CopyKey) => resolveCopy(key, 'normal');
}
