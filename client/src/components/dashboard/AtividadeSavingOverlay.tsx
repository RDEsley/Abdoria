import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { ComponentType } from 'react';

const MENSAGENS = ['Registrando...', 'Somando XP...', 'Quase lá...'];

/** Posição fixa em círculo ao redor do ícone — mesmo cálculo do burst de
    partículas do Bloco de Notas (cos/sin em vez de transform-origin, que
    exigiria calcular o pivô certo a partir do próprio tamanho do elemento;
    aqui é só posicionar direto). */
const PARTICULAS = Array.from({ length: 6 }, (_, i) => {
  const angulo = (i / 6) * Math.PI * 2;
  return {
    id: i,
    x: Math.cos(angulo) * 30,
    y: Math.sin(angulo) * 30,
    delay: i * 0.12,
  };
});

/**
 * Cobre o form enquanto `completeAtividade` está em voo. A conclusão em si
 * não dá pra deixar mais rápida (depende do servidor confirmar XP/streak),
 * então em vez de um "Salvando..." parado, mantém o olho ocupado: ícone
 * pulsando com partículas orbitando, o nome da atividade em onda letra a
 * letra e mensagens que trocam sozinhas — sensação de progresso, não de
 * trava.
 */
export function AtividadeSavingOverlay({
  nome,
  Icon,
}: {
  nome: string;
  Icon: ComponentType<{ size?: number }>;
}) {
  const [msgIndex, setMsgIndex] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setMsgIndex((i) => (i + 1) % MENSAGENS.length);
    }, 1100);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <motion.div
      className="atividade-saving-overlay"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="atividade-saving-overlay__stage">
        {!reduceMotion &&
          PARTICULAS.map((p) => (
            <motion.span
              key={p.id}
              className="atividade-saving-overlay__particula"
              style={{ x: p.x, y: p.y }}
              animate={{ opacity: [0.15, 1, 0.15], scale: [0.6, 1, 0.6] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: p.delay, ease: 'easeInOut' }}
              aria-hidden
            />
          ))}

        <motion.span
          className="atividade-saving-overlay__icon"
          animate={reduceMotion ? undefined : { scale: [1, 1.12, 1], rotate: [0, -6, 6, 0] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut' }}
          aria-hidden
        >
          <Icon size={28} />
        </motion.span>
      </div>

      <p className="atividade-saving-overlay__nome" aria-hidden>
        {nome.split('').map((letra, i) => (
          <motion.span
            key={i}
            className="atividade-saving-overlay__letra"
            animate={reduceMotion ? undefined : { y: [0, -5, 0] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.045,
            }}
          >
            {letra === ' ' ? ' ' : letra}
          </motion.span>
        ))}
      </p>

      <p className="atividade-saving-overlay__msg">
        <motion.span
          key={msgIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
        >
          {MENSAGENS[msgIndex]}
        </motion.span>
      </p>

      <span className="sr-only">Salvando atividade, por favor aguarde.</span>

      <div className="atividade-saving-overlay__bar" aria-hidden>
        <motion.span
          className="atividade-saving-overlay__bar-fill"
          animate={reduceMotion ? { x: '0%' } : { x: ['-100%', '220%'] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>
    </motion.div>
  );
}
