import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bike,
  BookOpen,
  ChevronDown,
  Clock3,
  GraduationCap,
  Hash,
  Heart,
  MoreHorizontal,
  Moon,
  PenLine,
  Sparkles,
  Trophy,
  Waves,
  Zap,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { ACHIEVEMENT_ICON_COMPONENTS } from '@/components/gamification/achievement-icons';
import { playClick } from '@/lib/sounds';
import {
  ATIVIDADE_DESCRICAO_MAX,
  ATIVIDADE_DURACAO_MAX,
  ATIVIDADE_DURACAO_MIN,
  ATIVIDADE_ICONES,
  ATIVIDADE_NOME_MAX,
  ATIVIDADE_NUMERO_MAX,
  ATIVIDADE_NUMERO_MIN,
  ATIVIDADE_TIPO_LABELS,
  type AtividadeExtra,
  type AtividadeMetaTipo,
  type AtividadeTipo,
} from '@shared/atividades';
import type { AchievementIcon } from '@/types';

const fieldClass =
  'mt-1 w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-emerald-500';

/** Ícone de cada tipo no seletor compacto — puramente decorativo/mnemônico. */
const TIPO_ICONS: Record<AtividadeTipo, typeof Zap> = {
  leitura: BookOpen,
  corrida: Zap,
  pedalada: Bike,
  caminhada: MoreHorizontal,
  natacao: Waves,
  meditacao: Moon,
  alongamento: Heart,
  yoga: Sparkles,
  estudo: GraduationCap,
  esporte: Trophy,
  escrita: PenLine,
  organizacao: Sparkles,
  generico: MoreHorizontal,
};

/** Sheet genérico de opções (mesma folha usada pelo Tipo e pelos Ícones) —
    trigger fechado com valor atual + chevron, folha rolável com as opções. */
function usePickerSheet() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return { open, setOpen };
}

/**
 * Campo "Tipo" como dropdown (era uma grade de 13 chips soltas — ocupava
 * espaço demais e não deixava claro qual estava selecionada de relance).
 * Reusa o visual de .game-wheel-picker (gatilho fechado com valor atual +
 * chevron) e .game-picker-sheet (folha de opções), mesmo padrão já usado
 * no seletor numérico do app.
 */
function AtividadeTipoField({
  value,
  onChange,
}: {
  value: AtividadeTipo;
  onChange: (tipo: AtividadeTipo) => void;
}) {
  const { open, setOpen } = usePickerSheet();
  const CurrentIcon = TIPO_ICONS[value];

  return (
    <div className="game-wheel-picker">
      <button
        type="button"
        className="game-wheel-picker__field"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Tipo: ${ATIVIDADE_TIPO_LABELS[value]}`}
      >
        <span className="atividade-tipo-select__current">
          <CurrentIcon size={15} aria-hidden />
          {ATIVIDADE_TIPO_LABELS[value]}
        </span>
        <ChevronDown size={16} className="game-wheel-picker__chevron" aria-hidden />
      </button>

      {open &&
        createPortal(
          <div
            className="game-picker-sheet-overlay"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              className="game-picker-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="atividade-tipo-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="game-picker-sheet__handle" aria-hidden />
              <h2 id="atividade-tipo-sheet-title" className="game-picker-sheet__title">
                Tipo da atividade
              </h2>
              <div
                className="atividade-tipo-select__list"
                role="listbox"
                aria-label="Tipo da atividade"
              >
                {(Object.keys(ATIVIDADE_TIPO_LABELS) as AtividadeTipo[]).map((t) => {
                  const TipoIcon = TIPO_ICONS[t];
                  const ativo = value === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      role="option"
                      aria-selected={ativo}
                      className={`atividade-tipo-select__option${ativo ? ' atividade-tipo-select__option--active' : ''}`}
                      onClick={() => {
                        playClick();
                        onChange(t);
                        setOpen(false);
                      }}
                    >
                      <TipoIcon size={16} aria-hidden />
                      {ATIVIDADE_TIPO_LABELS[t]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * Ícone da atividade como um gatilho circular (mostra o ícone escolhido) ao
 * lado do campo Nome — troca a grade de 6-13 botões sempre visível (que
 * empurrava o resto do form pra baixo) por uma folha só quando o jogador
 * realmente quer trocar o ícone.
 */
function AtividadeIconField({
  value,
  onChange,
}: {
  value: AchievementIcon;
  onChange: (icon: AchievementIcon) => void;
}) {
  const { open, setOpen } = usePickerSheet();
  const CurrentIcon = ACHIEVEMENT_ICON_COMPONENTS[value];

  return (
    <>
      <button
        type="button"
        className="atividade-icon-trigger"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Escolher ícone da atividade"
      >
        <CurrentIcon size={20} aria-hidden />
      </button>

      {open &&
        createPortal(
          <div
            className="game-picker-sheet-overlay"
            onClick={() => setOpen(false)}
            role="presentation"
          >
            <div
              className="game-picker-sheet"
              role="dialog"
              aria-modal="true"
              aria-labelledby="atividade-icon-sheet-title"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="game-picker-sheet__handle" aria-hidden />
              <h2 id="atividade-icon-sheet-title" className="game-picker-sheet__title">
                Ícone da atividade
              </h2>
              <div
                className="atividade-icon-sheet-grid"
                role="listbox"
                aria-label="Ícone da atividade"
              >
                {ATIVIDADE_ICONES.map((option) => {
                  const Icon = ACHIEVEMENT_ICON_COMPONENTS[option];
                  const ativo = value === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={ativo}
                      aria-label={`Ícone ${option}`}
                      className={`atividade-icon-sheet-option${ativo ? ' atividade-icon-sheet-option--active' : ''}`}
                      onClick={() => {
                        playClick();
                        onChange(option);
                        setOpen(false);
                      }}
                    >
                      <Icon size={18} aria-hidden />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Criar/editar uma Atividade. Redesenhado (era 6 seções sempre visíveis,
 * cada uma com título próprio — nome, grade de ícones, "como medir",
 * duração/meta, tipo, descrição — visualmente pesado e confuso demais pra
 * um form de "crie sua atividade"): agora são 2 blocos essenciais sempre
 * visíveis (identidade: ícone + nome · meta: tempo ou número) e um bloco
 * opcional recolhido por padrão (tipo + descrição), que só abre sozinho se
 * a atividade editada já usa um deles.
 */
export function AtividadeFormModal({
  atividade,
  onClose,
  onSave,
}: {
  /** null = criando uma nova. */
  atividade: AtividadeExtra | null;
  onClose: () => void;
  onSave: (atividade: AtividadeExtra) => void;
}) {
  const [nome, setNome] = useState(atividade?.nome ?? '');
  const [descricao, setDescricao] = useState(atividade?.descricao ?? '');
  const [icon, setIcon] = useState<AchievementIcon>(atividade?.icon ?? 'star');
  const [tipo, setTipo] = useState<AtividadeTipo>(atividade?.tipo ?? 'generico');
  const [metaTipo, setMetaTipo] = useState<AtividadeMetaTipo>(atividade?.meta_tipo ?? 'tempo');
  const [minutos, setMinutos] = useState(
    atividade?.meta_tipo === 'tempo' ? atividade.meta_valor : 15,
  );
  // Strings vazias de propósito: o campo só mostra uma dica (placeholder),
  // nunca um valor já preenchido que pareça uma escolha que o usuário não fez.
  const [quantidade, setQuantidade] = useState(
    atividade?.meta_tipo === 'numero' ? String(atividade.meta_valor) : '',
  );
  const [unidade, setUnidade] = useState(atividade?.meta_unidade ?? '');
  const [detalhesAbertos, setDetalhesAbertos] = useState(
    Boolean(
      atividade && ((atividade.tipo && atividade.tipo !== 'generico') || atividade.descricao),
    ),
  );
  const descricaoRef = useRef<HTMLTextAreaElement>(null);

  /** Textarea cresce junto com o texto — sem barra de rolagem própria. */
  const ajustarAlturaDescricao = (el: HTMLTextAreaElement) => {
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    if (detalhesAbertos && descricaoRef.current) ajustarAlturaDescricao(descricaoRef.current);
  }, [detalhesAbertos]);

  const salvar = () => {
    if (nome.trim().length < 2) {
      showGameToast('Dê um nome com pelo menos 2 caracteres.', { variant: 'warn' });
      return;
    }
    const metaValor = metaTipo === 'tempo' ? minutos : Number(quantidade);
    if (
      metaTipo === 'numero' &&
      (!quantidade.trim() || !Number.isFinite(metaValor) || metaValor <= 0)
    ) {
      showGameToast('Diga uma meta (ex.: 5 páginas, 3 km...).', { variant: 'warn' });
      return;
    }

    onSave({
      id: atividade?.id ?? `custom-${Date.now()}`,
      nome: nome.trim().slice(0, ATIVIDADE_NOME_MAX),
      descricao: descricao.trim().slice(0, ATIVIDADE_DESCRICAO_MAX),
      icon,
      tipo,
      meta_tipo: metaTipo,
      meta_valor: metaValor,
      ...(metaTipo === 'numero' ? { meta_unidade: unidade.trim() || 'vezes' } : {}),
      ...(atividade?.builtin ? { builtin: true } : {}),
    });
  };

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="atividade-form-title"
      panelClassName="atividade-form-modal"
    >
      <div className="atividade-form-modal__head">
        <h2 id="atividade-form-title" className="text-base font-extrabold text-stone-800">
          {atividade ? 'Editar atividade' : 'Nova atividade'}
        </h2>
      </div>

      <div className="atividade-form-modal__body flex flex-col gap-4">
        <div className="atividade-identity-row">
          <AtividadeIconField value={icon} onChange={setIcon} />
          <label className="atividade-identity-row__name block text-sm font-semibold">
            Nome da atividade
            <input
              value={nome}
              onChange={(e) => setNome(e.target.value.slice(0, ATIVIDADE_NOME_MAX))}
              placeholder="Ex.: Tocar violão"
              className={fieldClass}
            />
          </label>
        </div>

        <div className="atividade-meta-card">
          <div
            className="atividade-meta-segmented"
            role="tablist"
            aria-label="Como medir a atividade"
          >
            <button
              type="button"
              role="tab"
              aria-selected={metaTipo === 'tempo'}
              onClick={() => {
                playClick();
                setMetaTipo('tempo');
              }}
              className={`atividade-meta-segmented__btn${metaTipo === 'tempo' ? ' atividade-meta-segmented__btn--active' : ''}`}
            >
              <Clock3 size={14} aria-hidden /> Por tempo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={metaTipo === 'numero'}
              onClick={() => {
                playClick();
                setMetaTipo('numero');
              }}
              className={`atividade-meta-segmented__btn${metaTipo === 'numero' ? ' atividade-meta-segmented__btn--active' : ''}`}
            >
              <Hash size={14} aria-hidden /> Por número
            </button>
          </div>

          {metaTipo === 'tempo' ? (
            <label className="mt-3 block text-sm font-semibold">
              Duração: {minutos} min
              <input
                type="range"
                min={ATIVIDADE_DURACAO_MIN}
                max={ATIVIDADE_DURACAO_MAX}
                step={5}
                value={minutos}
                onChange={(e) => setMinutos(Number(e.target.value))}
                className="mt-2 w-full cursor-pointer"
              />
            </label>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="block text-sm font-semibold">
                Meta
                <input
                  type="number"
                  inputMode="numeric"
                  min={ATIVIDADE_NUMERO_MIN}
                  max={ATIVIDADE_NUMERO_MAX}
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  placeholder="Ex.: 5"
                  className={fieldClass}
                />
              </label>
              <label className="block text-sm font-semibold">
                Unidade
                <input
                  value={unidade}
                  onChange={(e) => setUnidade(e.target.value.slice(0, 20))}
                  placeholder="páginas, km..."
                  className={fieldClass}
                />
              </label>
            </div>
          )}
        </div>

        <button
          type="button"
          className="atividade-form-modal__advanced-toggle"
          aria-expanded={detalhesAbertos}
          onClick={() => {
            playClick();
            setDetalhesAbertos((v) => !v);
          }}
        >
          <span>
            Mais detalhes <span className="text-stone-400 font-medium">(tipo, descrição)</span>
          </span>
          <ChevronDown
            size={16}
            className={`atividade-form-modal__advanced-chevron${detalhesAbertos ? ' atividade-form-modal__advanced-chevron--open' : ''}`}
            aria-hidden
          />
        </button>

        {detalhesAbertos && (
          <>
            <div>
              <p className="flex items-center gap-1 text-sm font-semibold">
                Tipo <span className="text-xs font-medium text-stone-400">(opcional)</span>
              </p>
              <p className="mt-0.5 text-[0.68rem] font-medium text-stone-400">
                Ajusta o que perguntamos ao concluir — pode deixar em "Outro".
              </p>
              <div className="mt-2">
                <AtividadeTipoField value={tipo} onChange={setTipo} />
              </div>
            </div>

            <label className="block text-sm font-semibold">
              Descrição <span className="text-xs font-medium text-stone-400">(opcional)</span>
              <textarea
                ref={descricaoRef}
                value={descricao}
                onChange={(e) => {
                  setDescricao(e.target.value.slice(0, ATIVIDADE_DESCRICAO_MAX));
                  ajustarAlturaDescricao(e.target);
                }}
                placeholder="Ex.: Praticar 3 músicas novas"
                rows={2}
                maxLength={ATIVIDADE_DESCRICAO_MAX}
                className={`${fieldClass} resize-none overflow-hidden`}
              />
            </label>
          </>
        )}
      </div>

      <div className="atividade-form-modal__footer">
        <GameButton variant="secondary" className="!w-auto flex-1" onClick={onClose}>
          Cancelar
        </GameButton>
        <GameButton className="!w-auto flex-1" onClick={salvar}>
          Salvar
        </GameButton>
      </div>
    </Modal>
  );
}
