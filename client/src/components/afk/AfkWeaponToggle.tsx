import { useState } from 'react';
import { BowArrow, Sword } from 'lucide-react';
import { updateMetaPreferences } from '@/lib/api';
import type { ArmaPreferida } from '@/types';

interface Props {
  value: ArmaPreferida;
  onChange: (weapon: ArmaPreferida) => void;
}

export function AfkWeaponToggle({ value, onChange }: Props) {
  const [saving, setSaving] = useState(false);

  const select = async (weapon: ArmaPreferida) => {
    if (weapon === value || saving) return;
    setSaving(true);
    onChange(weapon);
    try {
      await updateMetaPreferences({ arma_preferida: weapon });
    } catch {
      onChange(value);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="game-afk-weapon-toggle" role="group" aria-label="Arma da exploração">
      <button
        type="button"
        className={`game-afk-weapon-toggle__btn${value === 'arco' ? ' game-afk-weapon-toggle__btn--active' : ''}`}
        disabled={saving}
        onClick={() => void select('arco')}
      >
        <BowArrow size={14} aria-hidden />
        Arco
      </button>
      <button
        type="button"
        className={`game-afk-weapon-toggle__btn${value === 'espada' ? ' game-afk-weapon-toggle__btn--active' : ''}`}
        disabled={saving}
        onClick={() => void select('espada')}
      >
        <Sword size={14} aria-hidden />
        Espada
      </button>
    </div>
  );
}
