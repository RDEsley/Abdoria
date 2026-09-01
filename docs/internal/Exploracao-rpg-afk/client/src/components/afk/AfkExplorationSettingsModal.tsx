import { Compass, FastForward, UserRound, X } from 'lucide-react';
import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { updatePreferences } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { showGameToast } from '@/components/ui/GameToast';
import type { PersonagemGenero } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
}

type ExplorationToggle = 'exploracao_auto_abrir' | 'baus_abertura_rapida';
type ExplorationSetting = ExplorationToggle | 'personagem_genero';

const CHARACTER_OPTIONS: readonly {
  id: PersonagemGenero;
  label: string;
  image: string;
}[] = [
  { id: 'masculino', label: 'Herói', image: '/assets/patrol-mascot-village.png' },
  { id: 'feminino', label: 'Heroína', image: '/assets/patrol-mascot-female-village.png' },
];

export function AfkExplorationSettingsModal({ open, onClose }: Props) {
  const { user, applyUser } = useAuth();
  const [saving, setSaving] = useState<ExplorationSetting | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) closeButtonRef.current?.focus();
  }, [open]);

  if (!open || !user) return null;

  const toggle = async (setting: ExplorationToggle) => {
    if (saving) return;
    const previousUser = user;
    const nextValue = !(user.preferencias?.[setting] ?? false);
    const optimisticUser = {
      ...user,
      preferencias: { ...user.preferencias, [setting]: nextValue },
    };
    setSaving(setting);
    applyUser(optimisticUser);
    try {
      applyUser(await updatePreferences({ [setting]: nextValue }));
    } catch (error) {
      applyUser(previousUser);
      showGameToast(getErrorMessage(error, 'Não foi possível salvar esta configuração.'), {
        variant: 'error',
      });
    } finally {
      setSaving(null);
    }
  };

  const changeCharacterGender = async (gender: PersonagemGenero) => {
    if (saving || user.preferencias?.personagem_genero === gender) return;
    const previousUser = user;
    const optimisticUser = {
      ...user,
      preferencias: { ...user.preferencias, personagem_genero: gender },
    };
    setSaving('personagem_genero');
    applyUser(optimisticUser);
    try {
      applyUser(await updatePreferences({ personagem_genero: gender }));
      showGameToast(`Personagem alterado para ${gender === 'feminino' ? 'Heroína' : 'Herói'}.`, {
        variant: 'success',
      });
    } catch (error) {
      applyUser(previousUser);
      showGameToast(getErrorMessage(error, 'Não foi possível trocar o personagem.'), {
        variant: 'error',
      });
    } finally {
      setSaving(null);
    }
  };

  const autoOpen = user.preferencias?.exploracao_auto_abrir ?? false;
  const quickChest = user.preferencias?.baus_abertura_rapida ?? false;
  const characterGender = user.preferencias?.personagem_genero ?? 'masculino';

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;

    const focusable = Array.from(
      panelRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="game-afk-settings"
      role="dialog"
      aria-modal="true"
      aria-labelledby="afk-settings-title"
      onKeyDown={handleKeyDown}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div ref={panelRef} className="game-afk-settings__panel">
        <header>
          <div>
            <span>Preferências da jornada</span>
            <h2 id="afk-settings-title">Configurações da Exploração</h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
          >
            <X size={19} aria-hidden />
          </button>
        </header>

        <section className="game-afk-settings__character" aria-labelledby="afk-character-title">
          <div className="game-afk-settings__character-heading">
            <UserRound size={19} aria-hidden />
            <span>
              <strong id="afk-character-title">Personagem da jornada</strong>
              <small>A mudança aparece imediatamente na vila e nas batalhas.</small>
            </span>
          </div>
          <div
            className="game-afk-settings__character-options"
            role="radiogroup"
            aria-label="Gênero do personagem"
          >
            {CHARACTER_OPTIONS.map((option) => {
              const selected = characterGender === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className={selected ? 'is-selected' : ''}
                  disabled={saving !== null}
                  onClick={() => void changeCharacterGender(option.id)}
                >
                  <img src={option.image} alt="" draggable={false} />
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <button
          type="button"
          className="game-afk-settings__option"
          role="switch"
          aria-checked={autoOpen}
          disabled={saving !== null}
          onClick={() => void toggle('exploracao_auto_abrir')}
        >
          <Compass size={19} aria-hidden />
          <span>
            <strong>Abrir Exploração ao entrar</strong>
            <small>Leva você direto para a jornada ao abrir o app.</small>
          </span>
          <i className={autoOpen ? 'is-on' : ''} aria-hidden />
        </button>

        <button
          type="button"
          className="game-afk-settings__option"
          role="switch"
          aria-checked={quickChest}
          disabled={saving !== null}
          onClick={() => void toggle('baus_abertura_rapida')}
        >
          <FastForward size={19} aria-hidden />
          <span>
            <strong>Abertura rápida dos baús</strong>
            <small>Revela todas as recompensas em uma sequência curta.</small>
          </span>
          <i className={quickChest ? 'is-on' : ''} aria-hidden />
        </button>
      </div>
    </div>
  );
}
