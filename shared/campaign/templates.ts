/**
 * Templates narrativos do Mapa da Campanha (Lotes 1 e 2 — 10 tipos).
 * Placeholders: {heroi} {exercicio} {detalhe} {inimigo}
 *   {lugar} = nome puro · {o_lugar}/{no_lugar}/{do_lugar}/{pelo_lugar} =
 *   contrações com o artigo do lugar (variantes capitalizadas {O_lugar} etc.)
 *   {feitos} {minutos} — contagens JÁ pluralizadas ("1 minuto"/"22 minutos")
 *   {xp} — só em vila_salva · {dias}/{n_dias} — só em capitulo (marco streak).
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
  /** Só em capitulo: qual marco o template narra. */
  marco?: 'primeiro' | 'streak';
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
      'Missão cumprida: {feitos} em {minutos} libertaram {o_lugar} do cerco. +{xp} XP e a gratidão eterna dos aldeões.',
  },
  {
    id: 'vila-02',
    tipo: 'vila_salva',
    texto:
      '{O_lugar} dorme em paz esta noite. {feitos}, {minutos}, +{xp} XP — e mais um capítulo no diário de {heroi}.',
  },
  {
    id: 'vila-03',
    tipo: 'vila_salva',
    texto:
      'O conselho {do_lugar} registrou em ata: "{feitos} de coragem em {minutos}. Recomenda-se estátua." +{xp} XP.',
  },
  {
    id: 'vila-04',
    tipo: 'vila_salva',
    texto:
      'De porta em porta, a notícia correu {pelo_lugar}: acabou. {feitos} em {minutos}, +{xp} XP, nenhum aldeão ferido.',
  },
  {
    id: 'vila-05',
    tipo: 'vila_salva',
    texto:
      'Os sinos {do_lugar} tocaram em festa: {heroi} encerrou a ameaça com {feitos} em {minutos}. +{xp} XP pro épico.',
  },
  {
    id: 'vila-06',
    tipo: 'vila_salva',
    texto:
      'A taverna {do_lugar} abriu barril novo em homenagem: {feitos}, {minutos}, +{xp} XP. A primeira rodada é do herói.',
  },
  {
    id: 'vila-07',
    tipo: 'vila_salva',
    texto:
      'No mapa da guilda, {o_lugar} ganhou o selo de área segura. Custo da operação: {feitos} e {minutos} de {heroi}. Lucro: +{xp} XP.',
  },
  {
    id: 'vila-08',
    tipo: 'vila_salva',
    texto:
      'Dizem {no_lugar} que foi rápido demais pra ser verdade: {feitos} em só {minutos}. O diário confirma — e soma +{xp} XP.',
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

  // —— defesa_heroica (10) — isometrias ——
  {
    id: 'defesa-01',
    tipo: 'defesa_heroica',
    texto:
      'O portão {do_lugar} não podia cair. {heroi} segurou {exercicio} por {detalhe} — e o portão continua de pé.',
  },
  {
    id: 'defesa-02',
    tipo: 'defesa_heroica',
    texto:
      '{detalhe} de {exercicio} entre a horda e os aldeões {do_lugar}. A horda desistiu antes do herói.',
  },
  {
    id: 'defesa-03',
    tipo: 'defesa_heroica',
    texto:
      'A represa {do_lugar} rachou ao entardecer. {heroi} travou a fenda com o próprio corpo — {exercicio}, {detalhe} — até os reforços chegarem.',
  },
  {
    id: 'defesa-04',
    tipo: 'defesa_heroica',
    inimigo: 'comum',
    texto:
      '{inimigo} testou a paciência de {heroi} {no_lugar} por {detalhe} de {exercicio}. Perdeu no cansaço.',
  },
  {
    id: 'defesa-05',
    tipo: 'defesa_heroica',
    texto:
      'O estandarte {do_lugar} ia cair no vendaval. {heroi} o segurou firme — {detalhe} de {exercicio} — e a bandeira amanheceu no mastro.',
  },
  {
    id: 'defesa-06',
    tipo: 'defesa_heroica',
    texto:
      'Escudo erguido, pés fincados: {detalhe} de {exercicio} na entrada {do_lugar}. Ninguém passou.',
  },
  {
    id: 'defesa-07',
    tipo: 'defesa_heroica',
    texto:
      'Dizem que paciência é virtude. {No_lugar}, virou muralha: {heroi} sustentou {exercicio} por {detalhe} sem ceder um palmo.',
  },
  {
    id: 'defesa-08',
    tipo: 'defesa_heroica',
    inimigo: 'comum',
    texto:
      'O cerco de {inimigo} contava com a fadiga do defensor. Não contava com {detalhe} de {exercicio}. {O_lugar} agradece.',
  },
  {
    id: 'defesa-09',
    tipo: 'defesa_heroica',
    texto:
      'A ponte levadiça {do_lugar} emperrou aberta. {heroi} virou a corrente humana — {exercicio}, {detalhe} — até o mecanismo voltar.',
  },
  {
    id: 'defesa-10',
    tipo: 'defesa_heroica',
    texto:
      'Três mensageiros imploraram pra {heroi} recuar. A resposta: {detalhe} de {exercicio}, no mesmo lugar, sem tremer. O inimigo recuou primeiro.',
  },

  // —— travessia (10) — pernas/glúteos ——
  {
    id: 'travessia-01',
    tipo: 'travessia',
    texto:
      '{detalhe} de {exercicio} levaram {heroi} pelos degraus {do_lugar}. Do topo, avistou o próximo capítulo.',
  },
  {
    id: 'travessia-02',
    tipo: 'travessia',
    texto:
      'O atalho {pelo_lugar} só existe pra quem tem pernas pra ele. {heroi} tem: {detalhe} de {exercicio}.',
  },
  {
    id: 'travessia-03',
    tipo: 'travessia',
    texto:
      'A balsa {do_lugar} quebrou; a travessia, não. {heroi} contornou a pé — {detalhe} de {exercicio} — e chegou antes da balsa consertada.',
  },
  {
    id: 'travessia-04',
    tipo: 'travessia',
    texto:
      'Cada subida {do_lugar} cobra um preço. {heroi} pagou em {exercicio}: {detalhe}, sem parar pra negociar.',
  },
  {
    id: 'travessia-05',
    tipo: 'travessia',
    texto:
      'O mapa dizia "intransponível" sobre {o_lugar}. {heroi} riscou a palavra depois de {detalhe} de {exercicio}.',
  },
  {
    id: 'travessia-06',
    tipo: 'travessia',
    texto:
      'A neve fechou o passo {no_lugar}. {heroi} abriu trilha nova — {detalhe} de {exercicio} — e os mercadores seguiram atrás.',
  },
  {
    id: 'travessia-07',
    tipo: 'travessia',
    texto:
      'De vale a vale, {pelo_lugar}, sem montaria: {detalhe} de {exercicio}. O cavalo teria atrasado.',
  },
  {
    id: 'travessia-08',
    tipo: 'travessia',
    texto:
      'A mensagem tinha que chegar {no_lugar} antes do anoitecer. Chegou com sol alto — {detalhe} de {exercicio} no ritmo.',
  },
  {
    id: 'travessia-09',
    tipo: 'travessia',
    texto:
      'Dizem que {o_lugar} testa os joelhos de qualquer viajante. Os de {heroi} passaram no teste: {detalhe} de {exercicio}.',
  },
  {
    id: 'travessia-10',
    tipo: 'travessia',
    texto:
      'A trilha {do_lugar} subiu, desceu e subiu de novo. {heroi} também — {detalhe} de {exercicio} — e não reclamou (muito).',
  },

  // —— fortaleza_rompida (10) — peito/braços/ombros ——
  {
    id: 'fortaleza-01',
    tipo: 'fortaleza_rompida',
    texto:
      'As muralhas {do_lugar} não resistiram: {detalhe} de {exercicio} e o portão veio abaixo.',
  },
  {
    id: 'fortaleza-02',
    tipo: 'fortaleza_rompida',
    inimigo: 'comum',
    texto:
      'O acampamento de {inimigo} {no_lugar} tinha paliçada dupla. Tinha. {detalhe} de {exercicio}.',
  },
  {
    id: 'fortaleza-03',
    tipo: 'fortaleza_rompida',
    texto:
      'A porta do cofre {do_lugar} enferrujou fechada há uma década. {heroi} abriu no braço: {detalhe} de {exercicio}.',
  },
  {
    id: 'fortaleza-04',
    tipo: 'fortaleza_rompida',
    texto:
      'Pedra sobre pedra, a barricada {no_lugar} parecia eterna. {detalhe} de {exercicio} discordaram.',
  },
  {
    id: 'fortaleza-05',
    tipo: 'fortaleza_rompida',
    texto:
      'O aríete quebrou no segundo golpe. {heroi} terminou o serviço no portão {do_lugar} — {detalhe} de {exercicio}.',
  },
  {
    id: 'fortaleza-06',
    tipo: 'fortaleza_rompida',
    inimigo: 'comum',
    texto:
      '{inimigo} trancou o celeiro {do_lugar} e engoliu a chave. Detalhe irrelevante: {detalhe} de {exercicio}.',
  },
  {
    id: 'fortaleza-07',
    tipo: 'fortaleza_rompida',
    texto:
      'A grade da masmorra {do_lugar} entortou no aperto de {heroi}. {detalhe} de {exercicio} — e os prisioneiros saíram pela porta da frente.',
  },
  {
    id: 'fortaleza-08',
    tipo: 'fortaleza_rompida',
    texto: 'Derrubar a torre de cerco {no_lugar} exigia dez homens. Ou {detalhe} de {exercicio}.',
  },
  {
    id: 'fortaleza-09',
    tipo: 'fortaleza_rompida',
    texto:
      'O muro que dividia {o_lugar} em dois caiu hoje. Os pedreiros culpam o tempo; o diário registra {detalhe} de {exercicio}.',
  },
  {
    id: 'fortaleza-10',
    tipo: 'fortaleza_rompida',
    texto:
      'Portões do forte {do_lugar}: reforçados com ferro, orgulho da guarnição. Estado atual: lascas. Causa: {detalhe} de {exercicio}.',
  },

  // —— poder_desperto (10) — núcleo/isometria profunda ——
  {
    id: 'poder-01',
    tipo: 'poder_desperto',
    texto:
      'No silêncio de {detalhe} de {exercicio}, o núcleo de {heroi} brilhou — e os cristais {do_lugar} responderam.',
  },
  {
    id: 'poder-02',
    tipo: 'poder_desperto',
    texto:
      'Os monges {do_lugar} levam anos pra alcançar o centro imóvel. {heroi} o tocou hoje: {exercicio}, {detalhe}.',
  },
  {
    id: 'poder-03',
    tipo: 'poder_desperto',
    texto:
      'A terra tremeu {no_lugar}; {heroi}, não. {detalhe} de {exercicio} — o tremor passou por fora, nunca por dentro.',
  },
  {
    id: 'poder-04',
    tipo: 'poder_desperto',
    texto:
      'Dizem que há um fogo que não queima, guardado no centro do corpo. {No_lugar}, durante {detalhe} de {exercicio}, ele acendeu.',
  },
  {
    id: 'poder-05',
    tipo: 'poder_desperto',
    texto:
      'O vento uivou, a chama da lanterna dançou, e {heroi} não se moveu: {detalhe} de {exercicio} {no_lugar}.',
  },
  {
    id: 'poder-06',
    tipo: 'poder_desperto',
    texto:
      'O amuleto {do_lugar} só desperta perto de um núcleo firme. Hoje ele vibrou — {detalhe} de {exercicio} de proximidade.',
  },
  {
    id: 'poder-07',
    tipo: 'poder_desperto',
    texto:
      'Entre uma respiração e outra, {no_lugar}, {heroi} encontrou o equilíbrio que os livros antigos só descrevem: {exercicio}, {detalhe}.',
  },
  {
    id: 'poder-08',
    tipo: 'poder_desperto',
    texto:
      'A água {do_lugar} espelhou um herói imóvel por {detalhe} de {exercicio}. Nem as rãs ousaram pular.',
  },
  {
    id: 'poder-09',
    tipo: 'poder_desperto',
    texto:
      'Energia antiga corre sob {o_lugar}. {detalhe} de {exercicio} e ela correu por {heroi} também.',
  },
  {
    id: 'poder-10',
    tipo: 'poder_desperto',
    texto:
      'O mestre da guilda sempre diz: força sem centro é ruído. {No_lugar}, {heroi} fez silêncio — {detalhe} de {exercicio}.',
  },

  // —— capitulo — marcos (primeiro treino / streak) ——
  {
    id: 'capitulo-p1',
    tipo: 'capitulo',
    marco: 'primeiro',
    texto:
      'Capítulo 1 — todo épico começa com um passo. O de {heroi} começou {no_lugar}, e o diário registra a data.',
  },
  {
    id: 'capitulo-p2',
    tipo: 'capitulo',
    marco: 'primeiro',
    texto:
      'A primeira página do diário de {heroi} foi escrita hoje, {no_lugar}. As próximas dependem só do herói.',
  },
  {
    id: 'capitulo-p3',
    tipo: 'capitulo',
    marco: 'primeiro',
    texto:
      'Os mapas da guilda ganharam um nome novo: {heroi}. Primeiro feito registrado {no_lugar}. Que venham os capítulos.',
  },
  {
    id: 'capitulo-s1',
    tipo: 'capitulo',
    marco: 'streak',
    texto:
      'Capítulo {n_dias} — {dias} de jornada sem falhar. Os mapas da guilda ganham mais uma bandeira com o nome de {heroi}.',
  },
  {
    id: 'capitulo-s2',
    tipo: 'capitulo',
    marco: 'streak',
    texto:
      '{dias} seguidos na estrada. As tavernas {do_lugar} já contam a sequência de {heroi} como quem conta lenda.',
  },
  {
    id: 'capitulo-s3',
    tipo: 'capitulo',
    marco: 'streak',
    texto:
      'O diário marca {dias} sem pausa. A constância vale mais que qualquer espada — e {heroi} carrega as duas.',
  },
  {
    id: 'capitulo-s4',
    tipo: 'capitulo',
    marco: 'streak',
    texto:
      'De sol a sol, {dias} de campanha. {No_lugar}, os batedores usam o nome de {heroi} pra dizer "confiável".',
  },
  {
    id: 'capitulo-s5',
    tipo: 'capitulo',
    marco: 'streak',
    texto:
      'A fogueira do acampamento queima há {dias} — e quem a mantém acesa é {heroi}, sem faltar uma noite.',
  },
  {
    id: 'capitulo-s6',
    tipo: 'capitulo',
    marco: 'streak',
    texto:
      '{dias} de marcha e a armadura já parece parte do corpo. O reino repara — {no_lugar} e além.',
  },
  {
    id: 'capitulo-s7',
    tipo: 'capitulo',
    marco: 'streak',
    texto:
      'Os bardos não improvisam mais: a sequência de {dias} de {heroi} virou refrão fixo {no_lugar}.',
  },
];
