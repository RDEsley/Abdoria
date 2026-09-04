import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  ClipboardList,
  Copy,
  HelpCircle,
  LogOut,
  PlayCircle,
  ScrollText,
  Trash2,
  UserRound,
  Volume2,
  Zap,
} from 'lucide-react';
import { showGameToast } from '@/lib/game-toast';
import { Modal } from '@/components/ui/Modal';
import { TermsModal } from '@/components/legal/TermsModal';
import { AbTrainingProfileWizard } from '@/components/training/AbTrainingProfileWizard';
import { AboutSection } from '@/components/settings/AboutSection';
import { GiftCodeSection } from '@/components/settings/GiftCodeSection';
import { SoundPackSection } from '@/components/settings/SoundPackSection';
import { ONBOARDING_TUTORIAL_SLIDES } from '@/components/tutorial/onboarding-tutorial-slides';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPermissionOptional } from '@/context/NotificationPermissionContext';
import { deleteAccount, updateMe } from '@/lib/api';
import { getErrorMessage } from '@/lib/api-errors';
import { setSoundSettings } from '@/lib/sounds';
import { markTutorialSeen } from '@/lib/tutorial';
import { notificationScheduler } from '@/lib/platform/notification-scheduler';
import { ensureWebPushSubscription, removeWebPushSubscription } from '@/lib/platform/web-push';
import { Capacitor } from '@capacitor/core';
import { AB_INTENSITY_LABELS } from '@shared/ab-training-profile';
import {
  MOEDA_XP_STEP,
  CURRENCY_NAME,
  formatFrozenStreakDescription,
  FROZEN_STREAK_LABEL,
  XP_ACHIEVEMENT_BONUS,
  XP_DAILY_CAP_BASE,
  XP_DAILY_CAP_PER_ACHIEVEMENT,
  XP_DAILY_CAP_PER_LEVEL,
  XP_DAILY_MIN_EXERCISES,
  XP_DAILY_PER_EXERCISE,
  XP_STREAK_BONUS_MAX,
  XP_STREAK_BONUS_PER_DAY,
} from '@/types';

export function SettingsPage() {
  const { user, logout, refreshUser, applyUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showTerms, setShowTerms] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  /** 1ª confirmação: digitar a frase. 2ª: tela final, separada, de "tem certeza mesmo". */
  const [deleteStep, setDeleteStep] = useState<'closed' | 'confirm-phrase' | 'final'>('closed');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showTrainingProfile, setShowTrainingProfile] = useState(false);
  const [showXpRules, setShowXpRules] = useState(() => location.hash === '#regras-xp');
  const planHighlightHandled = useRef(false);

  // Deep link "Ver regras de XP": expande o dropdown e rola até ele.
  useEffect(() => {
    if (location.hash !== '#regras-xp') return;
    setShowXpRules(true);
    const timer = window.setTimeout(() => {
      document.getElementById('regras-xp')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 260);
    return () => window.clearTimeout(timer);
  }, [location.hash]);
  useEffect(() => {
    if (location.hash !== '#ajustar-plano' || planHighlightHandled.current) return;
    planHighlightHandled.current = true;
    const timer = window.setTimeout(() => {
      document.getElementById('ajustar-plano')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      showGameToast('Você chegou ao plano. Toque em Ajustar plano de treino.', {
        variant: 'info',
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [location.hash]);
  const [som, setSom] = useState(user?.preferencias?.som_habilitado ?? true);
  const [volume, setVolume] = useState(user?.preferencias?.sfx_volume ?? 0.7);
  const [saving, setSaving] = useState(false);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(user?.id ?? null);

  // Prévia instantânea: os mesmos valores globais já usados pelo Player.
  useEffect(() => {
    setSoundSettings(som, volume);
  }, [som, volume]);

  // O provider pode terminar de carregar depois do primeiro render. Hidratamos
  // uma vez por conta antes de comparar o formulário, evitando um falso "alterado".
  useEffect(() => {
    if (!user || hydratedUserId === user.id) return;
    setSom(user.preferencias?.som_habilitado ?? true);
    setVolume(user.preferencias?.sfx_volume ?? 0.7);
    setHydratedUserId(user.id);
  }, [hydratedUserId, user]);

  // Barra de salvar só aparece quando algo realmente mudou em relação ao salvo.
  const dirty = useMemo(() => {
    if (!user || hydratedUserId !== user.id) return false;
    const prefs = user.preferencias;
    return som !== (prefs?.som_habilitado ?? true) || volume !== (prefs?.sfx_volume ?? 0.7);
  }, [user, hydratedUserId, som, volume]);

  const discard = () => {
    setSom(user?.preferencias?.som_habilitado ?? true);
    setVolume(user?.preferencias?.sfx_volume ?? 0.7);
  };

  const save = async () => {
    setSaving(true);
    try {
      const updated = await updateMe({
        preferencias: {
          ...user!.preferencias,
          som_habilitado: som,
          sfx_volume: volume,
          tom_texto: 'normal',
        },
      });
      applyUser(updated);
      setSoundSettings(som, volume);
      showGameToast('Configurações salvas.', { variant: 'success' });
    } catch (error) {
      showGameToast(getErrorMessage(error, 'Não foi possível salvar as configurações.'), {
        variant: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/welcome');
  };

  const closeDeleteFlow = () => {
    setDeleteStep('closed');
    setDeletePhrase('');
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      await deleteAccount();
      await logout();
      navigate('/welcome');
      showGameToast('Conta apagada. Sentiremos sua falta.', { variant: 'info' });
    } catch (err) {
      showGameToast(getErrorMessage(err, 'Não foi possível apagar a conta.'), {
        variant: 'error',
      });
      setDeletingAccount(false);
    }
  };

  const notifCtx = useNotificationPermissionOptional();
  const [notifPermission, setNotifPermission] = useState(
    () => (notifCtx?.permission ?? 'prompt') as 'prompt' | 'granted' | 'denied' | 'unsupported',
  );

  useEffect(() => {
    if (notifCtx) {
      setNotifPermission(notifCtx.permission);
      return undefined;
    }
    void notificationScheduler.permissionState().then(setNotifPermission);
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void notificationScheduler.permissionState().then(setNotifPermission);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [notifCtx, notifCtx?.permission]);
  const notifOptOut = user?.preferencias?.notificacoes_opt_out ?? false;
  const notifAtivas = notifPermission === 'granted' && !notifOptOut;

  const toggleNotifications = async () => {
    if (notifAtivas) {
      try {
        await removeWebPushSubscription().catch(() => undefined);
        const updated = await updateMe({
          preferencias: { ...user!.preferencias, notificacoes_opt_out: true },
        });
        applyUser(updated);
        await notificationScheduler.sync([], { optOut: true });
        showGameToast('Notificações desativadas.', { variant: 'info' });
      } catch (err) {
        showGameToast(getErrorMessage(err, 'Não foi possível desativar.'), { variant: 'error' });
      }
      return;
    }

    if (notifPermission === 'denied') {
      showGameToast('Notificações bloqueadas — ative nas configurações do dispositivo.', {
        variant: 'info',
      });
      if (Capacitor.isNativePlatform()) {
        await notifCtx?.openSettings();
      }
      return;
    }

    if (notifPermission === 'unsupported') {
      showGameToast('Notificações não são suportadas neste dispositivo.', { variant: 'info' });
      return;
    }

    const permission = notifCtx
      ? await notifCtx.requestPermission()
      : await notificationScheduler.requestPermission();
    setNotifPermission(permission);
    if (permission !== 'granted') return;

    try {
      const updated = await updateMe({
        preferencias: { ...user!.preferencias, notificacoes_opt_out: false },
      });
      applyUser(updated);
      await ensureWebPushSubscription().catch(() => undefined);
    } catch {
      /* permissão do navegador já foi concedida — segue mesmo se o save falhar */
    }
    showGameToast('Notificações ativadas! Vamos te avisar na hora certa.', { variant: 'success' });
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    if (user) {
      void markTutorialSeen(user).then(() => refreshUser());
    }
  };

  return (
    <div className="settings-page flex flex-col gap-4 pb-20">
      <GamePageHeader eyebrow="Sistema" title="Opções" />

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <UserRound size={14} /> Conta
        </h3>
        <div className="flex items-center gap-2">
          <span className="min-w-0 truncate text-sm font-extrabold text-stone-800">
            {user?.nome}
          </span>
          <span className="settings-user-tag tabular-nums">#{user?.tag ?? '----'}</span>
          <button
            type="button"
            className="settings-tag-copy"
            aria-label="Copiar sua tag"
            title="Copiar tag"
            onClick={() => {
              void navigator.clipboard.writeText(`${user?.nome ?? ''} #${user?.tag ?? ''}`.trim());
              showGameToast('Tag copiada!', { variant: 'success' });
            }}
          >
            <Copy size={13} aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs font-medium text-stone-500">
          Sua tag identifica você mesmo que existam outros jogadores com o mesmo nome.
        </p>
      </section>

      <section
        id="ajustar-plano"
        className={`glass-card settings-plan-card p-4${location.hash === '#ajustar-plano' ? ' is-highlighted' : ''}`}
      >
        <h3 className="game-section-title mb-2 flex items-center gap-2">
          <ClipboardList size={14} /> Meu plano de treino
        </h3>
        <p className="text-xs font-medium text-stone-500">
          {user?.ab_training_profile_v2
            ? `${AB_INTENSITY_LABELS[user.ab_training_profile_v2.intensity]} · ${user.ab_training_profile_v2.training_days.length} dias/semana · ${user.ab_training_profile_v2.rest_seconds ?? user.preferencias.descanso_padrao_seg}s de descanso · som personalizado`
            : 'Configure intensidade, agenda, som e descanso dos seus treinos.'}
        </p>
        <GameButton
          variant="secondary"
          className="mt-3 w-full"
          onClick={() => setShowTrainingProfile(true)}
        >
          {user?.ab_training_profile_v2 ? 'Ajustar plano de treino' : 'Montar meu plano'}
        </GameButton>
      </section>

      <section className="glass-card settings-audio-card p-4">
        <header className="settings-audio-card__header">
          <span className="settings-audio-card__icon" aria-hidden>
            <Volume2 size={19} />
          </span>
          <div>
            <h3 className="game-section-title !mb-0">Áudio</h3>
            <p>O mesmo pacote acompanha ações, descanso e Player.</p>
          </div>
        </header>
        <label className="settings-audio-toggle">
          <span>
            <strong>Sons do Evolyn</strong>
            <small>
              {som ? 'Ativos em todo o aplicativo' : 'Silenciados em todo o aplicativo'}
            </small>
          </span>
          <input type="checkbox" checked={som} onChange={(e) => setSom(e.target.checked)} />
          <i aria-hidden />
        </label>
        <label className={`settings-audio-volume${som ? '' : ' is-disabled'}`}>
          <span>
            <strong>Volume</strong>
            <output>{Math.round(volume * 100)}%</output>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={volume}
            disabled={!som}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
        <SoundPackSection />
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <Bell size={14} /> Notificações
        </h3>
        <p className="mb-3 text-xs font-medium text-stone-500">
          Avisos de atividades, rotinas e lembretes na hora certa.
        </p>
        <p className="mb-3 text-xs font-semibold text-stone-600">
          Status:{' '}
          {notifOptOut
            ? 'Desativadas no Evolyn'
            : notifPermission === 'granted'
              ? 'Ativas'
              : notifPermission === 'denied'
                ? 'Bloqueadas no dispositivo'
                : notifPermission === 'unsupported'
                  ? 'Indisponíveis neste dispositivo'
                  : 'Aguardando permissão'}
        </p>
        <GameButton
          variant="secondary"
          className="w-full"
          aria-pressed={notifAtivas}
          onClick={() => void toggleNotifications()}
        >
          {notifAtivas ? 'Desativar notificações' : 'Ativar notificações'}
        </GameButton>
        {notifPermission === 'denied' && Capacitor.isNativePlatform() ? (
          <GameButton
            variant="ghost"
            className="mt-2 w-full"
            onClick={() => void notifCtx?.openSettings()}
          >
            Abrir configurações
          </GameButton>
        ) : null}
      </section>

      <section className="glass-card overflow-hidden">
        <button
          type="button"
          className="settings-collapse__toggle"
          aria-expanded={showXpRules}
          onClick={() => setShowXpRules((v) => !v)}
        >
          <h3 className="game-section-title mb-0 flex items-center gap-2">
            <Zap size={14} /> Regras de XP
          </h3>
          <ChevronDown
            size={18}
            className={`settings-collapse__chevron${showXpRules ? ' settings-collapse__chevron--open' : ''}`}
            aria-hidden
          />
        </button>
        <AnimatePresence initial={false}>
          {showXpRules && (
            <motion.div
              id="regras-xp"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="game-xp-rules px-4 pb-4 text-sm font-medium leading-relaxed text-stone-600">
                <p className="mb-2 font-bold text-stone-700">Treino diário</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    <strong>{XP_DAILY_PER_EXERCISE} XP</strong> por exercício concluído (treino com
                    mínimo de <strong>{XP_DAILY_MIN_EXERCISES}</strong> exercícios).
                  </li>
                  <li>
                    Máx. diário unificado: <strong>{XP_DAILY_CAP_BASE}</strong> base +{' '}
                    <strong>{XP_DAILY_CAP_PER_LEVEL}</strong> por nível +{' '}
                    <strong>{XP_DAILY_CAP_PER_ACHIEVEMENT}</strong> por conquista desbloqueada.
                  </li>
                  <li>
                    Exercícios, streak, conquistas do treino, Atividades e desbloqueios da
                    Biblioteca compartilham esse mesmo limite. Códigos presente creditam suas
                    recompensas diretamente.
                  </li>
                  <li>Após atingir o máx., o restante do dia não rende mais XP de treino.</li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">Bônus de treino</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    Streak: até <strong>+{XP_STREAK_BONUS_MAX} XP</strong> (+
                    {XP_STREAK_BONUS_PER_DAY} por dia de sequência).
                  </li>
                  <li>
                    Conquistas novas: <strong>+{XP_ACHIEVEMENT_BONUS} XP</strong> cada.
                  </li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">Atividades</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    A primeira conclusão de cada atividade no dia dá <strong>+15 XP</strong> (versão
                    mínima +8 XP), até 4 atividades distintas. Repetições extras só registram o dia.
                  </li>
                  <li>
                    Rotina completa: <strong>+10 XP</strong> uma vez por dia, por rotina.
                  </li>
                  <li>
                    Qualquer ação válida (treino, atividade ou rotina) garante o Dia Ativo e
                    sustenta a sequência. Concluir atividades não marca o treino do dia como feito.
                  </li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">{FROZEN_STREAK_LABEL}</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>{formatFrozenStreakDescription()}</li>
                </ul>
                <p className="mb-2 font-bold text-stone-700">{CURRENCY_NAME}</p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong>1 {CURRENCY_NAME}</strong> a cada <strong>{MOEDA_XP_STEP} XP</strong>{' '}
                    totais ganhos (conversão automática).
                  </li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <GiftCodeSection />

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-3 flex items-center gap-2">
          <HelpCircle size={14} /> Ajuda
        </h3>
        <div className="flex flex-col gap-2">
          <GameButton
            variant="secondary"
            className="flex w-full items-center justify-center gap-2"
            onClick={() => setShowTutorial(true)}
          >
            <PlayCircle size={16} aria-hidden /> Ver o tutorial novamente
          </GameButton>
          <GameButton
            variant="ghost"
            className="flex w-full items-center justify-center gap-2"
            onClick={() => setShowTerms(true)}
          >
            <ScrollText size={16} aria-hidden /> Termos e condições
          </GameButton>
        </div>
      </section>

      <AboutSection />

      <GameButton
        variant="secondary"
        onClick={() => setConfirmLogout(true)}
        className="flex items-center justify-center gap-2 text-red-600"
      >
        <LogOut size={18} /> Sair da conta
      </GameButton>

      <GameButton
        variant="ghost"
        onClick={() => setDeleteStep('confirm-phrase')}
        className="flex items-center justify-center gap-2 text-red-600"
      >
        <Trash2 size={18} /> Deletar minha conta
      </GameButton>

      <Modal
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        labelledBy="logout-confirm-title"
      >
        <h2 id="logout-confirm-title" className="text-base font-extrabold text-stone-800">
          Sair da conta?
        </h2>
        <p className="mt-2 text-sm font-medium text-stone-600">
          Você vai precisar entrar de novo para continuar sua jornada.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GameButton
            variant="ghost"
            className="!w-auto px-4"
            onClick={() => setConfirmLogout(false)}
          >
            Cancelar
          </GameButton>
          <GameButton variant="danger" className="!w-auto px-5" onClick={() => void handleLogout()}>
            Sair
          </GameButton>
        </div>
      </Modal>

      {/* 1ª confirmação: digitar a frase exata. */}
      <Modal
        open={deleteStep === 'confirm-phrase'}
        onClose={closeDeleteFlow}
        labelledBy="delete-account-phrase-title"
      >
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={20} aria-hidden />
          <h2 id="delete-account-phrase-title" className="text-base font-extrabold text-stone-800">
            Deletar sua conta?
          </h2>
        </div>
        <p className="mt-2 text-sm font-medium text-stone-600">
          Isso apaga treinos, XP, streak, cosméticos e todo o resto pra sempre — não dá pra
          desfazer. Pra confirmar, escreva <strong>tenho certeza</strong> no campo abaixo.
        </p>
        <input
          type="text"
          value={deletePhrase}
          onChange={(e) => setDeletePhrase(e.target.value)}
          placeholder="tenho certeza"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="game-input mt-3 w-full"
        />
        <div className="mt-4 flex justify-end gap-2">
          <GameButton variant="ghost" className="!w-auto px-4" onClick={closeDeleteFlow}>
            Cancelar
          </GameButton>
          <GameButton
            variant="danger"
            className="!w-auto px-5"
            disabled={deletePhrase.trim().toLowerCase() !== 'tenho certeza'}
            onClick={() => setDeleteStep('final')}
          >
            Continuar
          </GameButton>
        </div>
      </Modal>

      {/* 2ª confirmação: última chance, separada da digitação da frase. */}
      <Modal
        open={deleteStep === 'final'}
        onClose={closeDeleteFlow}
        labelledBy="delete-account-final-title"
      >
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle size={20} aria-hidden />
          <h2 id="delete-account-final-title" className="text-base font-extrabold text-stone-800">
            Essa é sua última chance
          </h2>
        </div>
        <p className="mt-2 text-sm font-medium text-stone-600">
          Ao confirmar, sua conta é apagada imediatamente e não pode ser recuperada.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <GameButton
            variant="ghost"
            className="!w-auto px-4"
            disabled={deletingAccount}
            onClick={closeDeleteFlow}
          >
            Cancelar
          </GameButton>
          <GameButton
            variant="danger"
            className="!w-auto px-5"
            disabled={deletingAccount}
            onClick={() => void handleDeleteAccount()}
          >
            {deletingAccount ? 'Apagando...' : 'Sim, deletar minha conta'}
          </GameButton>
        </div>
      </Modal>

      <AnimatePresence>
        {dirty && (
          <div className="settings-savebar-wrap">
            <motion.div
              className="settings-savebar"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            >
              <span className="settings-savebar__label">Alterações não salvas</span>
              <div className="settings-savebar__actions">
                <GameButton variant="ghost" className="!w-auto px-3" onClick={discard}>
                  Descartar
                </GameButton>
                <GameButton className="!w-auto px-5" disabled={saving} onClick={() => void save()}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </GameButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      <TutorialOverlay
        open={showTutorial}
        onClose={handleTutorialClose}
        slides={ONBOARDING_TUTORIAL_SLIDES}
      />
      <AbTrainingProfileWizard
        open={showTrainingProfile}
        onClose={() => setShowTrainingProfile(false)}
      />
    </div>
  );
}
