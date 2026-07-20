import { Clock3, Sparkles } from 'lucide-react';
import {
  DiscordIcon,
  FacebookIcon,
  GithubIcon,
  InstagramIcon,
  YoutubeIcon,
} from '@/components/icons/BrandIcons';

const FATEEIGHT_LINKS = [
  { label: 'Instagram', handle: '@fateeighttech', href: 'https://instagram.com/fateeighttech', Icon: InstagramIcon },
  { label: 'YouTube', handle: '@FateEightTech', href: 'https://www.youtube.com/@FateEightTech', Icon: YoutubeIcon },
  {
    label: 'Facebook',
    handle: 'Fate Eight Tech',
    href: 'https://www.facebook.com/profile.php?id=61582108484785',
    Icon: FacebookIcon,
  },
  { label: 'GitHub', handle: 'fateeighttech', href: 'https://github.com/fateeighttech', Icon: GithubIcon },
] as const;

/** Créditos + redes sociais da empresa responsável pelo Abdoria + comunidade do projeto. */
export function AboutSection() {
  return (
    <section className="glass-card p-4">
      <h3 className="game-section-title mb-1 flex items-center gap-2">
        <Sparkles size={14} /> Sobre o Abdoria
      </h3>
      <p className="mb-3 text-xs font-medium text-stone-500">
        Desenvolvido pela <strong>Fateeight</strong>. Siga a empresa nas redes:
      </p>

      <div className="settings-social-links">
        {FATEEIGHT_LINKS.map(({ label, handle, href, Icon }) => (
          <a key={label} className="settings-social-link" href={href} target="_blank" rel="noopener noreferrer">
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
        <span className="settings-social-link settings-social-link--soon" aria-disabled="true">
          <span className="settings-social-link__icon" aria-hidden>
            <DiscordIcon size={15} />
          </span>
          <span className="settings-social-link__text">
            <strong>Discord do Abdoria</strong>
            <small>
              <Clock3 size={10} aria-hidden /> Em breve
            </small>
          </span>
        </span>
      </div>
    </section>
  );
}
