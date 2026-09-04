import { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { getTodaySaoPaulo } from '@shared/utils/timezone';

const DISMISS_KEY = 'evolyn:xp-cap-banner-dismissed';

function readDismissedForToday(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === getTodaySaoPaulo();
  } catch {
    return false;
  }
}

function writeDismissedForToday(): void {
  try {
    localStorage.setItem(DISMISS_KEY, getTodaySaoPaulo());
  } catch {
    /* storage indisponível — só some nesta sessão */
  }
}

/** Banner sutil quando o máx. diário de XP já foi atingido — não bloqueia o início do treino. */
export function DailyXpCapBanner() {
  const [dismissed, setDismissed] = useState(readDismissedForToday);

  if (dismissed) return null;

  const dismiss = () => {
    writeDismissedForToday();
    setDismissed(true);
  };

  return (
    <div
      className="relative flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 py-2.5 pl-3 pr-8 text-amber-900 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
      <div className="min-w-0 text-xs leading-snug">
        <p className="font-extrabold">Máx. diário de XP atingido</p>
        <p className="mt-0.5 font-semibold text-amber-800/90">
          Esta sessão não renderá mais XP hoje, mas você pode treinar normalmente.
        </p>
      </div>
      <button
        type="button"
        className="absolute right-1.5 top-1.5 inline-flex size-6 items-center justify-center rounded-md text-amber-700/70 transition-colors hover:bg-amber-100 hover:text-amber-900"
        aria-label="Dispensar aviso"
        onClick={dismiss}
      >
        <X size={14} strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
