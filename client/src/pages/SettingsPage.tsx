import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Bell,
  ChevronDown,
  Copy,
  Dumbbell,
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
import { SettingsRow, SettingsSwitch } from '@/components/settings/SettingsRow';
import { SettingsSection } from '@/components/settings/SettingsSection';
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
  buildAudioPreferenciasPatch,
  createCoalescingAudioPersister,
} from '@shared/settings/audio-persist';
import {
  AUDIO_VOLUME_DEBOUNCE_MS,
  notificationDeniedGuidance,
  notificationStatusLabel,
} from '@shared/settings/copy';
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
  const [deleteStep, setDeleteStep] = useState<'closed' | 'confirm-phrase' | 'final'>('closed');
  const [deletePhrase, setDeletePhrase] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [showTrainingProfile, setShowTrainingProfile] = useState(false);
  const [showXpRules, setShowXpRules] = useState(() => location.hash === '#regras-xp');
  const planHighlightHandled = useRef(false);

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
      showGameToast('Você chegou ao plano. Toque para ajustar.', {
        variant: 'info',
      });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const [som, setSom] = useState(user?.preferencias?.som_habilitado ?? true);
  const [volume, setVolume] = useState(user?.preferencias?.sfx_volume ?? 0.7);
  const [hydratedUserId, setHydratedUserId] = useState<string | null>(user?.id ?? null);
  const volumeTimer = useRef<number | null>(null);
  const somRef = useRef(som);
  const volumeRef = useRef(volume);
  const userPresentRef = useRef(Boolean(user));
  const applyUserRef = useRef(applyUser);
  const lastOkAudioRef = useRef({
    som: user?.preferencias?.som_habilitado ?? true,
    volume: user?.preferencias?.sfx_volume ?? 0.7,
  });
  const persisterRef = useRef<ReturnType<typeof createCoalescingAudioPersister> | null>(null);

  const getAudioPersister = () => {
    if (!persisterRef.current) {
      persisterRef.current = createCoalescingAudioPersister(async (nextSom, nextVolume) => {
        if (!userPresentRef.current) return;
        try {
          const updated = await updateMe({
            preferencias: buildAudioPreferenciasPatch(nextSom, nextVolume),
          });
          lastOkAudioRef.current = { som: nextSom, volume: nextVolume };
          applyUserRef.current(updated);
          setSoundSettings(nextSom, nextVolume);
        } catch (error) {
          showGameToast(getErrorMessage(error, 'Não foi possível salvar o áudio.'), {
            variant: 'error',
          });
          const ok = lastOkAudioRef.current;
          setSom(ok.som);
          setVolume(ok.volume);
          throw error;
        }
      });
    }
    return persisterRef.current;
  };

  useEffect(() => {
    somRef.current = som;
    volumeRef.current = volume;
  }, [som, volume]);

  useEffect(() => {
    userPresentRef.current = Boolean(user);
  }, [user]);

  useEffect(() => {
    applyUserRef.current = applyUser;
  }, [applyUser]);

  useEffect(() => {
    setSoundSettings(som, volume);
  }, [som, volume]);

  useEffect(() => {
    if (!user || hydratedUserId === user.id) return;
    const nextSom = user.preferencias?.som_habilitado ?? true;
    const nextVolume = user.preferencias?.sfx_volume ?? 0.7;
    setSom(nextSom);
    setVolume(nextVolume);
    lastOkAudioRef.current = { som: nextSom, volume: nextVolume };
    setHydratedUserId(user.id);
  }, [hydratedUserId, user]);

  const persistAudio = (nextSom: boolean, nextVolume: number) => {
    if (!userPresentRef.current) return;
    void getAudioPersister().persist(nextSom, nextVolume);
  };

  const onSomChange = (next: boolean) => {
    setSom(next);
    if (volumeTimer.current != null) {
      window.clearTimeout(volumeTimer.current);
      volumeTimer.current = null;
    }
    persistAudio(next, volumeRef.current);
  };

  const onVolumeChange = (next: number) => {
    setVolume(next);
    if (volumeTimer.current != null) window.clearTimeout(volumeTimer.current);
    volumeTimer.current = window.setTimeout(() => {
      volumeTimer.current = null;
      persistAudio(somRef.current, next);
    }, AUDIO_VOLUME_DEBOUNCE_MS);
  };

  useEffect(() => {
    return () => {
      if (volumeTimer.current != null) {
        window.clearTimeout(volumeTimer.current);
        volumeTimer.current = null;
        if (userPresentRef.current) {
          void getAudioPersister().persist(somRef.current, volumeRef.current);
        }
      }
    };
  }, []);

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
  const isNative = Capacitor.isNativePlatform();

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
  const notifStatus = notificationStatusLabel({
    permission: notifPermission,
    optOut: notifOptOut,
  });
  const deniedGuidance = notificationDeniedGuidance(isNative ? 'native' : 'web');

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
      showGameToast(deniedGuidance.hint, { variant: 'info' });
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

  const copyTag = async () => {
    const text = `${user?.nome ?? ''} #${user?.tag ?? ''}`.trim();
    try {
      await navigator.clipboard.writeText(text);
      showGameToast('Tag copiada!', { variant: 'success' });
    } catch {
      showGameToast('Não foi possível copiar a tag.', { variant: 'error' });
    }
  };

  const planSummary = useMemo(() => {
    if (!user?.ab_training_profile_v2) return 'Configure intensidade, agenda e descanso.';
    const profile = user.ab_training_profile_v2;
    const rest = profile.rest_seconds ?? user.preferencias.descanso_padrao_seg;
    return `${AB_INTENSITY_LABELS[profile.intensity]} · ${profile.training_days.length} dias/semana · ${rest}s`;
  }, [user]);

  const switchEnabled =
    notifPermission === 'granted' || notifPermission === 'prompt' || notifAtivas;

  return (
    <div className="settings-page flex flex-col gap-4 pb-20">
      <GamePageHeader title="Configurações" />

      <SettingsSection label="Conta">
        <SettingsRow
          icon={<UserRound size={16} />}
          title={user?.nome ?? 'Conta'}
          description={`#${user?.tag ?? '----'}`}
          onClick={() => navigate('/perfil')}
          chevron
          trailing={
            <button
              type="button"
              className="settings-inline-icon"
              aria-label="Copiar sua tag"
              title="Copiar tag"
              onClick={() => void copyTag()}
            >
              <Copy size={14} aria-hidden />
            </button>
          }
        />
      </SettingsSection>

      <SettingsSection label="Notificações">
        <SettingsRow
          icon={<Bell size={16} />}
          title="Notificações"
          description={notifStatus}
          trailing={
            switchEnabled ? (
              <SettingsSwitch
                checked={notifAtivas}
                aria-label={notifAtivas ? 'Desativar notificações' : 'Ativar notificações'}
                onChange={() => void toggleNotifications()}
              />
            ) : null
          }
        />
        {notifPermission === 'denied' ? (
          deniedGuidance.actionLabel ? (
            <SettingsRow
              title={deniedGuidance.actionLabel}
              description={deniedGuidance.hint}
              onClick={() => void notifCtx?.openSettings()}
              chevron
            />
          ) : (
            <SettingsRow title="Como ativar" description={deniedGuidance.hint} />
          )
        ) : null}
      </SettingsSection>

      <SettingsSection
        label="Treino"
        id="ajustar-plano"
        className={location.hash === '#ajustar-plano' ? 'is-plan-highlight' : undefined}
      >
        <SettingsRow
          icon={<Dumbbell size={16} />}
          title="Plano de Core"
          description={planSummary}
          onClick={() => setShowTrainingProfile(true)}
          chevron
          trailing={
            <span className="settings-row__action-label">
              {user?.ab_training_profile_v2 ? 'Ajustar' : 'Montar'}
            </span>
          }
        />
      </SettingsSection>

      <SettingsSection label="Áudio">
        <div className="settings-audio-block">
          <header className="settings-audio-card__header">
            <span className="settings-audio-card__icon" aria-hidden>
              <Volume2 size={18} />
            </span>
            <div>
              <h3 className="settings-section__title !mb-0">Sons</h3>
              <p className="settings-section__copy !mt-0.5">
                O mesmo pacote acompanha ações, descanso e Player.
              </p>
            </div>
          </header>
          <label className="settings-audio-toggle">
            <span>
              <strong>Sons do Evolyn</strong>
              <small>
                {som ? 'Ativos em todo o aplicativo' : 'Silenciados em todo o aplicativo'}
              </small>
            </span>
            <input
              type="checkbox"
              checked={som}
              onChange={(e) => onSomChange(e.target.checked)}
            />
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
              onChange={(e) => onVolumeChange(Number(e.target.value))}
            />
          </label>
          <SoundPackSection />
        </div>
      </SettingsSection>

      <SettingsSection label="Recompensas">
        <GiftCodeSection />
      </SettingsSection>

      <SettingsSection label="Experiência">
        <SettingsRow
          icon={<Zap size={16} />}
          title="Regras de XP"
          onClick={() => setShowXpRules((value) => !value)}
          aria-expanded={showXpRules}
          trailing={
            <ChevronDown
              size={16}
              className={`settings-collapse__chevron${showXpRules ? ' settings-collapse__chevron--open' : ''}`}
              aria-hidden
            />
          }
        />
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
              <div className="game-xp-rules settings-xp-rules text-sm font-medium leading-relaxed text-stone-600">
                <p className="mb-2 font-semibold text-stone-700">Treino diário</p>
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
                    Exercícios, streak, conquistas do treino, Atividades e desbloqueios da Biblioteca
                    compartilham esse mesmo limite. Códigos presente creditam suas recompensas
                    diretamente.
                  </li>
                  <li>
                    Após atingir o máx., o restante do dia não rende mais XP desse teto diário
                    compartilhado.
                  </li>
                </ul>
                <p className="mb-2 font-semibold text-stone-700">Bônus de treino</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    Streak: até <strong>+{XP_STREAK_BONUS_MAX} XP</strong> (+
                    {XP_STREAK_BONUS_PER_DAY} por dia de sequência).
                  </li>
                  <li>
                    Conquistas novas: <strong>+{XP_ACHIEVEMENT_BONUS} XP</strong> cada.
                  </li>
                </ul>
                <p className="mb-2 font-semibold text-stone-700">Atividades</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>
                    A primeira conclusão de cada atividade no dia dá <strong>+15 XP</strong> (versão
                    mínima +8 XP), até 4 atividades distintas. Repetições extras só registram o dia.
                  </li>
                  <li>
                    Rotina completa: <strong>+10 XP</strong> uma vez por dia, por rotina.
                  </li>
                  <li>
                    Qualquer ação válida (treino, atividade ou rotina) garante o Dia Ativo e sustenta
                    a sequência.
                  </li>
                </ul>
                <p className="mb-2 font-semibold text-stone-700">{FROZEN_STREAK_LABEL}</p>
                <ul className="mb-3 list-disc space-y-1 pl-5">
                  <li>{formatFrozenStreakDescription()}</li>
                </ul>
                <p className="mb-2 font-semibold text-stone-700">{CURRENCY_NAME}</p>
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
        <SettingsRow
          icon={<PlayCircle size={16} />}
          title="Ver tutorial novamente"
          onClick={() => setShowTutorial(true)}
          chevron
        />
        <SettingsRow
          icon={<ScrollText size={16} />}
          title="Termos e privacidade"
          onClick={() => setShowTerms(true)}
          chevron
        />
      </SettingsSection>

      <SettingsSection label="Sobre">
        <AboutSection />
      </SettingsSection>

      <SettingsSection label="Sessão">
        <SettingsRow
          icon={<LogOut size={16} />}
          title="Sair da conta"
          softDestructive
          onClick={() => setConfirmLogout(true)}
        />
        <SettingsRow
          icon={<Trash2 size={16} />}
          title="Deletar minha conta"
          destructive
          onClick={() => setDeleteStep('confirm-phrase')}
        />
      </SettingsSection>

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
