/**
 * Verifica que resgatar a recompensa grátis persiste após syncDailyShop no mesmo dia.
 * Executar: npx tsx scripts/dev/verify-daily-shop-claim.ts
 */
import { getTodaySaoPaulo } from '../../server/src/utils/timezone.js';
import { isStaleDailyOffer } from '../../server/src/data/daily-shop-config.js';
import { syncDailyShop } from '../../server/src/services/shop.js';
import type { UserDocument } from '../../server/src/types/user-document.js';

const today = getTodaySaoPaulo();

const cosmeticOffer = {
  slot: 1,
  kind: 'oferta' as const,
  recompensa_tipo: 'abdoria' as const,
  valor: 0,
  raridade: 'raro' as const,
  preco_abdoria: 743,
  preco_xp: 0,
  cosmetic_id: 'fundo_galaxia',
  oferta_nome: 'Fundo Galáxia',
  resgatado: false,
  label: 'Cosmético',
};

if (isStaleDailyOffer(cosmeticOffer)) {
  console.error('FAIL: oferta cosmética não deve ser considerada stale');
  process.exit(1);
}

const user = {
  loja_diaria: {
    data_reset: today,
    slots: [
      {
        slot: 0,
        kind: 'recompensa_diaria',
        recompensa_tipo: 'xp',
        valor: 5,
        raridade: 'comum',
        preco_abdoria: 0,
        resgatado: true,
        label: 'Grátis',
      },
      cosmeticOffer,
      {
        slot: 2,
        kind: 'oferta',
        recompensa_tipo: 'item',
        item_id: 'route_drink',
        valor: 1,
        raridade: 'raro',
        preco_abdoria: 40,
        preco_xp: 0,
        resgatado: false,
        label: 'Route Drink',
      },
    ],
  },
} as unknown as UserDocument;

syncDailyShop(user);
const free = user.loja_diaria.slots[0];

if (!free?.resgatado) {
  console.error('FAIL: syncDailyShop resetou resgatado da recompensa grátis no mesmo dia');
  process.exit(1);
}

if (user.loja_diaria.slots.length !== 3) {
  console.error('FAIL: loja perdeu slots após sync');
  process.exit(1);
}

console.log('OK: recompensa grátis permanece resgatada após sync no mesmo dia');
