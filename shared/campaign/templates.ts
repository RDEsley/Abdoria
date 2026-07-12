/**
 * Templates narrativos do Mapa da Campanha — Lote 1 (tipos 1–5).
 * Placeholders: {heroi} {exercicio} {detalhe} {inimigo}
 *   {lugar} = nome puro · {o_lugar}/{no_lugar}/{do_lugar}/{pelo_lugar} =
 *   contrações com o artigo do lugar (variantes capitalizadas {O_lugar} etc.)
 *   {feitos} {minutos} {xp} — só em vila_salva.
 * Tipos 6–10 (defesa_heroica, travessia, fortaleza_rompida, poder_desperto,
 * capitulo) chegam no Lote 2 — até lá o motor cai no fallback.
 */

export type CampaignEventType =
  | 'horda_contida'
  | 'monstro_derrotado'
  | 'chefe_derrotado'
  | 'vila_salva'
  | 'pessoa_resgatada'
  | 'defesa_heroica'
  | 'travessia'
  | 'fortaleza_rompida'
  | 'poder_desperto'
  | 'capitulo';

export const CAMPAIGN_EVENT_LABELS: Record<CampaignEventType, string> = {
  horda_contida: 'Horda contida',
  monstro_derrotado: 'Monstro derrotado',
  chefe_derrotado: 'Chefe derrotado',
  vila_salva: 'Missão cumprida',
  pessoa_resgatada: 'Resgate',
  defesa_heroica: 'Defesa heroica',
  travessia: 'Travessia',
  fortaleza_rompida: 'Fortaleza rompida',
  poder_desperto: 'Poder desperto',
  capitulo: 'Capítulo',
};

export interface CampaignTemplate {
  id: string;
  tipo: CampaignEventType;
  /** Template usa {inimigo} — 'comum' sorteia comuns/elites, 'chefe' sorteia bosses. */
  inimigo?: 'comum' | 'chefe';
  texto: string;
}

export const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  // —— horda_contida (12) ——
  {
    id: 'horda-01',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      '{O_lugar} amanheceu sob cerco: {inimigo} aos montes. Bastou {detalhe} de {exercicio} pra {heroi} abrir caminho até o poço — os aldeões já compõem canções.',
  },
  {
    id: 'horda-02',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      '{inimigo} veio em bando {pelo_lugar}. {heroi} respondeu com {detalhe} de {exercicio} e o bando recuou pro buraco de onde saiu.',
  },
  {
    id: 'horda-03',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'O sino {do_lugar} tocou três vezes — cerco de {inimigo}. Quando parou de tocar, {heroi} já tinha terminado {detalhe} de {exercicio} e não sobrava inimigo de pé.',
  },
  {
    id: 'horda-04',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'Diziam que era impossível passar {pelo_lugar} hoje. {heroi} fez {detalhe} de {exercicio} e passou por cima — literalmente — de uma fileira de {inimigo}.',
  },
  {
    id: 'horda-05',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'A caravana de mercadores travou {no_lugar}: {inimigo} por todos os lados. {detalhe} de {exercicio} depois, o caminho estava limpo e o pedágio, dispensado.',
  },
  {
    id: 'horda-06',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'Ninguém contava com uma emboscada em pleno coração {do_lugar}. {heroi} contava — e recebeu a horda de {inimigo} com {detalhe} de {exercicio}.',
  },
  {
    id: 'horda-07',
    tipo: 'horda_contida',
    texto:
      'Vultos cercaram {heroi} {no_lugar}. Nenhum sobrou pra contar o que aconteceu durante {detalhe} de {exercicio}.',
  },
  {
    id: 'horda-08',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'A guilda ofereceu 50 Dorias por cabeça de {inimigo} {no_lugar}. Depois de {detalhe} de {exercicio}, o tesoureiro pediu parcelamento.',
  },
  {
    id: 'horda-09',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'O fazendeiro jurou que eram "uns vinte" {inimigo} no celeiro {do_lugar}. Eram mais. {heroi} resolveu com {detalhe} de {exercicio} mesmo assim.',
  },
  {
    id: 'horda-10',
    tipo: 'horda_contida',
    texto:
      'Feras sem nome desceram das brumas sobre {o_lugar}. {detalhe} de {exercicio} e as brumas as engoliram de volta.',
  },
  {
    id: 'horda-11',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'Enquanto todos corriam pra FORA {do_lugar}, {heroi} corria pra dentro. {inimigo} e companhia não duraram {detalhe} de {exercicio}.',
  },
  {
    id: 'horda-12',
    tipo: 'horda_contida',
    inimigo: 'comum',
    texto:
      'A muralha aguentaria a noite; os nervos dos guardas, não. {heroi} saiu do portão {do_lugar}, fez {detalhe} de {exercicio}, e a horda de {inimigo} virou estatística.',
  },

  // —— monstro_derrotado (12) ——
  {
    id: 'monstro-01',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      '{inimigo} emboscou a caravana {no_lugar}. {heroi} respondeu com {detalhe} de {exercicio} e a estrada voltou a ser só poeira e vento.',
  },
  {
    id: 'monstro-02',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      'Havia semanas que {inimigo} assombrava {o_lugar}. Hoje encontrou {heroi} — e {detalhe} de {exercicio} encerraram a assombração.',
  },
  {
    id: 'monstro-03',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      'O estalajadeiro {do_lugar} pagou adiantado: {inimigo} rondava o estábulo. Serviço feito em {detalhe} de {exercicio}, gorjeta em Dorias.',
  },
  {
    id: 'monstro-04',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      '{inimigo} escolheu o dia errado pra bloquear a passagem {do_lugar}. {detalhe} de {exercicio} depois, virou aviso pros próximos.',
  },
  {
    id: 'monstro-05',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      'As crianças {do_lugar} juravam ter visto {inimigo} no poço. {heroi} desceu, fez {detalhe} de {exercicio} no escuro, e subiu com a lenda desfeita.',
  },
  {
    id: 'monstro-06',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      'Cartaz pregado {no_lugar}: "PROCURA-SE: {inimigo}. Recompensa: honra e Dorias." {heroi} arrancou o cartaz com {detalhe} de {exercicio} de vantagem.',
  },
  {
    id: 'monstro-07',
    tipo: 'monstro_derrotado',
    texto:
      'Uma criatura das brumas seguia {heroi} desde {o_lugar}. Parou de seguir depois de {detalhe} de {exercicio}.',
  },
  {
    id: 'monstro-08',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      'O duelo {no_lugar} durou exatamente {detalhe} de {exercicio}. {inimigo} lutou bem — pros padrões de quem perdeu.',
  },
  {
    id: 'monstro-09',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      '{inimigo} guardava a entrada {do_lugar} como se fosse dele. {heroi} discordou, com {detalhe} de {exercicio} de argumento.',
  },
  {
    id: 'monstro-10',
    tipo: 'monstro_derrotado',
    texto:
      'Um vulto rondava as fogueiras {do_lugar} há três noites. Na quarta, encontrou {heroi} acordado — {detalhe} de {exercicio} acordado.',
  },
  {
    id: 'monstro-11',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      'O ferreiro apostou uma lâmina nova que ninguém derrotava {inimigo} antes do anoitecer. {heroi} cobrou a aposta {no_lugar} com {detalhe} de {exercicio}.',
  },
  {
    id: 'monstro-12',
    tipo: 'monstro_derrotado',
    inimigo: 'comum',
    texto:
      'No registro da guilda, mais uma linha: "{inimigo} — neutralizado {no_lugar}, técnica: {exercicio}, {detalhe}. Sem baixas. De novo."',
  },

  // —— chefe_derrotado (10) ——
  {
    id: 'chefe-01',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      '{inimigo} despertou sob {o_lugar}. {heroi} sustentou {exercicio} — {detalhe} — até o gigante ruir de joelhos.',
  },
  {
    id: 'chefe-02',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      'Os bardos vão precisar de estrofes novas: {heroi} enfrentou {inimigo} {no_lugar} com {detalhe} de {exercicio} e saiu andando.',
  },
  {
    id: 'chefe-03',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      'O chão {do_lugar} ainda treme. {inimigo} caiu — e cada uma das {detalhe} de {exercicio} está gravada nas pedras.',
  },
  {
    id: 'chefe-04',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      'Sete guildas recusaram o contrato contra {inimigo}. {heroi} aceitou de graça e resolveu {no_lugar}, com {detalhe} de {exercicio}.',
  },
  {
    id: 'chefe-05',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      'Diziam que {inimigo} era invencível. {heroi} não ficou sabendo — estava ocupado fazendo {detalhe} de {exercicio} {no_lugar}.',
  },
  {
    id: 'chefe-06',
    tipo: 'chefe_derrotado',
    texto:
      'Um chefe ainda sem nome nas lendas encurralou {heroi} {no_lugar}. Depois de {detalhe} de {exercicio}, segue sem nome — e sem coroa.',
  },
  {
    id: 'chefe-07',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      'A profecia falava de um herói que dobraria {inimigo}. Não falava que seria com {exercicio}, {detalhe}, {no_lugar} — profetas não sabem tudo.',
  },
  {
    id: 'chefe-08',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      '{inimigo} tinha um exército, uma fortaleza e um plano. {heroi} tinha {detalhe} de {exercicio}. {O_lugar} lembra quem venceu.',
  },
  {
    id: 'chefe-09',
    tipo: 'chefe_derrotado',
    texto:
      'O desafio veio selado em cera negra: duelo ao amanhecer {no_lugar}. {heroi} respondeu com {detalhe} de {exercicio} — não houve segunda carta.',
  },
  {
    id: 'chefe-10',
    tipo: 'chefe_derrotado',
    inimigo: 'chefe',
    texto:
      'Quando a poeira baixou {no_lugar}, só um continuava de pé. {inimigo} aprendeu o que {detalhe} de {exercicio} constroem: um herói que não cai.',
  },

  // —— vila_salva (8) — post agregado da sessão ——
  {
    id: 'vila-01',
    tipo: 'vila_salva',
    texto:
      'Missão cumprida: {feitos} feitos em {minutos} minutos libertaram {o_lugar} do cerco. +{xp} XP e a gratidão eterna dos aldeões.',
  },
  {
    id: 'vila-02',
    tipo: 'vila_salva',
    texto:
      '{O_lugar} dorme em paz esta noite. {feitos} feitos, {minutos} minutos, +{xp} XP — e mais um capítulo no diário de {heroi}.',
  },
  {
    id: 'vila-03',
    tipo: 'vila_salva',
    texto:
      'O conselho {do_lugar} registrou em ata: "{feitos} atos de coragem em {minutos} minutos. Recomenda-se estátua." +{xp} XP.',
  },
  {
    id: 'vila-04',
    tipo: 'vila_salva',
    texto:
      'De porta em porta, a notícia correu {pelo_lugar}: acabou. {feitos} feitos em {minutos} minutos, +{xp} XP, nenhum aldeão ferido.',
  },
  {
    id: 'vila-05',
    tipo: 'vila_salva',
    texto:
      'Os sinos {do_lugar} tocaram em festa: {heroi} encerrou a ameaça com {feitos} feitos em {minutos} minutos. +{xp} XP pro épico.',
  },
  {
    id: 'vila-06',
    tipo: 'vila_salva',
    texto:
      'A taverna {do_lugar} abriu barril novo em homenagem: {feitos} feitos, {minutos} minutos, +{xp} XP. A primeira rodada é do herói.',
  },
  {
    id: 'vila-07',
    tipo: 'vila_salva',
    texto:
      'No mapa da guilda, {o_lugar} ganhou o selo de área segura. Custo da operação: {feitos} feitos e {minutos} minutos de {heroi}. Lucro: +{xp} XP.',
  },
  {
    id: 'vila-08',
    tipo: 'vila_salva',
    texto:
      'Dizem {no_lugar} que foi rápido demais pra ser verdade: {feitos} feitos em só {minutos} minutos. O diário confirma — e soma +{xp} XP.',
  },

  // —— pessoa_resgatada (8) ——
  {
    id: 'resgate-01',
    tipo: 'pessoa_resgatada',
    texto:
      'O ferreiro despencou numa fenda perto {do_lugar}. Com o equilíbrio de {detalhe} de {exercicio}, {heroi} o içou de volta à luz.',
  },
  {
    id: 'resgate-02',
    tipo: 'pessoa_resgatada',
    texto:
      'Uma criança sumiu nas galerias sob {o_lugar}. {heroi} rastejou, escalou e puxou — {detalhe} de {exercicio} — até ouvirem os dois rindo lá fora.',
  },
  {
    id: 'resgate-03',
    tipo: 'pessoa_resgatada',
    texto:
      'O mensageiro real ficou pendurado na beirada {do_lugar}, agarrado ao correio do reino. {detalhe} de {exercicio} e {heroi} salvou os dois — o homem e as cartas.',
  },
  {
    id: 'resgate-04',
    tipo: 'pessoa_resgatada',
    texto:
      'A ponte cedeu {no_lugar} com a curandeira no meio. {heroi} firmou as costas, fez de si mesmo a ponte — {detalhe} de {exercicio} — e ela cruzou.',
  },
  {
    id: 'resgate-05',
    tipo: 'pessoa_resgatada',
    texto:
      'Dois mineradores presos {no_lugar} desde a aurora. {detalhe} de {exercicio} moveram o que três mulas não moveram.',
  },
  {
    id: 'resgate-06',
    tipo: 'pessoa_resgatada',
    texto:
      'O velho cartógrafo se recusou a soltar os mapas quando a enchente tomou {o_lugar}. {heroi} carregou os dois pra fora — {detalhe} de {exercicio}, nenhum mapa molhado.',
  },
  {
    id: 'resgate-07',
    tipo: 'pessoa_resgatada',
    texto:
      'Do fundo {do_lugar} vinha um chamado fraco. {heroi} desceu pela corda, {detalhe} de {exercicio} nos braços, e voltou com o pastor perdido no ombro.',
  },
  {
    id: 'resgate-08',
    tipo: 'pessoa_resgatada',
    texto:
      'A guarda desistiu do resgate {no_lugar} ao meio-dia. {heroi} não — {detalhe} de {exercicio} depois, a família inteira jantou em casa.',
  },
];
