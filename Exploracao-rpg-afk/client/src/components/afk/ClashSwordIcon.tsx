interface Props {
  className?: string;
  strokeWidth?: number;
}

/**
 * Espada estilo "emblema de clã" (referência: ícone de guerra do Clash of
 * Clans) — lâmina prateada larga e reta com brilho central, guarda e punho
 * dourados. Desenhada compacta e centralizada no viewBox (margem generosa
 * nas pontas) de propósito: o par gira ~50° pra formar um X e pivota no
 * centro — uma lâmina "esticada" de ponta a ponta vazaria do botão redondo
 * ao girar tanto.
 */
export function ClashSwordIcon({ className, strokeWidth = 1.1 }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Lâmina */}
      <polygon
        points="12,3 13.35,6 13.35,14.5 10.65,14.5 10.65,6"
        fill="#f5f5f4"
        stroke="#1c1917"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      {/* Brilho central da lâmina */}
      <polygon points="12,4.4 12.5,6.3 12.5,13.6 12,14 11.5,13.6 11.5,6.3" fill="#ffffff" opacity="0.9" />
      {/* Guarda */}
      <rect
        x="7.8"
        y="14.5"
        width="8.4"
        height="1.7"
        rx="0.45"
        fill="#fbbf24"
        stroke="#1c1917"
        strokeWidth={strokeWidth}
      />
      {/* Punho */}
      <rect
        x="10.75"
        y="16.2"
        width="2.5"
        height="3.6"
        rx="0.5"
        fill="#b45309"
        stroke="#1c1917"
        strokeWidth={strokeWidth}
      />
      {/* Pomo */}
      <circle cx="12" cy="20.5" r="1.2" fill="#fbbf24" stroke="#1c1917" strokeWidth={strokeWidth} />
    </svg>
  );
}
