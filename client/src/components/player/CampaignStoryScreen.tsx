import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronRight, MapPin, Zap } from 'lucide-react';
import { GameButton } from '@/components/ui/GameButton';
import { AnimatedBackground } from '@/components/ui/AnimatedBackground';
import { CAMPAIGN_EVENT_STYLE } from '@/components/campaign/campaign-style';
import type { CampaignPost } from '@shared/campaign';

const CHAR_INTERVAL_MS = 24;

interface Props {
  post: CampaignPost;
  onContinue: () => void;
}

/**
 * Página de role play pós-treino: o capítulo do Mapa de Campanha gerado pela
 * missão, com texto revelado letra a letra (toque pula a animação).
 */
export function CampaignStoryScreen({ post, onContinue }: Props) {
  const [visibleChars, setVisibleChars] = useState(0);
  const message = post.mensagem;
  const finished = visibleChars >= message.length;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setVisibleChars((count) => {
        if (count >= message.length) {
          window.clearInterval(timer);
          return count;
        }
        return count + 1;
      });
    }, CHAR_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [message]);

  const skip = () => setVisibleChars(message.length);

  const style = CAMPAIGN_EVENT_STYLE[post.tipo] ?? CAMPAIGN_EVENT_STYLE.monstro_derrotado;
  const { Icon } = style;

  return (
    <div
      className="game-app fixed inset-0 z-50 flex flex-col items-center justify-center p-6"
      onClick={finished ? undefined : skip}
      role="presentation"
    >
      <AnimatedBackground variant="player" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="game-campaign-story game-campaign-card-bg relative z-10 w-full max-w-md"
      >
        <header className="game-campaign-story__head">
          <motion.span
            className={`game-campaign-story__icon ${style.className}`}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.7 }}
            aria-hidden
          >
            <Icon size={22} />
          </motion.span>
          <div className="min-w-0">
            <p className="game-campaign-story__type">{post.tipo_label}</p>
            <p className="game-campaign-story__place">
              <MapPin size={11} aria-hidden /> {post.lugar}
            </p>
          </div>
        </header>

        <p className="game-campaign-story__text" aria-label={message}>
          <span aria-hidden>{message.slice(0, visibleChars)}</span>
          {!finished && <span className="game-campaign-story__caret" aria-hidden />}
        </p>

        {!finished && (
          <p className="game-campaign-story__skip-hint" aria-hidden>
            toque para pular
          </p>
        )}

        {finished && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <div className="game-campaign-story__meta">
              {post.exercicio && (
                <span className="game-campaign-story__chip">
                  ⚔ {post.exercicio.nome} · {post.exercicio.detalhe}
                </span>
              )}
              {post.xp != null && post.xp > 0 && (
                <span className="game-campaign-story__chip game-campaign-story__chip--xp">
                  <Zap size={11} aria-hidden /> +{post.xp} XP
                </span>
              )}
            </div>
            <GameButton
              size="lg"
              className="mt-4 flex w-full items-center justify-center gap-2"
              onClick={onContinue}
            >
              Continuar <ChevronRight size={18} />
            </GameButton>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
