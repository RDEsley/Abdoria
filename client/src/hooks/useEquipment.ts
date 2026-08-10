import { useCallback } from 'react';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/hooks/useApp';
import { updateMe } from '@/lib/api';
import { EQUIPMENT_CATALOG, resolveUserEquipment, type EquipmentId } from '@/types';

export function useEquipment(onUpdated?: () => void) {
  const { user, applyUser, refreshUser } = useAuth();
  const { applyUser: applyAppUser, ensureExercises, loadRecommendations } = useApp();

  const equipment = resolveUserEquipment(user?.preferencias);

  const setEquipmentOwned = useCallback(
    async (id: EquipmentId, owned: boolean) => {
      if (!user) return;

      // Otimista: o switch muda na hora. Antes esperava 3 idas ao servidor
      // em sequência (updateMe → refreshUser → refetch de exercícios) antes
      // de QUALQUER feedback visual — dava a sensação de app travado, ainda
      // mais em conexão ruim.
      const preferencias = {
        ...user.preferencias,
        equipamentos: { ...user.preferencias?.equipamentos, [id]: owned },
      };
      const otimista = { ...user, preferencias };
      applyUser(otimista);
      applyAppUser(otimista);

      try {
        await updateMe({ preferencias });
        await refreshUser();
        const changesExerciseCatalog = !EQUIPMENT_CATALOG.find((item) => item.id === id)
          ?.informationalOnly;
        if (changesExerciseCatalog) {
          await ensureExercises({ force: true });
          void loadRecommendations({ force: true });
        }
        onUpdated?.();
      } catch (err) {
        applyUser(user);
        applyAppUser(user);
        showGameToast(getErrorMessage(err, 'Não foi possível salvar — desfazendo.'), {
          variant: 'error',
        });
      }
    },
    [user, applyUser, applyAppUser, refreshUser, ensureExercises, loadRecommendations, onUpdated],
  );

  return {
    equipment,
    catalog: EQUIPMENT_CATALOG,
    setEquipmentOwned,
    isOwned: (id: EquipmentId) => Boolean(equipment[id]),
  };
}
