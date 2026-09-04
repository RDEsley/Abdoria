import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  YoutubeIcon,
} from '@/components/icons/BrandIcons';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { useAppUpdate } from '@/context/AppUpdateContext';
import { shortBuildId } from '@shared/app-release';
import { updateCheckButtonLabel } from '@shared/settings/copy';
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
    <div className="settings-about">
      <div className="settings-about__hero">
        <div>
          <strong className="settings-about__name">Evolyn</strong>
          <p className="settings-about__meta">
            Versão {running.version}
            <span aria-hidden>·</span>
            Build {shortBuildId(running.build)}
          </p>
        </div>
        <button
          type="button"
          className="settings-about__check"
          disabled={checking}
          onClick={() => void onCheck()}
        >
          <RefreshCw size={14} aria-hidden className={checking ? 'animate-spin' : undefined} />
          {updateCheckButtonLabel(checking)}
        </button>
      </div>

      <SettingsRow
        icon={<DiscordIcon size={16} />}
        title="Discord"
        chevron
        href="https://discord.gg/jPFMb3tp3W"
      />
      <SettingsRow
        icon={<GithubIcon size={16} />}
        title="Repositório GitHub"
        chevron
        href="https://github.com/RDEsley/Evolyn-Core-Quest"
      />

      <p className="settings-about__credit">Desenvolvido pela Fate Eight</p>
      <div className="settings-about__socials" role="list">
        {FATEEIGHT_LINKS.map(({ label, href, Icon }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="settings-about__social"
            aria-label={label}
            role="listitem"
          >
            <Icon size={16} aria-hidden />
          </a>
        ))}
      </div>
    </div>
  );
}
