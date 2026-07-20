import {
  Castle,
  Crown,
  Flag,
  HeartHandshake,
  Leaf,
  Mountain,
  ScrollText,
  Shield,
  Skull,
  Sparkles,
  Swords,
} from 'lucide-react';
import type { CampaignEventType } from '@shared/campaign';

/** Ícone + cores por tipo de evento — fonte única pro feed e pra tela de história. */
export const CAMPAIGN_EVENT_STYLE: Record<
  CampaignEventType,
  { Icon: typeof Swords; className: string }
> = {
  horda_contida: { Icon: Swords, className: 'bg-amber-100 text-amber-700' },
  monstro_derrotado: { Icon: Skull, className: 'bg-rose-100 text-rose-700' },
  chefe_derrotado: { Icon: Crown, className: 'bg-purple-100 text-purple-700' },
  vila_salva: { Icon: Flag, className: 'bg-emerald-100 text-emerald-700' },
  pessoa_resgatada: { Icon: HeartHandshake, className: 'bg-sky-100 text-sky-700' },
  defesa_heroica: { Icon: Shield, className: 'bg-slate-200 text-slate-700' },
  travessia: { Icon: Mountain, className: 'bg-orange-100 text-orange-800' },
  fortaleza_rompida: { Icon: Castle, className: 'bg-orange-100 text-orange-700' },
  poder_desperto: { Icon: Sparkles, className: 'bg-cyan-100 text-cyan-700' },
  missao_pessoal: { Icon: Leaf, className: 'bg-teal-100 text-teal-700' },
  capitulo: { Icon: ScrollText, className: 'bg-yellow-100 text-yellow-800' },
};
