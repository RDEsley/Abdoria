import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Flame, ListChecks, Sparkles, Sprout, Target } from 'lucide-react';
import { AuthLogo } from '@/components/auth/AuthLogo';
import { TermsModal } from '@/components/legal/TermsModal';
import { GameButton } from '@/components/ui/GameButton';
import { showGameToast } from '@/components/ui/GameToast';
import { useAuth } from '@/context/AuthContext';
import { completeOnboarding } from '@/lib/api';

const FEATURES = [
  { icon: Target, title: 'Core em primeiro lugar', text: 'Missões focadas em abdômen e core.' },
  { icon: ListChecks, title: 'Rotina completa', text: 'Atividades para cuidar da sua constância.' },
  { icon: Sparkles, title: 'Progresso visível', text: 'XP, níveis e recompensas a cada avanço.' },
  { icon: Flame, title: 'Streak', text: 'Um incentivo simples para voltar amanhã.' },
  { icon: Award, title: 'Conquistas', text: 'Marcos que celebram sua evolução.' },
  { icon: Sprout, title: 'MyPlant', text: 'Uma nova companhia chegará em breve.' },
];

/** Entrada curta. A configuração do treino acontece no contexto da Missão. */
export function OnboardingPage() {
  const { user, applyUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(Boolean(user?.terms_accepted_at));
  const [showTerms, setShowTerms] = useState(!user?.terms_accepted_at);
  const [saving, setSaving] = useState(false);

  const enter = async () => {
    if (!termsAccepted) {
      setShowTerms(true);
      showGameToast('Aceite os termos para entrar no Evolyn.', { variant: 'warn' });
      return;
    }
    setSaving(true);
    try {
      const updated = await completeOnboarding({
        onboarding_completed: true,
        terms_accepted: !user?.terms_accepted_at,
        preferencias: { tom_texto: 'normal', tutorial_visto: true },
      });
      applyUser(updated);
      await refreshUser();
      navigate('/', { replace: true });
    } catch {
      showGameToast('Não foi possível entrar agora. Tente novamente.', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="onb-v2-shell">
      <section className="onb-v2-card" aria-labelledby="welcome-title">
        <AuthLogo />
        <div className="onb-v2-copy">
          <span className="onb-v2-eyebrow">Sua evolução começa aqui</span>
          <h1 id="welcome-title">Bem-vindo ao Evolyn</h1>
          <p>Treinos de abdômen com a energia de um jogo e a clareza de um app fitness premium.</p>
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
          {saving ? 'Entrando…' : 'Entrar no Evolyn'}
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
