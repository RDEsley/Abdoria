/** Efeitos visuais de cada magia da Loja da Exploração durante o ataque. */
export function AfkSpellEffect({ spellId }: { spellId: string }) {
  switch (spellId) {
    case 'magia_raio_laser':
      return (
        <>
          <span className="game-afk-spell-laser" aria-hidden>
            <i className="game-afk-spell-laser__beam" />
            <i className="game-afk-spell-laser__core" />
          </span>
          <span className="game-afk-spell-laser-flash" aria-hidden />
        </>
      );

    case 'magia_explosao':
      return (
        <span className="game-afk-spell-explosion" aria-hidden>
          <i className="game-afk-spell-explosion__flash" />
          <i className="game-afk-spell-explosion__core" />
          <i className="game-afk-spell-explosion__ring" />
        </span>
      );

    case 'magia_buraco_negro':
      return (
        <span className="game-afk-spell-blackhole" aria-hidden>
          <i className="game-afk-spell-blackhole__glow" />
          <i className="game-afk-spell-blackhole__debris game-afk-spell-blackhole__debris--1" />
          <i className="game-afk-spell-blackhole__debris game-afk-spell-blackhole__debris--2" />
          <i className="game-afk-spell-blackhole__debris game-afk-spell-blackhole__debris--3" />
          <i className="game-afk-spell-blackhole__debris game-afk-spell-blackhole__debris--4" />
          <i className="game-afk-spell-blackhole__ring" />
          <i className="game-afk-spell-blackhole__swirl" />
        </span>
      );

    case 'magia_relampago':
      return (
        <>
          <span className="game-afk-spell-cloud" aria-hidden>
            <i className="game-afk-spell-cloud__puff game-afk-spell-cloud__puff--a" />
            <i className="game-afk-spell-cloud__puff game-afk-spell-cloud__puff--b" />
            <i className="game-afk-spell-cloud__puff game-afk-spell-cloud__puff--c" />
          </span>
          <span className="game-afk-spell-bolt" aria-hidden />
          <span className="game-afk-spell-bolt-flash" aria-hidden />
        </>
      );

    case 'magia_fogo':
      return (
        <span className="game-afk-spell-fire" aria-hidden>
          <i className="game-afk-spell-fire__flame game-afk-spell-fire__flame--1" />
          <i className="game-afk-spell-fire__flame game-afk-spell-fire__flame--2" />
          <i className="game-afk-spell-fire__flame game-afk-spell-fire__flame--3" />
          <i className="game-afk-spell-fire__flame game-afk-spell-fire__flame--4" />
          <i className="game-afk-spell-fire__flame game-afk-spell-fire__flame--5" />
        </span>
      );

    case 'magia_gelo':
      return (
        <span className="game-afk-spell-ice" aria-hidden>
          <i className="game-afk-spell-ice__crystal" />
          <i className="game-afk-spell-ice__facet" />
          <i className="game-afk-spell-ice__glint game-afk-spell-ice__glint--a" />
          <i className="game-afk-spell-ice__glint game-afk-spell-ice__glint--b" />
        </span>
      );

    case 'magia_terra':
      return (
        <span className="game-afk-spell-mountain" aria-hidden>
          <i className="game-afk-spell-mountain__peak" />
          <i className="game-afk-spell-mountain__dust" />
        </span>
      );

    case 'magia_agua':
      return (
        <>
          <span className="game-afk-spell-dragon" aria-hidden>
            <svg viewBox="0 0 96 40" className="game-afk-spell-dragon__svg">
              <defs>
                <linearGradient id="afk-water-dragon-body" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stopColor="rgba(125, 211, 252, 0.15)" />
                  <stop offset="45%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
              <path
                d="M2 26 C14 14, 24 34, 36 22 C48 10, 56 32, 68 20 C74 14, 80 16, 84 18"
                fill="none"
                stroke="url(#afk-water-dragon-body)"
                strokeWidth="7"
                strokeLinecap="round"
                className="game-afk-spell-dragon__body"
              />
              <path
                d="M2 26 C14 14, 24 34, 36 22 C48 10, 56 32, 68 20 C74 14, 80 16, 84 18"
                fill="none"
                stroke="rgba(224, 242, 254, 0.85)"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray="3 9"
                className="game-afk-spell-dragon__foam"
              />
              <path
                d="M82 10 L94 17 L88 20 L94 24 L82 28 C86 22, 86 16, 82 10 Z"
                fill="#0ea5e9"
                stroke="#e0f2fe"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="88" cy="17.5" r="1.4" fill="#f0f9ff" />
              <path d="M83 9 L80 3 L86 7 Z" fill="#7dd3fc" />
              <path d="M89 11 L88 5 L93 10 Z" fill="#7dd3fc" />
            </svg>
            <i className="game-afk-spell-dragon__drop game-afk-spell-dragon__drop--a" />
            <i className="game-afk-spell-dragon__drop game-afk-spell-dragon__drop--b" />
            <i className="game-afk-spell-dragon__drop game-afk-spell-dragon__drop--c" />
          </span>
          <span className="game-afk-spell-splash" aria-hidden />
        </>
      );

    default:
      return null;
  }
}
