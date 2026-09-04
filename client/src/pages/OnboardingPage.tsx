import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Bell, Flame, ListChecks, Sparkles, Sprout, Target } from 'lucide-react';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { RegisterCelebration } from '@/components/auth/RegisterCelebration';
import { TermsModal } from '@/components/legal/TermsModal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/lib/game-toast';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationPermissionOptional } from '@/context/NotificationPermissionContext';
import { completeOnboarding } from '@/lib/api';
import { consumeJustRegistered, hasJustRegistered } from '@/lib/welcome-storage';

const FEATURES = [
  {
    icon: Target,
    title: 'Treino no seu ritmo',
    text: 'Sessões guiadas e ajustáveis à sua rotina.',
  },
  {
    icon: ListChecks,
    title: 'Organização pessoal',
    text: 'Atividades, notas e lembretes em um só lugar.',
  },
  { icon: Sparkles, title: 'Progresso visível', text: 'XP, níveis e recompensas a cada avanço.' },
  { icon: Flame, title: 'Streak', text: 'Um incentivo simples para voltar amanhã.' },
  { icon: Award, title: 'Conquistas', text: 'Marcos que celebram sua evolução.' },
  { icon: Sprout, title: 'MyPlant', text: 'Uma nova companhia chegará em breve.' },
];

type Step = 'welcome' | 'notifications';

export function OnboardingPage() {
  const { user, applyUser } = useAuth();
  const navigate = useNavigate();
  const notif = useNotificationPermissionOptional();
  const [termsAccepted, setTermsAccepted] = useState(Boolean(user?.terms_accepted_at));
  const [showTerms, setShowTerms] = useState(!user?.terms_accepted_at);
  const [step, setStep] = useState<Step>('welcome');
  const [saving, setSaving] = useState(false);
  const [celebrate, setCelebrate] = useState(() => hasJustRegistered());

  useEffect(() => {
    consumeJustRegistered();
  }, []);

  const finish = async () => {
    setSaving(true);
    try {
      const updated = await completeOnboarding({
        onboarding_completed: true,
        terms_accepted: !user?.terms_accepted_at,
        preferencias: { tom_texto: 'normal', tutorial_visto: false },
      });
      applyUser(updated);
      navigate('/', { replace: true });
    } catch {
      showGameToast('Não foi possível entrar agora. Tente novamente.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const enter = async () => {
    if (!termsAccepted) {
      setShowTerms(true);
      showGameToast('Aceite os termos para entrar no Evolyn.', { variant: 'warn' });
      return;
    }
    setStep('notifications');
  };

  const activateNotifications = async () => {
    try {
      const permission = notif ? await notif.requestPermission() : 'unsupported';
      if (permission === 'granted') {
        showGameToast('Notificações ativadas.', { variant: 'success' });
      }
    } catch {
      /* optional */
    }
    await finish();
  };

  const skipNotifications = async () => {
    notif?.markOnboardingSkipped();
    await finish();
  };

  if (celebrate) {
    return <RegisterCelebration onDone={() => setCelebrate(false)} />;
  }

  if (step === 'notifications') {
    return (
      <main className="onb-v2-shell">
        <section className="onb-v2-card" aria-labelledby="notif-onb-title">
          <span
            className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"
            aria-hidden
          >
            <Bell size={24} />
          </span>
          <div className="onb-v2-copy">
            <span className="onb-v2-eyebrow">Na hora certa</span>
            <h1 id="notif-onb-title">Deixe o Evolyn te acompanhar</h1>
            <p>
              Ative avisos para atividades, rotinas, lembretes e toques importantes — sempre no seu
              ritmo.
            </p>
          </div>
          <GameButton className="onb-v2-enter" size="lg" disabled={saving} onClick={() => void activateNotifications()}>
            {saving ? 'Entrando…' : 'Ativar notificações'}
          </GameButton>
          <button
            type="button"
            className="onb-v2-terms"
            disabled={saving}
            onClick={() => void skipNotifications()}
          >
            Agora não
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="onb-v2-shell">
      <section className="onb-v2-card" aria-labelledby="welcome-title">
        <AuthLogo />
        <div className="onb-v2-copy">
          <span className="onb-v2-eyebrow">Sua evolução começa aqui</span>
          <h1 id="welcome-title">Bem-vindo ao Evolyn</h1>
          <p>Plante bons hábitos, acompanhe seu progresso e evolua no seu ritmo.</p>
        </div>
        <div className="onb-v2-features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title} className="onb-v2-feature">
              <span aria-hidden>
                <Icon size={20} />
              </span>
              <div>
                <strong>{title}</strong>
                <small>{text}</small>
              </div>
            </article>
          ))}
        </div>
        <GameButton
          className="onb-v2-enter"
          size="lg"
          disabled={saving}
          onClick={() => void enter()}
        >
          Continuar
        </GameButton>
        <button type="button" className="onb-v2-terms" onClick={() => setShowTerms(true)}>
          Ler termos e privacidade
        </button>
      </section>
      <TermsModal
        open={showTerms}
        requireAccept={!user?.terms_accepted_at}
        onClose={() => user?.terms_accepted_at && setShowTerms(false)}
        onAccept={() => {
          setTermsAccepted(true);
          setShowTerms(false);
        }}
      />
    </main>
  );
}
