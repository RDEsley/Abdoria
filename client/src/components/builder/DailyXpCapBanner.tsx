import { AlertTriangle } from 'lucide-react';

/** Banner sutil quando o máx. diário de XP já foi atingido — não bloqueia o início do treino. */
export function DailyXpCapBanner() {
  return (
    <div
      className="flex items-start gap-2.5 rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2.5 text-amber-900 shadow-sm"
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
    </div>
  );
}
