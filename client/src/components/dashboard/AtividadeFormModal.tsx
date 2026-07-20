import { useState } from 'react';
import {
  Bike,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Clock3,
  Footprints,
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
import { showGameToast } from '@/components/ui/GameToast';
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
  caminhada: Footprints,
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

const ICONES_COLAPSADO = 6;

/**
 * Criar/editar uma Atividade: ícone, nome, tipo (opcional — define o
 * formulário de conclusão) e a meta, por tempo em minutos ou uma contagem
 * livre (páginas, km, vezes...).
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
  const [iconesExpandidos, setIconesExpandidos] = useState(false);
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

  const iconesVisiveis = iconesExpandidos
    ? ATIVIDADE_ICONES
    : ATIVIDADE_ICONES.slice(0, ICONES_COLAPSADO);

  const salvar = () => {
    if (nome.trim().length < 2) {
      showGameToast('Dê um nome com pelo menos 2 caracteres.', { variant: 'warn' });
      return;
    }
    const metaValor = metaTipo === 'tempo' ? minutos : Number(quantidade);
    if (metaTipo === 'numero' && (!quantidade.trim() || !Number.isFinite(metaValor) || metaValor <= 0)) {
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

  const maisIcones = ATIVIDADE_ICONES.length - ICONES_COLAPSADO;

  return (
    <Modal open onClose={onClose} labelledBy="atividade-form-title" panelClassName="atividade-form-modal">
      <div className="atividade-form-modal__head">
        <h2 id="atividade-form-title" className="text-base font-extrabold text-stone-800">
          {atividade ? 'Editar atividade' : 'Nova atividade'}
        </h2>
      </div>

      <div className="atividade-form-modal__body flex flex-col gap-3">
        <label className="block text-sm font-semibold">
          Nome
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value.slice(0, ATIVIDADE_NOME_MAX))}
            placeholder="Ex.: Tocar violão"
            className={fieldClass}
          />
        </label>

        <div>
          <p className="text-sm font-semibold">Ícones</p>
          <div className="mt-2 grid grid-cols-6 gap-1.5">
            {iconesVisiveis.map((option) => {
              const Icon = ACHIEVEMENT_ICON_COMPONENTS[option];
              return (
                <button
                  key={option}
                  type="button"
                  aria-label={`Ícone ${option}`}
                  aria-pressed={icon === option}
                  className={`flex h-9 cursor-pointer items-center justify-center rounded-xl border-2 ${
                    icon === option
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 text-stone-500 hover:border-emerald-300'
                  }`}
                  onClick={() => {
                    playClick();
                    setIcon(option);
                  }}
                >
                  <Icon size={16} aria-hidden />
                </button>
              );
            })}
          </div>
          {maisIcones > 0 && (
            <button
              type="button"
              onClick={() => {
                playClick();
                setIconesExpandidos((v) => !v);
              }}
              className="atividade-form-modal__ver-mais"
            >
              {iconesExpandidos ? (
                <>
                  <ChevronUp size={13} aria-hidden /> Ver menos ícones
                </>
              ) : (
                <>
                  <ChevronDown size={13} aria-hidden /> Ver mais ícones (+{maisIcones})
                </>
              )}
            </button>
          )}
        </div>

        <div>
          <p className="text-sm font-semibold">Como você mede essa atividade?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              aria-pressed={metaTipo === 'tempo'}
              onClick={() => {
                playClick();
                setMetaTipo('tempo');
              }}
              className={`atividade-meta-btn${metaTipo === 'tempo' ? ' atividade-meta-btn--active' : ''}`}
            >
              <Clock3 size={15} aria-hidden /> Por tempo
            </button>
            <button
              type="button"
              aria-pressed={metaTipo === 'numero'}
              onClick={() => {
                playClick();
                setMetaTipo('numero');
              }}
              className={`atividade-meta-btn${metaTipo === 'numero' ? ' atividade-meta-btn--active' : ''}`}
            >
              <Hash size={15} aria-hidden /> Por número
            </button>
          </div>
        </div>

        {metaTipo === 'tempo' ? (
          <label className="block text-sm font-semibold">
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
          <div className="grid grid-cols-2 gap-2">
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

        <div>
          <p className="flex items-center gap-1 text-sm font-semibold">
            Tipos <span className="text-xs font-medium text-stone-400">(opcional)</span>
          </p>
          <p className="mt-0.5 text-[0.68rem] font-medium text-stone-400">
            Ajusta o que perguntamos ao concluir — pode deixar em "Outro". Arraste para ver mais.
          </p>
          <div className="atividade-tipo-scroll mt-2">
            {(Object.keys(ATIVIDADE_TIPO_LABELS) as AtividadeTipo[]).map((t) => {
              const TipoIcon = TIPO_ICONS[t];
              const ativo = tipo === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => {
                    playClick();
                    setTipo(t);
                  }}
                  className={`atividade-tipo-chip${ativo ? ' atividade-tipo-chip--active' : ''}`}
                >
                  <TipoIcon size={12} aria-hidden /> {ATIVIDADE_TIPO_LABELS[t]}
                </button>
              );
            })}
          </div>
        </div>

        <label className="block text-sm font-semibold">
          Descrição <span className="text-xs font-medium text-stone-400">(opcional)</span>
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value.slice(0, ATIVIDADE_DESCRICAO_MAX))}
            placeholder="Ex.: Praticar 3 músicas novas"
            className={fieldClass}
          />
        </label>
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
