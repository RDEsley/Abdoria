import { useState } from 'react';
import { CalendarCog, Dumbbell, Info, Moon } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { getErrorMessage } from '@/lib/api-errors';
import { updateMe } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { playClick } from '@/lib/sounds';
import { resolveAgenda, type AtividadesAgendaModo } from '@shared/atividades';

const DIA_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

/** Quando as atividades entram na rotina e se compartilham o fluxo do treino. */
export function AtividadesAgendaModal({ onClose }: { onClose: () => void }) {
  const { user, applyUser } = useAuth();
  const inicial = resolveAgenda(user?.preferencias);
  const [modo, setModo] = useState<AtividadesAgendaModo>(inicial.modo);
  const [dias, setDias] = useState<number[]>(inicial.dias);
  const [juntoComTreino, setJuntoComTreino] = useState(inicial.junto_com_treino);
  const [busy, setBusy] = useState(false);

  const diasTreino = user?.perfil_treino?.dias_semana ?? [];
  const temDiasTreino = diasTreino.length > 0;

  const alternarDia = (dia: number) => {
    playClick();
    setDias((atual) => (atual.includes(dia) ? atual.filter((d) => d !== dia) : [...atual, dia]));
  };

  const usarDiasDescanso = () => {
    playClick();
    const descanso = [0, 1, 2, 3, 4, 5, 6].filter((d) => !diasTreino.includes(d));
    setDias(descanso);
  };

  const salvar = async () => {
    if (!user || busy) return;
    if (modo === 'dias_especificos' && dias.length === 0) {
      showGameToast('Escolha pelo menos um dia.', { variant: 'warn' });
      return;
    }
    setBusy(true);
    try {
      const atualizado = await updateMe({
        preferencias: {
          ...user.preferencias,
          atividades_agenda: { modo, dias, junto_com_treino: juntoComTreino },
        },
      });
      applyUser(atualizado);
      showGameToast('Agenda das atividades atualizada.', { variant: 'success' });
      onClose();
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível salvar.'), { variant: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} labelledBy="atividades-agenda-title">
      <h2
        id="atividades-agenda-title"
        className="flex items-center gap-2 text-base font-extrabold text-stone-800"
      >
        <CalendarCog size={16} aria-hidden /> Quando fazer atividades
      </h2>

      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          aria-pressed={modo === 'todos_dias'}
          onClick={() => {
            playClick();
            setModo('todos_dias');
          }}
          className={`atividade-option${modo === 'todos_dias' ? ' atividade-option--active' : ''}`}
        >
          <span className="atividade-option__text">
            <strong>Todos os dias</strong>
            <small>As atividades ficam sempre disponíveis no Início.</small>
          </span>
        </button>
        <button
          type="button"
          aria-pressed={modo === 'dias_especificos'}
          onClick={() => {
            playClick();
            setModo('dias_especificos');
          }}
          className={`atividade-option${modo === 'dias_especificos' ? ' atividade-option--active' : ''}`}
        >
          <span className="atividade-option__text">
            <strong>Só em dias específicos</strong>
            <small>Escolha os dias em que você quer se cobrar as atividades.</small>
          </span>
        </button>
      </div>

      {modo === 'dias_especificos' && (
        <>
          <div className="mt-3 grid grid-cols-7 gap-1.5">
            {DIA_LABELS.map((label, dia) => {
              const ehTreino = diasTreino.includes(dia);
              const selecionado = dias.includes(dia);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={selecionado}
                  onClick={() => alternarDia(dia)}
                  title={ehTreino ? `${label} · dia de treino` : `${label} · dia de descanso`}
                  className={`atividade-dia${selecionado ? ' atividade-dia--active' : ''}`}
                >
                  {ehTreino && (
                    <span className="atividade-dia__marca" aria-hidden>
                      <Dumbbell size={9} />
                    </span>
                  )}
                  {label}
                </button>
              );
            })}
          </div>

          {temDiasTreino && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-[0.65rem] font-semibold text-stone-500">
                <Dumbbell size={11} aria-hidden /> = dia de treino
              </p>
              <button
                type="button"
                onClick={usarDiasDescanso}
                className="flex cursor-pointer items-center gap-1 text-[0.68rem] font-bold text-emerald-700 hover:text-emerald-800"
              >
                <Moon size={12} aria-hidden /> Usar meus dias de descanso
              </button>
            </div>
          )}
        </>
      )}

      <label className="atividade-switch mt-4">
        <input
          type="checkbox"
          checked={juntoComTreino}
          onChange={(e) => setJuntoComTreino(e.target.checked)}
        />
        <span>
          <strong>Fazer junto com o treino</strong>
          <small>
            Ligado, as atividades entram na mesma sequência da Missão Diária, logo depois do treino.
          </small>
        </span>
      </label>

      <p className="mt-3 flex items-start gap-2 rounded-xl border-2 border-sky-100 bg-sky-50 p-2.5 text-[0.68rem] font-semibold text-sky-800">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden />
        Em dia de treino as atividades não dão XP nem mexem na streak — quem paga o dia é o treino.
        Elas continuam valendo pro calendário e podem liberar conquistas.
      </p>

      <div className="mt-4 flex gap-2">
        <GameButton variant="secondary" className="!w-auto flex-1" onClick={onClose}>
          Cancelar
        </GameButton>
        <GameButton className="!w-auto flex-1" disabled={busy} onClick={() => void salvar()}>
          {busy ? 'Salvando...' : 'Salvar'}
        </GameButton>
      </div>
    </Modal>
  );
}
