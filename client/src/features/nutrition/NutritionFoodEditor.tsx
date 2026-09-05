import { useState } from 'react';
import { GameButton } from '@/components/ui/GameButton';
import { Modal } from '@/components/ui/Modal';
import { showGameToast } from '@/lib/game-toast';
import { getErrorMessage } from '@/lib/api-errors';
import { createUserFood } from '@/lib/api/nutrition';
import type { FoodRecord } from '@shared/nutrition';

const EMPTY = {
  name: '',
  serving_description: 'porção',
  serving_grams: '100',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
};

export function NutritionFoodEditor({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (food: FoodRecord) => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) {
      showGameToast('Informe o nome do alimento.', { variant: 'warn' });
      return;
    }
    setSaving(true);
    try {
      const created = await createUserFood({
        name: form.name.trim(),
        serving_description: form.serving_description.trim() || 'porção',
        serving_grams: Number(form.serving_grams) || null,
        calories: Number(form.calories),
        protein_g: Number(form.protein_g),
        carbs_g: Number(form.carbs_g),
        fat_g: Number(form.fat_g),
      });
      setForm(EMPTY);
      onCreated(created);
      showGameToast('Alimento criado.', { variant: 'success' });
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível criar o alimento.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="nutrition-food-editor-title">
      <h2 id="nutrition-food-editor-title" className="text-base font-extrabold text-stone-800">
        Novo alimento
      </h2>
      <div className="nutrition-form-grid mt-3">
        {(
          [
            ['name', 'Nome'],
            ['serving_description', 'Porção'],
            ['serving_grams', 'Gramas'],
            ['calories', 'kcal'],
            ['protein_g', 'Proteína (g)'],
            ['carbs_g', 'Carbo (g)'],
            ['fat_g', 'Gordura (g)'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-sm">
            {label}
            <input
              className="game-input mt-1 w-full"
              value={form[key]}
              onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <GameButton variant="ghost" className="!w-auto px-4" onClick={onClose} disabled={saving}>
          Cancelar
        </GameButton>
        <GameButton className="!w-auto px-5" onClick={() => void save()} disabled={saving}>
          {saving ? 'Salvando…' : 'Criar'}
        </GameButton>
      </div>
    </Modal>
  );
}
