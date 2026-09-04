import type { AchievementIcon } from '../types/index.js';
import type { ActivityCategory, ActivityMetricKind } from './types.js';

export interface ActivityTemplate {
  id: string;
  name: string;
  description: string;
  category: ActivityCategory;
  icon: AchievementIcon;
  color: string;
  metric_kind: ActivityMetricKind;
  metric_unit: string | null;
  goal_value: number | null;
  aliases?: string[];
  /**
   * Se false, não aparece no catálogo de criação nem nas sugestões novas.
   * Activities legadas com este template_id continuam carregando via findActivityTemplate.
   */
  offerInCreate?: boolean;
}

/** IDs ocultos do catálogo de criação (UI). Dados legados permanecem válidos. */
export const HIDDEN_CREATE_TEMPLATE_IDS = [
  'tpl_respiracao',
  'tpl_yoga',
  'tpl_cuidados',
] as const;

export const ACTIVITY_TEMPLATES: ActivityTemplate[] = [
  {
    id: 'tpl_leitura',
    name: 'Leitura',
    description: 'Ler um pouco todos os dias.',
    category: 'mente',
    icon: 'star',
    color: 'emerald',
    metric_kind: 'count',
    metric_unit: 'páginas',
    goal_value: 5,
    aliases: [
      'ler',
      'livro',
      'leitura',
      'lendo',
      'capítulo',
      'manga',
      'mangá',
      'hq',
      'quadrinho',
      'romance',
      'página',
      'paginas',
    ],
  },
  {
    id: 'tpl_estudo',
    name: 'Estudo',
    description: 'Estudar um conteúdo que você quer dominar.',
    category: 'mente',
    icon: 'target',
    color: 'indigo',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 30,
    aliases: [
      'estudar',
      'estudo',
      'revisar',
      'aula',
      'idioma',
      'japonês',
      'japones',
      'ingles',
      'inglês',
      'espanhol',
      'francês',
      'frances',
      'curso',
      'aprender',
      'faculdade',
      'prova',
      'vestibular',
    ],
  },
  {
    id: 'tpl_escrita',
    name: 'Escrita',
    description: 'Escrever, anotar ou journaling.',
    category: 'mente',
    icon: 'sparkles',
    color: 'violet',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 15,
    aliases: ['escrever', 'escrita', 'journal', 'diário', 'diario', 'anotar', 'redação', 'redacao'],
  },
  {
    id: 'tpl_meditacao',
    name: 'Meditação',
    description: 'Pausa em silêncio ou com áudio guiado.',
    category: 'mente',
    icon: 'moon',
    color: 'sky',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 10,
    aliases: ['meditar', 'meditação', 'meditacao', 'mindfulness'],
  },
  {
    id: 'tpl_respiracao',
    name: 'Respiração',
    description: 'Foco na respiração para acalmar a mente.',
    category: 'mente',
    icon: 'sparkles',
    color: 'sky',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 5,
    offerInCreate: false,
    aliases: ['respirar', 'respiração', 'respiracao', 'foco', 'pranayama', 'box breathing'],
  },
  {
    id: 'tpl_caminhada',
    name: 'Caminhada',
    description: 'Caminhar em ritmo leve.',
    category: 'corpo',
    icon: 'sun',
    color: 'amber',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 30,
    aliases: ['caminhar', 'caminhada', 'andar', 'passeio', 'passos', 'caminhada no parque'],
  },
  {
    id: 'tpl_corrida',
    name: 'Corrida',
    description: 'Correr ou trotar.',
    category: 'corpo',
    icon: 'zap',
    color: 'coral',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 20,
    aliases: [
      'corre',
      'correr',
      'corrida',
      'trote',
      'trotar',
      'running',
      'cardio',
      'parque',
      'corrida no parque',
    ],
  },
  {
    id: 'tpl_alongamento',
    name: 'Alongamento',
    description: 'Mobilidade e alongamento suave.',
    category: 'corpo',
    icon: 'heart',
    color: 'rose',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 10,
    aliases: ['alongar', 'alongamento', 'stretch'],
  },
  {
    id: 'tpl_yoga',
    name: 'Yoga',
    description: 'Prática de yoga.',
    category: 'corpo',
    icon: 'sparkles',
    color: 'violet',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 20,
    offerInCreate: false,
    aliases: ['yoga', 'ioga', 'asana'],
  },
  {
    id: 'tpl_mobilidade',
    name: 'Mobilidade',
    description: 'Articulações, amplitude e aquecimento.',
    category: 'corpo',
    icon: 'dumbbell',
    color: 'emerald',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 10,
    aliases: ['mobilidade', 'mobilizar', 'amplitude', 'aquecimento'],
  },
  {
    id: 'tpl_hidratar',
    name: 'Beber água',
    description: 'Lembrar de se hidratar ao longo do dia.',
    category: 'vida',
    icon: 'droplet',
    color: 'sky',
    metric_kind: 'count',
    metric_unit: 'copos',
    goal_value: 8,
    aliases: ['água', 'agua', 'beber', 'hidratar', 'copo', 'tomar água', 'tomar agua'],
  },
  {
    id: 'tpl_organizar',
    name: 'Organizar o dia',
    description: 'Arrumar um espaço ou planejar o dia.',
    category: 'vida',
    icon: 'calendar',
    color: 'neutral',
    metric_kind: 'none',
    metric_unit: null,
    goal_value: null,
    aliases: [
      'organizar',
      'organização',
      'organizacao',
      'planejar',
      'planejamento',
      'arrumar',
      'arrumação',
      'arrumacao',
      'quarto',
      'casa',
      'limpar',
      'limpeza',
      'desembaçar',
      'bagunça',
      'bagunca',
    ],
  },
  {
    id: 'tpl_cama',
    name: 'Arrumar a cama',
    description: 'Começar o dia com um gesto simples.',
    category: 'vida',
    icon: 'sun',
    color: 'amber',
    metric_kind: 'none',
    metric_unit: null,
    goal_value: null,
    aliases: ['cama', 'arrumar a cama', 'lençol', 'lencol'],
  },
  {
    id: 'tpl_cuidados',
    name: 'Cuidados pessoais',
    description: 'Higiene, skincare ou um ritual que te cuida.',
    category: 'vida',
    icon: 'heart',
    color: 'rose',
    metric_kind: 'none',
    metric_unit: null,
    goal_value: null,
    offerInCreate: false,
    aliases: ['banho', 'higiene', 'skincare', 'dente', 'cuidados', 'rosto'],
  },
  {
    id: 'tpl_descanso',
    name: 'Pausa real',
    description: 'Descansar de verdade, sem culpa.',
    category: 'vida',
    icon: 'moon',
    color: 'indigo',
    metric_kind: 'duration',
    metric_unit: 'min',
    goal_value: 20,
    aliases: ['pausa', 'descansar', 'descanso', 'folga', 'nap', 'sono'],
  },
];

export function isOfferedInCreateCatalog(template: ActivityTemplate): boolean {
  return template.offerInCreate !== false;
}

/** Templates oferecidos ao criar Activity (sem os ocultos da UI). */
export function activityCreateTemplates(): ActivityTemplate[] {
  return ACTIVITY_TEMPLATES.filter(isOfferedInCreateCatalog);
}

export function templatesByCategory(category: ActivityTemplate['category']): ActivityTemplate[] {
  return ACTIVITY_TEMPLATES.filter((template) => template.category === category);
}

export function templatesByCategoryForCreate(
  category: ActivityTemplate['category'],
): ActivityTemplate[] {
  return activityCreateTemplates().filter((template) => template.category === category);
}

export function findActivityTemplate(id: string): ActivityTemplate | null {
  return ACTIVITY_TEMPLATES.find((template) => template.id === id) ?? null;
}
