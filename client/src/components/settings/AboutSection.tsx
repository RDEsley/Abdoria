import { useState } from 'react';
import { ExternalLink, RefreshCw, Sparkles } from 'lucide-react';
import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  YoutubeIcon,
} from '@/components/icons/BrandIcons';
import { GameButton } from '@/components/ui/GameButton';
import { useAppUpdate } from '@/context/AppUpdateContext';
import { shortBuildId } from '@shared/app-release';
import { showGameToast } from '@/lib/game-toast';

const FATEEIGHT_LINKS = [
  {
    label: 'Instagram',
    handle: '@fateeighttech',
    href: 'https://instagram.com/fateeighttech',
    Icon: InstagramIcon,
  },
  {
    label: 'YouTube',
    handle: '@FateEightTech',
    href: 'https://www.youtube.com/@FateEightTech',
    Icon: YoutubeIcon,
  },
  {
    label: 'Facebook',
    handle: 'Fate Eight Tech',
    href: 'https://www.facebook.com/profile.php?id=61582108484785',
    Icon: FacebookIcon,
  },
  {
    label: 'GitHub',
    handle: 'fateeighttech',
    href: 'https://github.com/fateeighttech',
    Icon: GithubIcon,
  },
] as const;

/** Créditos + redes sociais da empresa responsável pelo Evolyn + comunidade do projeto. */
export function AboutSection() {
  const { running, checkForUpdates } = useAppUpdate();
  const [checking, setChecking] = useState(false);

  const onCheck = async () => {
    if (checking) return;
    setChecking(true);
    try {
      const result = await checkForUpdates();
      if (result.status === 'latest') {
        showGameToast('Você já está na versão mais recente.', { variant: 'success' });
        return;
      }
      if (result.status === 'available') {
        showGameToast(`Nova versão ${result.latest.version} disponível.`, { variant: 'info' });
        return;
      }
      if (result.status === 'offline') {
        showGameToast('Não foi possível verificar agora.', { variant: 'warn' });
        return;
      }
      showGameToast('Não foi possível verificar agora.', { variant: 'warn' });
    } finally {
      setChecking(false);
    }
  };

  return (
    <section className="glass-card p-4">
      <h3 className="game-section-title mb-1 flex items-center gap-2">
        <Sparkles size={14} /> Sobre o Evolyn
      </h3>
      <p className="mb-3 text-xs font-medium text-stone-500">
        Desenvolvido pela <strong>Fateeight</strong>. Siga a empresa nas redes:
      </p>

      <div className="settings-social-links">
        {FATEEIGHT_LINKS.map(({ label, handle, href, Icon }) => (
          <a
            key={label}
            className="settings-social-link"
            href={href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="settings-social-link__icon" aria-hidden>
              <Icon size={15} />
            </span>
            <span className="settings-social-link__text">
              <strong>{label}</strong>
              <small>{handle}</small>
            </span>
          </a>
        ))}
      </div>

      <p className="mt-4 mb-2 text-xs font-bold text-stone-600">Comunidade do projeto</p>
      <div className="settings-social-links">
        <a
          className="settings-social-link"
          href="https://github.com/rdesley"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="settings-social-link__icon" aria-hidden>
            <GithubIcon size={15} />
          </span>
          <span className="settings-social-link__text">
            <strong>GitHub do projeto</strong>
            <small>rdesley</small>
          </span>
        </a>
        <a
          className="settings-social-link"
          href="https://discord.gg/jPFMb3tp3W"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="settings-social-link__icon" aria-hidden>
            <DiscordIcon size={15} />
          </span>
          <span className="settings-social-link__text">
            <strong>Discord do Evolyn</strong>
            <small>
              Comunidade oficial <ExternalLink size={10} aria-hidden />
            </small>
          </span>
        </a>
      </div>

      <div className="app-about-release mt-4">
        <p className="app-about-release__title">Evolyn</p>
        <p className="app-about-release__meta">
          Versão {running.version}
          <span aria-hidden> · </span>
          Build {shortBuildId(running.build)}
        </p>
        <div className="app-about-release__actions">
          <GameButton
            size="sm"
            variant="secondary"
            disabled={checking}
            onClick={() => void onCheck()}
            className="!w-auto"
          >
            <RefreshCw size={14} aria-hidden className={checking ? 'animate-spin' : undefined} />
            {checking ? 'Verificando…' : 'Verificar atualizações'}
          </GameButton>
        </div>
      </div>
    </section>
  );
}
