import { useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { isStandaloneDisplay } from '@/lib/platform/display-mode';

const DISMISS_KEY = 'evolyn:welcome-install-dismissed-at';
const DISMISS_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

function isDismissedRecently(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_COOLDOWN_MS;
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

/** CTA discreto na Welcome — reutiliza PwaInstallContext; sem prompt em native/standalone. */
export function WelcomeInstallPrompt({ visible }: { visible: boolean }) {
  const { installed, install } = usePwaInstall();
  const [hidden, setHidden] = useState(() => isDismissedRecently());
  const [instructions, setInstructions] = useState<'ios' | 'browser' | null>(null);

  const eligible = useMemo(() => {
    if (!visible) return false;
    if (Capacitor.isNativePlatform()) return false;
    if (installed || isStandaloneDisplay()) return false;
    if (hidden) return false;
    return true;
  }, [visible, installed, hidden]);

  if (!eligible && !instructions) return null;

  const dismiss = () => {
    markDismissed();
    setHidden(true);
    setInstructions(null);
  };

  const onInstall = async () => {
    const result = await install();
    if (result === 'accepted' || result === 'already-installed') {
      setHidden(true);
      setInstructions(null);
      return;
    }
    if (result === 'dismissed') {
      markDismissed();
      setHidden(true);
      return;
    }
    if (result === 'ios-instructions') {
      setInstructions('ios');
      return;
    }
    setInstructions('browser');
  };

  if (instructions) {
    return (
      <div className="welcome-install welcome-install--guide" role="status">
        <button
          type="button"
          className="welcome-install__close"
          aria-label="Fechar"
          onClick={dismiss}
        >
          <X size={14} aria-hidden />
        </button>
        <p className="welcome-install__title">Instalar o Evolyn</p>
        {instructions === 'ios' ? (
          <ol className="welcome-install__steps">
            <li>Safari</li>
            <li>Compartilhar</li>
            <li>Adicionar à Tela de Início</li>
          </ol>
        ) : (
          <p className="welcome-install__lead">
            No menu do navegador, escolha Instalar aplicativo ou Adicionar à tela inicial.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="welcome-install" role="region" aria-label="Instalar aplicativo">
      <button
        type="button"
        className="welcome-install__close"
        aria-label="Dispensar"
        onClick={dismiss}
      >
        <X size={14} aria-hidden />
      </button>
      <div className="welcome-install__copy">
        <p className="welcome-install__title">Leve o Evolyn com você</p>
        <p className="welcome-install__lead">Instale o app e abra direto pela tela inicial.</p>
      </div>
      <button type="button" className="welcome-install__cta" onClick={() => void onInstall()}>
        <Download size={14} aria-hidden />
        Instalar
      </button>
    </div>
  );
}
