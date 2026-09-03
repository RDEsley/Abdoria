import { useCallback, useEffect, useState } from 'react';
import { listQuests } from '@/lib/api/quests';
import { useMidnightRefresh } from '@/context/MidnightRefreshContext';

export function useClaimableQuestCount(refreshKey?: unknown) {
  const [count, setCount] = useState(0);

  const reload = useCallback(() => {
    void listQuests()
      .then((quests) => {
        setCount(quests.filter((quest) => !quest.claimed && quest.progress >= quest.goal).length);
      })
      .catch(() => setCount(0));
  }, []);

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener('evolyn:quests-changed', onChange);
    return () => window.removeEventListener('evolyn:quests-changed', onChange);
  }, [reload, refreshKey]);

  useMidnightRefresh(reload);

  return count;
}
