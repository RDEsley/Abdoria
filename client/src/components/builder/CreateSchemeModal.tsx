import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { WheelNumberPicker } from '@/components/ui/WheelNumberPicker';
import { GameButton } from '@/components/ui/GameButton';
import type { NivelUsuario, RepSchemeRecommendation } from '@/types';
import { REP_SCHEME_BY_NIVEL } from '@/types';

interface Props {
  open: boolean;
  nivel: NivelUsuario;
  onClose: () => void;
  onCreate: (scheme: RepSchemeRecommendation) => void;
}

export function CreateSchemeModal({ open, nivel, onClose, onCreate }: Props) {
  const recommendations = REP_SCHEME_BY_NIVEL[nivel];
  const [series, setSeries] = useState(3);
  const [repeticoes, setRepeticoes] = useState(15);

  if (!open) return null;

  const schemeLabel = `${repeticoes} × ${series}`;

  const handleCustomCreate = () => {
    onCreate({
      id: `custom-${Date.now()}`,
      label: schemeLabel,
      series,
      repeticoes,
      descricao: 'Esquema personalizado',
    });
    setSeries(3);
    setRepeticoes(15);
    onClose();
  };

  const handlePickRecommendation = (scheme: RepSchemeRecommendation) => {
    onCreate({ ...scheme, id: `custom-${Date.now()}` });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-900/50 p-4 sm:items-center" role="presentation" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="game-modal w-full max-w-md !p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-scheme-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="game-modal__close-btn" onClick={onClose} aria-label="Fechar">
          <X size={18} />
        </button>

        <h2 id="create-scheme-title" className="game-modal__title">
          Criar esquema
        </h2>
        <p className="game-modal__text">Escolha uma sugestão ou monte repetições e séries do seu jeito.</p>

        <p className="mt-4 text-xs font-extrabold uppercase tracking-wide text-stone-500">Sugestões para {nivel}</p>
        <div className="mt-2 flex flex-col gap-2">
          {recommendations.map((scheme) => (
            <button
              key={scheme.id}
              type="button"
              className="game-scheme-pick"
              onClick={() => handlePickRecommendation(scheme)}
            >
              <span className="game-scheme-pick__label">{scheme.label}</span>
              <span className="game-scheme-pick__hint">{scheme.descricao}</span>
            </button>
          ))}
        </div>

        <div className="game-scheme-divider">
          <span>ou crie o seu</span>
        </div>

        <p className="text-center text-sm font-extrabold text-stone-800">{schemeLabel}</p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <WheelNumberPicker label="Repetições" value={repeticoes} min={1} max={50} onChange={setRepeticoes} />
          <WheelNumberPicker label="Séries" value={series} min={1} max={10} onChange={setSeries} />
        </div>

        <GameButton className="!w-full mt-4 flex items-center justify-center gap-2" onClick={handleCustomCreate}>
          <Plus size={18} /> Adicionar esquema
        </GameButton>
      </motion.div>
    </div>
  );
}
