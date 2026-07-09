import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StatTile } from '@/components/ui/StatTile';
import { Modal } from '@/components/ui/Modal';
import { GameButton } from '@/components/ui/GameButton';

/**
 * Vitrine dos primitivos de design system (Modal/Card/StatTile). Não é uma rota do app —
 * serve como referência viva e QA visual. Renderize manualmente num arquivo de dev local
 * (ex.: trocar temporariamente o import de `App` em `main.tsx`) para inspecionar.
 */
export function PrimitivesShowcase() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="game-app flex flex-col gap-6 p-6">
      <section className="flex flex-col gap-3">
        <h2 className="game-modal__title">Card</h2>
        <div className="flex gap-4">
          <Card className="p-4">Card padrão (.glass-card)</Card>
          <Card variant="strong" className="p-4">
            Card em destaque (.glass-panel-strong)
          </Card>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="game-modal__title">StatTile</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile
            icon={<Trophy size={16} />}
            title="Streak"
            value="12 dias"
            label="ofensiva"
            hint="recorde: 30 dias"
          />
          <StatTile title="XP hoje" value="180" label="xp diário" />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="game-modal__title">Modal</h2>
        <GameButton onClick={() => setModalOpen(true)}>Abrir modal de exemplo</GameButton>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          labelledBy="showcase-modal-title"
        >
          <h2 id="showcase-modal-title" className="game-modal__title">
            Modal de exemplo
          </h2>
          <p className="game-modal__text">Portal, Escape, scroll lock e trap de foco de graça.</p>
          <GameButton
            variant="secondary"
            className="game-modal__close mt-4"
            onClick={() => setModalOpen(false)}
          >
            Fechar
          </GameButton>
        </Modal>
      </section>
    </div>
  );
}
