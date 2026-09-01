import { useContext } from 'react';
import { PageEntranceContext } from '@/context/page-entrance-context';

export function usePageEntranceReady() {
  return useContext(PageEntranceContext);
}
