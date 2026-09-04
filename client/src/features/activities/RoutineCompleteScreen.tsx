import { useReducedMotion } from 'framer-motion';
import { GameButton } from '@/components/ui/GameButton';
import { LottieView } from '@/components/ui/LottieView';
import { useLottieAsset } from '@/hooks/useLottieAsset';

const ROTINA_CHECK_URL = '/assets/rotina-check.json';

interface Props {
  routineName: string;
  onContinue: () => void;
}

/** Conclusão própria de rotina — sem Victory de treino, confetti ou share. */
export function RoutineCompleteScreen({ routineName, onContinue }: Props) {
  const reduceMotion = Boolean(useReducedMotion());
  const checkData = useLottieAsset(ROTINA_CHECK_URL, !reduceMotion);

  return (
    <div className="routine-complete" role="status" aria-live="polite">
      <div className="routine-complete__stage">
        <div className="routine-complete__lottie" aria-hidden>
          {!reduceMotion && checkData ? (
            <LottieView data={checkData} loop={false} contain />
          ) : (
            <span className="routine-complete__fallback" />
          )}
        </div>
        <h1 className="routine-complete__title">Rotina concluída!</h1>
        <p className="routine-complete__name">{routineName}</p>
        <p className="routine-complete__copy">Mais um passo plantado hoje.</p>
        <GameButton className="routine-complete__cta" onClick={onContinue}>
          Continuar
        </GameButton>
      </div>
    </div>
  );
}
