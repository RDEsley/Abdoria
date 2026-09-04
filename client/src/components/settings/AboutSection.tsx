import { useState } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
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
    href: 'https://instagram.com/fateeighttech',
    Icon: InstagramIcon,
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@FateEightTech',
    Icon: YoutubeIcon,
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/profile.php?id=61582108484785',
    Icon: FacebookIcon,
  },
  {
    label: 'GitHub',
    href: 'https://github.com/fateeighttech',
    Icon: GithubIcon,
  },
] as const;

const COMMUNITY_LINKS = [
  {
    label: 'Discord',
    href: 'https://discord.gg/jPFMb3tp3W',
    Icon: DiscordIcon,
  },
  {
    label: 'Repositório',
    href: 'https://github.com/RDEsley/Evolyn-Core-Quest',
    Icon: GithubIcon,
  },
] as const;

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
    <section className="settings-section">
      <p className="settings-section__copy">Desenvolvido pela Fate Eight.</p>

      <div className="about-version">
        <div>
          <strong>Versão {running.version}</strong>
          <span>Build {shortBuildId(running.build)}</span>
        </div>
        <GameButton
          variant="secondary"
          disabled={checking}
          onClick={() => void onCheck()}
          className="shrink-0"
        >
          <RefreshCw size={14} aria-hidden className={checking ? 'animate-spin' : undefined} />
          {checking ? 'Verificando…' : 'Atualizar'}
        </GameButton>
      </div>

      <p className="settings-section__label">Redes</p>
      <div className="about-links">
        {FATEEIGHT_LINKS.map(({ label, href, Icon }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer" className="about-links__item">
            <Icon size={16} aria-hidden />
            <span>{label}</span>
            <ExternalLink size={12} aria-hidden />
          </a>
        ))}
      </div>

      <p className="settings-section__label">Comunidade</p>
      <div className="about-links">
        {COMMUNITY_LINKS.map(({ label, href, Icon }) => (
          <a key={href} href={href} target="_blank" rel="noreferrer" className="about-links__item">
            <Icon size={16} aria-hidden />
            <span>{label}</span>
            <ExternalLink size={12} aria-hidden />
          </a>
        ))}
      </div>
    </section>
  );
}
