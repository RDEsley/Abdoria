import { useState } from 'react';
import { Check, Swords } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { updateMe } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { playClick } from '@/lib/sounds';
import type { ArmaPreferida, PersonagemGenero } from '@/types';

interface Props {
  onDone: () => void;
}

const GENEROS: { id: PersonagemGenero; label: string; img: string }[] = [
  { id: 'masculino', label: 'Herói', img: '/assets/patrol-mascot-village.png' },
  { id: 'feminino', label: 'Heroína', img: '/assets/patrol-mascot-female-village.png' },
];

function weaponsFor(
  genero: PersonagemGenero,
): { id: ArmaPreferida; label: string; hint: string; img: string }[] {
  const suffix = genero === 'feminino' ? '-female' : '';
  return [
    {
      id: 'arco',
      label: 'Arco',
      hint: 'Ataque à distância',
      img: `/assets/patrol-mascot${suffix}-arco.png`,
    },
    {
      id: 'espada',
      label: 'Espada',
      hint: 'Combate corpo a corpo',
      img: `/assets/patrol-mascot${suffix}-espada.png`,
    },
  ];
}

/**
 * Fluxo de 1ª entrada na Exploração: escolher o personagem (gênero, depois
 * arma) antes de qualquer coisa — saiu do Onboarding pra viver aqui, já que
 * só faz sentido pra quem realmente for explorar. Sequência fixa: gênero
 * sempre antes da arma.
 */
export function ExplorationIntroFlow({ onDone }: Props) {
  const { user, applyUser } = useAuth();
  const [genero, setGenero] = useState<PersonagemGenero | null>(null);
  const [arma, setArma] = useState<ArmaPreferida | null>(null);
  const [saving, setSaving] = useState(false);

  const step: 'genero' | 'arma' = genero === null ? 'genero' : 'arma';

  const confirmArma = async (armaEscolhida: ArmaPreferida) => {
    if (!genero || saving || !user) return;
    setArma(armaEscolhida);
    setSaving(true);
    try {
      const updated = await updateMe({
        preferencias: {
          ...user.preferencias,
          personagem_genero: genero,
          arma_preferida: armaEscolhida,
        },
      });
      applyUser(updated);
      onDone();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar seu personagem.'), {
        variant: 'error',
      });
      setSaving(false);
    }
  };

  return (
    <div className="exploration-intro">
      <div className="exploration-intro__card">
        {step === 'genero' ? (
          <>
            <Swords size={26} className="exploration-intro__icon" aria-hidden />
            <h2 className="exploration-intro__title">Escolha seu personagem</h2>
            <p className="exploration-intro__subtitle">
              Como sua patrulha vai aparecer na Exploração.
            </p>
            <div className="exploration-intro__grid">
              {GENEROS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="onb-weapon-card"
                  onClick={() => {
                    playClick();
                    setGenero(option.id);
                  }}
                >
                  <img
                    src={option.img}
                    alt=""
                    className="onb-weapon-card__img"
                    draggable={false}
                  />
                  <span className="onb-weapon-card__label">{option.label}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <Swords size={26} className="exploration-intro__icon" aria-hidden />
            <h2 className="exploration-intro__title">Escolha seu estilo de combate</h2>
            <p className="exploration-intro__subtitle">
              Sua patrulha luta sozinha nesse estilo enquanto você treina de verdade aqui fora.
            </p>
            <div className="exploration-intro__grid">
              {weaponsFor(genero!).map((weapon) => (
                <button
                  key={weapon.id}
                  type="button"
                  disabled={saving}
                  className={`onb-weapon-card${arma === weapon.id ? ' onb-weapon-card--selected' : ''}`}
                  onClick={() => void confirmArma(weapon.id)}
                >
                  <img
                    src={weapon.img}
                    alt=""
                    className="onb-weapon-card__img"
                    draggable={false}
                  />
                  <span className="onb-weapon-card__label">{weapon.label}</span>
                  <span className="onb-weapon-card__hint">{weapon.hint}</span>
                  {arma === weapon.id && (
                    <span className="onb-weapon-card__check" aria-hidden>
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </button>
              ))}
            </div>
            <GameButton
              variant="secondary"
              className="exploration-intro__back w-full"
              disabled={saving}
              onClick={() => setGenero(null)}
            >
              Voltar
            </GameButton>
          </>
        )}
      </div>
    </div>
  );
}
