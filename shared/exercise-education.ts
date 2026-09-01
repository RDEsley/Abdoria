import type { ExerciseEducation } from './types/index.js';

export interface ExerciseEducationDefinition extends ExerciseEducation {
  nomePt: string;
}

const DEFAULT_SAFETY =
  'Interrompa o movimento se sentir dor aguda ou um desconforto fora do comum.';

function define(
  nomePt: string,
  summary: string,
  steps: string[],
  primaryMuscles: string[],
  options: Partial<Omit<ExerciseEducation, 'summary' | 'steps' | 'primaryMuscles'>> = {},
): ExerciseEducationDefinition {
  return {
    nomePt,
    summary,
    steps,
    primaryMuscles,
    safety: DEFAULT_SAFETY,
    ...options,
  };
}

function pushUp(
  nomePt: string,
  handPosition: string,
  emphasis: string,
): ExerciseEducationDefinition {
  return define(
    nomePt,
    `Flexão de braços com ${emphasis}, mantendo o abdômen ativo para estabilizar o corpo.`,
    [
      `Apoie as mãos ${handPosition} e estenda as pernas para trás.`,
      'Forme uma linha contínua entre cabeça, quadril e calcanhares.',
      'Dobre os cotovelos e desça o peito de forma controlada.',
      'Empurre o chão até estender os braços, sem perder o alinhamento.',
    ],
    ['Peitoral', 'Tríceps'],
    {
      secondaryMuscles: ['Ombros', 'Core'],
      tips: ['Se precisar reduzir a carga, apoie os joelhos sem soltar o abdômen.'],
      commonMistakes: ['Deixar o quadril cair', 'Abrir demais os cotovelos'],
      breathing: 'Inspire na descida e expire enquanto empurra o chão.',
    },
  );
}

/**
 * Curadoria educacional do catálogo utilizado nos treinos.
 * Fica fora do Player para que Biblioteca, preview e treino usem a mesma fonte.
 */
export const EXERCISE_EDUCATION: Readonly<Record<string, ExerciseEducationDefinition>> = {
  crunch: define(
    'Abdominal curto',
    'Flexão curta do tronco com foco no abdômen superior.',
    [
      'Deite de costas, dobre os joelhos e apoie os pés no chão.',
      'Apoie levemente as mãos atrás da cabeça sem puxar o pescoço.',
      'Contraia o abdômen e eleve as escápulas alguns centímetros.',
      'Desça devagar até quase apoiar os ombros novamente.',
    ],
    ['Abdômen superior'],
    {
      tips: ['Mantenha o olhar na diagonal para cima.'],
      commonMistakes: ['Puxar a cabeça com as mãos', 'Usar impulso'],
      breathing: 'Expire ao subir e inspire ao descer.',
    },
  ),
  'reverse-crunch': define(
    'Abdominal reverso',
    'Elevação controlada do quadril para trabalhar a parte inferior do abdômen.',
    [
      'Deite de costas, com braços ao lado do corpo e joelhos dobrados.',
      'Leve os joelhos em direção ao peito sem ganhar impulso.',
      'Contraia o abdômen e retire o quadril levemente do chão.',
      'Retorne devagar até o quadril apoiar, mantendo as pernas controladas.',
    ],
    ['Abdômen inferior'],
    {
      secondaryMuscles: ['Core'],
      commonMistakes: ['Balançar as pernas', 'Elevar demais a lombar'],
      breathing: 'Expire ao aproximar os joelhos e inspire no retorno.',
    },
  ),
  'bicycle-crunch': define(
    'Abdominal bicicleta',
    'Movimento alternado que combina flexão e rotação do tronco.',
    [
      'Deite de costas, eleve as pernas e mantenha os joelhos dobrados.',
      'Eleve as escápulas e aproxime um ombro do joelho oposto.',
      'Estenda a outra perna sem encostar o calcanhar no chão.',
      'Alterne os lados com ritmo controlado e tronco estável.',
    ],
    ['Oblíquos', 'Abdômen'],
    {
      secondaryMuscles: ['Flexores do quadril'],
      commonMistakes: ['Puxar o pescoço', 'Executar rápido demais'],
      breathing: 'Expire a cada aproximação e mantenha a respiração contínua.',
    },
  ),
  'heel-touches': define(
    'Toque nos calcanhares',
    'Inclinações laterais curtas para ativar os oblíquos.',
    [
      'Deite de costas, dobre os joelhos e deixe os pés próximos do quadril.',
      'Eleve levemente as escápulas e mantenha o abdômen contraído.',
      'Incline o tronco para alcançar um calcanhar com a mão do mesmo lado.',
      'Volte ao centro e alterne para o outro lado.',
    ],
    ['Oblíquos'],
    {
      secondaryMuscles: ['Abdômen superior'],
      commonMistakes: ['Girar o corpo em vez de inclinar', 'Prender a respiração'],
      breathing: 'Solte o ar em cada toque e inspire ao passar pelo centro.',
    },
  ),
  'leg-raises': define(
    'Elevação de pernas',
    'Elevação das pernas com a lombar estável e foco no abdômen inferior.',
    [
      'Deite de costas com as pernas estendidas e braços ao lado do corpo.',
      'Pressione suavemente a lombar contra o chão.',
      'Eleve as pernas juntas até onde mantiver o controle.',
      'Desça lentamente sem relaxar o abdômen ou tocar os pés no chão.',
    ],
    ['Abdômen inferior'],
    {
      secondaryMuscles: ['Flexores do quadril'],
      tips: ['Dobre um pouco os joelhos se a lombar começar a arquear.'],
      commonMistakes: ['Arquear a lombar', 'Deixar as pernas despencarem'],
      breathing: 'Expire ao elevar e inspire durante a descida controlada.',
    },
  ),
  'flutter-kicks': define(
    'Chutes alternados',
    'Chutes curtos e alternados mantendo o tronco firme.',
    [
      'Deite de costas, estenda as pernas e mantenha a lombar apoiada.',
      'Eleve os calcanhares alguns centímetros do chão.',
      'Alterne uma perna para cima enquanto a outra desce.',
      'Mantenha os chutes curtos e contínuos até completar a meta.',
    ],
    ['Abdômen inferior'],
    {
      secondaryMuscles: ['Flexores do quadril'],
      commonMistakes: ['Arquear a lombar', 'Fazer chutes muito amplos'],
      breathing: 'Respire de forma curta e regular durante toda a série.',
    },
  ),
  'scissor-kicks': define(
    'Tesoura de pernas',
    'Cruzamento alternado das pernas com o abdômen estabilizando a lombar.',
    [
      'Deite de costas e estenda as pernas alguns centímetros acima do chão.',
      'Mantenha a lombar apoiada e as pontas dos pés voltadas para a frente.',
      'Cruze uma perna sobre a outra como uma tesoura.',
      'Alterne qual perna passa por cima sem perder a altura.',
    ],
    ['Abdômen inferior'],
    {
      secondaryMuscles: ['Flexores do quadril'],
      commonMistakes: ['Erguer demais as pernas', 'Perder o apoio da lombar'],
      breathing: 'Mantenha a respiração fluida; não prenda o ar.',
    },
  ),
  'sit-up': define(
    'Abdominal completo',
    'Flexão completa do tronco feita com controle, sem impulso.',
    [
      'Deite de costas, dobre os joelhos e apoie os pés.',
      'Ative o abdômen e comece a elevar o tronco.',
      'Suba até aproximar o peito das coxas sem puxar o pescoço.',
      'Retorne vértebra por vértebra até deitar novamente.',
    ],
    ['Abdômen'],
    {
      secondaryMuscles: ['Flexores do quadril'],
      commonMistakes: ['Usar balanço dos braços', 'Arredondar o pescoço'],
      breathing: 'Expire durante a subida e inspire no retorno.',
    },
  ),
  'jackknife-sit-up': define(
    'Abdominal canivete',
    'Elevação simultânea do tronco e das pernas em direção ao centro.',
    [
      'Deite de costas com braços e pernas estendidos.',
      'Contraia o abdômen antes de iniciar o movimento.',
      'Eleve tronco e pernas ao mesmo tempo, aproximando mãos e pés.',
      'Retorne lentamente sem deixar braços ou pernas caírem.',
    ],
    ['Abdômen'],
    {
      secondaryMuscles: ['Flexores do quadril'],
      tips: ['Dobre os joelhos para reduzir a dificuldade.'],
      commonMistakes: ['Usar impulso', 'Despencar no retorno'],
      breathing: 'Expire ao fechar o corpo e inspire ao estender.',
    },
  ),
  'russian-twist': define(
    'Rotação russa',
    'Rotação alternada do tronco com o centro do corpo firme.',
    [
      'Sente, dobre os joelhos e incline o tronco levemente para trás.',
      'Mantenha a coluna alongada e una as mãos à frente do peito.',
      'Gire as costelas para um lado sem mover apenas os braços.',
      'Passe pelo centro e alterne para o outro lado.',
    ],
    ['Oblíquos'],
    {
      secondaryMuscles: ['Core'],
      tips: ['Mantenha os pés apoiados para uma versão mais acessível.'],
      commonMistakes: ['Arredondar a lombar', 'Mover somente as mãos'],
      breathing: 'Expire a cada rotação e inspire ao voltar ao centro.',
    },
  ),
  'windshield-wipers': define(
    'Limpador de para-brisa',
    'Rotação controlada das pernas para desafiar oblíquos e estabilidade.',
    [
      'Deite de costas, abra os braços e eleve as pernas.',
      'Mantenha os ombros apoiados e contraia o abdômen.',
      'Desça as pernas juntas para um lado até onde houver controle.',
      'Volte ao centro e repita para o outro lado.',
    ],
    ['Oblíquos'],
    {
      secondaryMuscles: ['Core', 'Abdômen inferior'],
      tips: ['Dobre os joelhos para reduzir a alavanca.'],
      commonMistakes: ['Tirar o ombro do chão', 'Deixar as pernas caírem'],
      breathing: 'Inspire ao descer e expire ao retornar ao centro.',
    },
  ),
  plank: define(
    'Prancha frontal',
    'Sustentação do corpo alinhado com o abdômen ativo.',
    [
      'Apoie antebraços e pontas dos pés no chão.',
      'Alinhe cotovelos sob os ombros e estenda o corpo.',
      'Contraia abdômen e glúteos para manter o quadril neutro.',
      'Sustente a posição até o fim do tempo sem prender a respiração.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Ombros', 'Glúteos'],
      commonMistakes: ['Elevar ou deixar cair o quadril', 'Encolher os ombros'],
      breathing: 'Respire de forma lenta e contínua durante a sustentação.',
    },
  ),
  'side-plank': define(
    'Prancha lateral',
    'Sustentação lateral feita separadamente em cada lado.',
    [
      'Deite de lado e apoie o antebraço com o cotovelo sob o ombro.',
      'Empilhe ou afaste levemente os pés para ganhar equilíbrio.',
      'Eleve o quadril até alinhar cabeça, tronco e pernas.',
      'Sustente o lado indicado; depois o Player pedirá a troca.',
    ],
    ['Oblíquos'],
    {
      secondaryMuscles: ['Core', 'Ombros'],
      tips: ['Apoie o joelho de baixo para reduzir a dificuldade.'],
      commonMistakes: ['Deixar o quadril cair', 'Rodar o peito para o chão'],
      breathing: 'Respire normalmente e solte o ar sem perder a postura.',
    },
  ),
  'copenhagen-plank': define(
    'Prancha Copenhagen',
    'Prancha lateral avançada com a perna de cima apoiada.',
    [
      'Deite de lado e apoie o antebraço sob o ombro.',
      'Apoie a perna de cima em uma superfície firme e estável.',
      'Eleve o quadril e aproxime a perna de baixo da perna apoiada.',
      'Sustente o lado indicado mantendo o tronco alinhado.',
    ],
    ['Oblíquos', 'Adutores'],
    {
      secondaryMuscles: ['Core', 'Ombros'],
      tips: ['Apoie mais perto do joelho para reduzir a alavanca.'],
      commonMistakes: ['Usar um apoio instável', 'Rodar o quadril'],
      breathing: 'Mantenha a respiração contínua durante a sustentação.',
    },
  ),
  'hollow-hold': define(
    'Sustentação oca',
    'Isometria em que lombar, braços e pernas formam uma posição firme e alongada.',
    [
      'Deite de costas e pressione a lombar contra o chão.',
      'Eleve ombros e pernas mantendo o abdômen contraído.',
      'Estenda os braços próximos às orelhas sem perder a lombar apoiada.',
      'Sustente; se necessário, dobre joelhos ou aproxime os braços do corpo.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Abdômen inferior'],
      commonMistakes: ['Arquear a lombar', 'Elevar demais as pernas'],
      breathing: 'Faça expirações curtas sem relaxar o abdômen.',
    },
  ),
  'v-hold': define(
    'Sustentação em V',
    'Equilíbrio sentado com tronco e pernas formando um V.',
    [
      'Sente com os joelhos dobrados e pés apoiados.',
      'Incline o tronco para trás mantendo a coluna alongada.',
      'Eleve os pés e, se possível, estenda as pernas.',
      'Sustente o equilíbrio com o abdômen ativo e peito aberto.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Flexores do quadril'],
      tips: ['Segure atrás das coxas para uma versão mais acessível.'],
      commonMistakes: ['Arredondar a lombar', 'Prender a respiração'],
      breathing: 'Respire de forma curta e contínua.',
    },
  ),
  'l-sit': define(
    'Sustentação em L',
    'Isometria avançada com o corpo apoiado nos braços e pernas à frente.',
    [
      'Sente entre dois apoios firmes e coloque uma mão em cada lado.',
      'Empurre os apoios, afaste os ombros das orelhas e eleve o quadril.',
      'Estenda as pernas à frente formando um L com o tronco.',
      'Sustente sem balançar; dobre os joelhos para reduzir a dificuldade.',
    ],
    ['Core', 'Abdômen inferior'],
    {
      secondaryMuscles: ['Tríceps', 'Flexores do quadril'],
      commonMistakes: ['Usar apoios instáveis', 'Encolher os ombros'],
      breathing: 'Expire ao elevar e mantenha respirações curtas na posição.',
    },
  ),
  'mountain-climbers': define(
    'Escalador',
    'Alternância dos joelhos em posição de prancha.',
    [
      'Comece em prancha alta com mãos sob os ombros.',
      'Mantenha cabeça, quadril e calcanhares alinhados.',
      'Leve um joelho em direção ao peito sem elevar o quadril.',
      'Troque as pernas de forma contínua no ritmo que mantém o controle.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Ombros', 'Pernas'],
      commonMistakes: ['Saltar o quadril para cima', 'Apoiar as mãos longe dos ombros'],
      breathing: 'Respire continuamente, soltando o ar a cada duas trocas.',
    },
  ),
  'plank-jacks': define(
    'Prancha com salto',
    'Abertura e fechamento das pernas mantendo a prancha alta.',
    [
      'Comece em prancha alta com os pés unidos.',
      'Ative abdômen e glúteos para estabilizar o quadril.',
      'Salte os pés para fora sem mover o tronco.',
      'Salte os pés de volta e repita com controle.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Ombros', 'Pernas'],
      tips: ['Faça uma perna por vez para reduzir o impacto.'],
      commonMistakes: ['Deixar o quadril balançar', 'Travar os cotovelos'],
      breathing: 'Mantenha uma respiração regular durante as trocas.',
    },
  ),
  'spiderman-plank': define(
    'Prancha aranha',
    'Aproximação alternada do joelho ao cotovelo em prancha.',
    [
      'Comece em prancha alta, com mãos sob os ombros.',
      'Leve um joelho por fora em direção ao cotovelo do mesmo lado.',
      'Mantenha o quadril baixo e os ombros estáveis.',
      'Retorne a perna e alterne para o outro lado.',
    ],
    ['Oblíquos', 'Core'],
    {
      secondaryMuscles: ['Ombros'],
      commonMistakes: ['Girar demais o quadril', 'Encolher os ombros'],
      breathing: 'Expire ao aproximar o joelho e inspire ao retornar.',
    },
  ),
  'hanging-knee-raise': define(
    'Elevação de joelhos na barra',
    'Elevação controlada dos joelhos enquanto o corpo fica suspenso.',
    [
      'Segure a barra com pegada firme e deixe o corpo estabilizar.',
      'Afaste os ombros das orelhas e contraia o abdômen.',
      'Eleve os joelhos em direção ao peito sem balançar.',
      'Desça devagar até estender as pernas novamente.',
    ],
    ['Abdômen inferior'],
    {
      secondaryMuscles: ['Antebraços', 'Dorsais'],
      commonMistakes: ['Usar balanço', 'Relaxar os ombros'],
      breathing: 'Expire ao elevar os joelhos e inspire na descida.',
    },
  ),
  'ab-wheel': define(
    'Rolinho abdominal',
    'Extensão do corpo com o rolinho mantendo a lombar protegida pelo core ativo.',
    [
      'Ajoelhe em uma superfície confortável e segure o rolinho sob os ombros.',
      'Contraia abdômen e glúteos antes de avançar.',
      'Role para a frente somente até onde mantiver a lombar neutra.',
      'Puxe o rolinho de volta usando o abdômen, sem sentar nos calcanhares.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Ombros', 'Dorsais'],
      commonMistakes: ['Arquear a lombar', 'Avançar além do controle'],
      breathing: 'Inspire ao avançar e expire ao retornar.',
    },
  ),
  'ab-wheel-knees': define(
    'Rolinho com joelhos no chão',
    'Versão controlada do rolinho abdominal com apoio dos joelhos.',
    [
      'Ajoelhe e posicione o rolinho abaixo dos ombros.',
      'Contraia abdômen e glúteos para alinhar quadril e tronco.',
      'Role à frente sem deixar a lombar arquear.',
      'Retorne puxando o rolinho em direção aos joelhos.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Ombros', 'Dorsais'],
      commonMistakes: ['Sentar nos calcanhares', 'Perder a postura da lombar'],
      breathing: 'Inspire ao avançar e expire ao voltar.',
    },
  ),
  'ab-wheel-standing': define(
    'Rolinho em pé',
    'Versão avançada do rolinho, iniciada em pé e feita apenas com amplitude dominada.',
    [
      'Fique em pé, incline o tronco e apoie o rolinho no chão.',
      'Trave o abdômen antes de afastar o rolinho dos pés.',
      'Avance mantendo quadril e lombar alinhados.',
      'Retorne com controle até recuperar a posição inicial.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Ombros', 'Dorsais'],
      tips: ['Use uma parede como limite de amplitude durante a progressão.'],
      commonMistakes: ['Tentar amplitude total cedo demais', 'Arquear a lombar'],
      breathing: 'Inspire ao avançar e expire com força ao retornar.',
    },
  ),
  'dragon-flag': define(
    'Bandeira do dragão',
    'Elevação avançada do corpo com apoio dos ombros e tronco rígido.',
    [
      'Deite em um banco firme e segure atrás da cabeça.',
      'Eleve quadril e pernas até apoiar o peso na parte alta das costas.',
      'Mantenha o corpo alinhado e desça como uma peça única.',
      'Pare antes de perder a postura e retorne com controle.',
    ],
    ['Core'],
    {
      secondaryMuscles: ['Dorsais', 'Glúteos'],
      tips: ['Comece com joelhos dobrados e pouca amplitude.'],
      commonMistakes: ['Apoiar peso no pescoço', 'Dobrar o quadril durante a descida'],
      breathing: 'Inspire ao descer e expire ao retornar.',
    },
  ),
  'stability-ball-crunch': define(
    'Abdominal na bola',
    'Abdominal curto sobre bola de estabilidade, com amplitude controlada.',
    [
      'Sente na bola e caminhe os pés até apoiar a lombar nela.',
      'Mantenha pés firmes, joelhos dobrados e quadril estável.',
      'Eleve as escápulas contraindo o abdômen.',
      'Retorne devagar acompanhando a curva da bola.',
    ],
    ['Abdômen superior'],
    {
      secondaryMuscles: ['Core'],
      commonMistakes: ['Usar uma bola instável ou inadequada', 'Puxar o pescoço'],
      breathing: 'Expire ao subir e inspire ao retornar.',
    },
  ),
  burpee: define(
    'Burpee',
    'Movimento de corpo inteiro que combina agachamento, prancha e extensão.',
    [
      'Fique em pé e agache para apoiar as mãos no chão.',
      'Leve os pés para trás e estabilize a posição de prancha.',
      'Traga os pés de volta para perto das mãos.',
      'Levante e estenda o corpo; salte apenas se essa for sua variação.',
    ],
    ['Corpo inteiro'],
    {
      secondaryMuscles: ['Core', 'Pernas', 'Ombros'],
      tips: ['Dê um passo de cada vez para reduzir o impacto.'],
      commonMistakes: ['Cair sobre os punhos', 'Perder o alinhamento na prancha'],
      breathing: 'Expire ao levantar e retome uma respiração regular ao descer.',
    },
  ),
  'bodyweight-squat': define(
    'Agachamento livre',
    'Agachamento com o peso do corpo e pés firmes no chão.',
    [
      'Fique em pé com os pés aproximadamente na largura dos ombros.',
      'Leve o quadril para trás enquanto dobra joelhos e tornozelos.',
      'Desça mantendo peito aberto e joelhos acompanhando os pés.',
      'Empurre o chão e retorne à posição em pé.',
    ],
    ['Quadríceps', 'Glúteos'],
    {
      secondaryMuscles: ['Core'],
      commonMistakes: ['Juntar os joelhos', 'Tirar os calcanhares do chão'],
      breathing: 'Inspire ao descer e expire ao subir.',
    },
  ),
  'squat-jump': define(
    'Agachamento com salto',
    'Agachamento explosivo com aterrissagem controlada.',
    [
      'Fique com os pés na largura dos ombros e faça um agachamento curto.',
      'Estenda quadris, joelhos e tornozelos para saltar.',
      'Aterrisse primeiro na ponta dos pés e distribua o peso.',
      'Amorteça dobrando os joelhos antes da próxima repetição.',
    ],
    ['Pernas', 'Glúteos'],
    {
      secondaryMuscles: ['Core'],
      tips: ['Retire o salto e faça agachamentos rápidos para reduzir o impacto.'],
      commonMistakes: ['Aterrissar com joelhos rígidos', 'Deixar joelhos fecharem'],
      breathing: 'Expire no salto e inspire ao amortecer.',
    },
  ),
  'glute-bridge': define(
    'Ponte de glúteos',
    'Elevação do quadril com pés apoiados e tronco estável.',
    [
      'Deite de costas, dobre os joelhos e apoie os pés.',
      'Contraia o abdômen e pressione os calcanhares no chão.',
      'Eleve o quadril até alinhar joelhos, quadril e ombros.',
      'Desça devagar sem relaxar completamente entre repetições.',
    ],
    ['Glúteos'],
    {
      secondaryMuscles: ['Posteriores de coxa', 'Core'],
      commonMistakes: ['Arquear a lombar no topo', 'Afastar demais os pés'],
      breathing: 'Expire ao elevar e inspire ao descer.',
    },
  ),
  'single-leg-glute-bridge': define(
    'Ponte unilateral',
    'Ponte de glúteos feita com uma perna de cada vez.',
    [
      'Deite de costas, dobre os joelhos e eleve uma perna.',
      'Mantenha o quadril nivelado e o abdômen ativo.',
      'Pressione o pé apoiado e eleve o quadril.',
      'Desça com controle; conclua o lado indicado antes de trocar.',
    ],
    ['Glúteos'],
    {
      secondaryMuscles: ['Posteriores de coxa', 'Core'],
      commonMistakes: ['Girar o quadril', 'Empurrar com a ponta do pé'],
      breathing: 'Expire ao elevar e inspire ao descer.',
    },
  ),
  'wall-sit': define(
    'Cadeira na parede',
    'Sustentação de agachamento com as costas apoiadas.',
    [
      'Encoste as costas em uma parede firme e afaste os pés.',
      'Deslize o tronco para baixo dobrando os joelhos.',
      'Ajuste os pés para manter joelhos alinhados aos tornozelos.',
      'Sustente pressionando as costas na parede e os pés no chão.',
    ],
    ['Quadríceps'],
    {
      secondaryMuscles: ['Glúteos', 'Core'],
      commonMistakes: ['Apoiar as mãos nas coxas', 'Deixar joelhos fecharem'],
      breathing: 'Respire normalmente durante toda a sustentação.',
    },
  ),
  superman: define(
    'Superman',
    'Elevação controlada de braços e pernas em posição deitada.',
    [
      'Deite de barriga para baixo com braços estendidos à frente.',
      'Contraia abdômen e glúteos antes de elevar.',
      'Retire braços e pernas alguns centímetros do chão.',
      'Faça uma pausa curta e retorne lentamente.',
    ],
    ['Lombar', 'Glúteos'],
    {
      secondaryMuscles: ['Parte alta das costas'],
      commonMistakes: ['Jogar a cabeça para trás', 'Elevar além do controle'],
      breathing: 'Expire ao elevar e inspire ao retornar.',
    },
  ),
  'push-up': pushUp('Flexão', 'um pouco além da largura dos ombros', 'foco em peito e tríceps'),
  'decline-push-up': pushUp(
    'Flexão declinada',
    'um pouco além da largura dos ombros e eleve os pés em apoio firme',
    'maior carga sobre peito e ombros',
  ),
  'pike-push-up': define(
    'Flexão pike',
    'Flexão com quadril elevado para aumentar o trabalho dos ombros.',
    [
      'Comece em prancha alta e caminhe os pés em direção às mãos.',
      'Eleve o quadril formando um V invertido.',
      'Dobre os cotovelos e leve a cabeça em direção ao chão.',
      'Empurre o chão e retorne sem desfazer o V.',
    ],
    ['Ombros'],
    {
      secondaryMuscles: ['Tríceps', 'Core'],
      commonMistakes: ['Transformar o movimento em flexão comum', 'Abrir demais os cotovelos'],
      breathing: 'Inspire ao descer e expire ao empurrar.',
    },
  ),
};

export function getExerciseEducationDefinition(
  slug: string,
): ExerciseEducationDefinition | undefined {
  return EXERCISE_EDUCATION[slug];
}
