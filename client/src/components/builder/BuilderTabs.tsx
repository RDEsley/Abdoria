import { Dumbbell, Sparkles } from 'lucide-react';

export type BuilderTab = 'train' | 'customize';

interface Props {
  active: BuilderTab;
  onChange: (tab: BuilderTab) => void;
}

export function BuilderTabs({ active, onChange }: Props) {
  return (
    <div
      className="flex rounded-2xl border-2 border-stone-200/80 bg-white/70 p-1 shadow-sm backdrop-blur-sm"
      role="tablist"
      aria-label="Modo do construtor de treino"
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === 'train'}
        id="builder-tab-train"
        aria-controls="builder-panel-train"
        className={[
          'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition-all',
          active === 'train'
            ? 'bg-emerald-500 text-white shadow-md'
            : 'text-stone-600 hover:bg-stone-50',
        ].join(' ')}
        onClick={() => onChange('train')}
      >
        <Sparkles size={16} aria-hidden />
        Treinar Agora
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === 'customize'}
        id="builder-tab-customize"
        aria-controls="builder-panel-customize"
        className={[
          'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-extrabold transition-all',
          active === 'customize'
            ? 'bg-sky-500 text-white shadow-md'
            : 'text-stone-600 hover:bg-stone-50',
        ].join(' ')}
        onClick={() => onChange('customize')}
      >
        <Dumbbell size={16} aria-hidden />
        Criar/Personalizar
      </button>
    </div>
  );
}
