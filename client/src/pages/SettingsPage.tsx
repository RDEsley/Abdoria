import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, LogOut, Volume2 } from 'lucide-react';
import { TermsModal } from '@/components/legal/TermsModal';
import { GiftCodeSection } from '@/components/settings/GiftCodeSection';
import { TutorialOverlay } from '@/components/tutorial/TutorialOverlay';
import { GamePageHeader } from '@/components/ui/GamePageHeader';
import { GameButton } from '@/components/ui/GameButton';
import { useAuth } from '@/context/AuthContext';
import { updateMe } from '@/lib/api';
import { setSoundSettings } from '@/lib/sounds';
import { markTutorialSeen } from '@/lib/tutorial';
import type { TreinoBase } from '@/types';

const CICLOS: TreinoBase[] = ['A', 'B', 'C', 'D', 'E'];

export function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [som, setSom] = useState(user?.preferencias?.som_habilitado ?? true);
  const [volume, setVolume] = useState(user?.preferencias?.sfx_volume ?? 0.7);
  const [descanso, setDescanso] = useState(user?.preferencias?.descanso_padrao_seg ?? 30);
  const [ciclo, setCiclo] = useState<TreinoBase[]>(user?.preferencias?.ciclo_treinos ?? ['A', 'B', 'C']);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateMe({
        preferencias: {
          ...user!.preferencias,
          som_habilitado: som,
          sfx_volume: volume,
          descanso_padrao_seg: descanso,
          ciclo_treinos: ciclo,
        },
      });
      setSoundSettings(som, volume);
      await refreshUser();
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const requestNotifications = () => {
    if ('Notification' in window) {
      void Notification.requestPermission();
    }
  };

  const toggleCiclo = (c: TreinoBase) => {
    setCiclo((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  };

  const handleTutorialClose = () => {
    setShowTutorial(false);
    if (user) {
      void markTutorialSeen(user).then(() => refreshUser());
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <GamePageHeader eyebrow="Sistema" title="Opções" />

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-4 flex items-center gap-2">
          <Volume2 size={14} /> Áudio
        </h3>
        <label className="flex cursor-pointer items-center gap-3 font-semibold">
          <input type="checkbox" checked={som} onChange={(e) => setSom(e.target.checked)} className="cursor-pointer" />
          Sons habilitados
        </label>
        <label className="mt-4 block text-sm font-bold">
          Volume: {Math.round(volume * 100)}%
          <input type="range" min={0} max={1} step={0.1} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="mt-2 w-full cursor-pointer" />
        </label>
      </section>

      <section className="glass-card p-4">
        <h3 className="game-section-title mb-4">Treino</h3>
        <label className="block text-sm font-bold">
          Descanso padrão: {descanso}s
          <input type="range" min={10} max={90} value={descanso} onChange={(e) => setDescanso(Number(e.target.value))} className="mt-2 w-full cursor-pointer" />
        </label>
        <p className="mt-4 text-sm font-bold">Ciclo de treinos</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CICLOS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCiclo(c)}
              className={`cursor-pointer rounded-lg border-2 px-3 py-1 font-bold ${ciclo.includes(c) ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200'}`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <GiftCodeSection />

      <section className="glass-card rounded-2xl p-4">
        <h3 className="mb-4 flex items-center gap-2 font-bold">
          <Bell size={18} /> Permissões
        </h3>
        <GameButton variant="secondary" onClick={requestNotifications}>
          Solicitar notificações
        </GameButton>
      </section>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setShowTutorial(true)} className="cursor-pointer text-left font-bold text-emerald-600 hover:underline">
          Ver tutorial
        </button>
        <button type="button" onClick={() => setShowTerms(true)} className="cursor-pointer text-left font-bold text-stone-600 hover:underline">
          Termos e condições
        </button>
      </div>

      <GameButton onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar configurações'}</GameButton>

      <GameButton variant="secondary" onClick={handleLogout} className="flex items-center justify-center gap-2 text-red-600">
        <LogOut size={18} /> Sair da conta
      </GameButton>

      <TermsModal open={showTerms} onClose={() => setShowTerms(false)} />
      <TutorialOverlay open={showTutorial} onClose={handleTutorialClose} />
    </div>
  );
}
