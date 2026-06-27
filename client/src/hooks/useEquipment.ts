import { useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { updateMe } from '@/lib/api';
import { EQUIPMENT_CATALOG, resolveUserEquipment, type EquipmentId } from '@/types';

export function useEquipment(onUpdated?: () => void) {
  const { user, refreshUser } = useAuth();
  const { ensureExercises, loadRecommendations } = useApp();

  const equipment = resolveUserEquipment(user?.preferencias);

  const setEquipmentOwned = useCallback(
    async (id: EquipmentId, owned: boolean) => {
      if (!user) return;
      const nextEquipamentos = {
        ...user.preferencias?.equipamentos,
        [id]: owned,
      };
      await updateMe({
        preferencias: {
          ...user.preferencias,
          equipamentos: nextEquipamentos,
        },
      });
      await refreshUser();
      await ensureExercises();
      void loadRecommendations({ force: true });
      onUpdated?.();
    },
    [user, refreshUser, ensureExercises, loadRecommendations, onUpdated],
  );

  return {
    equipment,
    catalog: EQUIPMENT_CATALOG,
    setEquipmentOwned,
    isOwned: (id: EquipmentId) => Boolean(equipment[id]),
  };
}
