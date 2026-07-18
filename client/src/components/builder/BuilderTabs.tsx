import { Dumbbell, Swords } from 'lucide-react';

export type BuilderTab = 'train' | 'customize';

interface Props {
  active: BuilderTab;
  onChange: (tab: BuilderTab) => void;
}

export function BuilderTabs({ active, onChange }: Props) {
  return (
    <div className="flex gap-2" role="tablist" aria-label="Modo do construtor de treino">
      <button
        type="button"
        role="tab"
        aria-selected={active === 'train'}
        id="builder-tab-train"
        aria-controls="builder-panel-train"
        className={`game-tab flex items-center justify-center gap-2${active === 'train' ? ' game-tab--active' : ''}`}
        onClick={() => onChange('train')}
      >
        <Swords size={16} aria-hidden />
        Treinar agora
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'customize'}
        id="builder-tab-customize"
        aria-controls="builder-panel-customize"
        className={`game-tab flex items-center justify-center gap-2${active === 'customize' ? ' game-tab--active' : ''}`}
        onClick={() => onChange('customize')}
      >
        <Dumbbell size={16} aria-hidden />
        Criar/personalizar
      </button>
    </div>
  );
}
