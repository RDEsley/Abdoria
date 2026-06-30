/**
 * Valida a regra combinada de equipamento + bloqueio nas recomendações/catálogo.
 * Regra: exercício de equipamento só aparece se o equipamento estiver marcado
 * (mesmo se `ativo: true`), e nunca aparece se o usuário bloqueou o slug.
 * Rode: npx tsx scripts/dev/verify-equipment-filter.ts
 */
import assert from 'node:assert/strict';
import {
  isExerciseAvailableForUser,
  isExerciseRecommendable,
} from '../../shared/equipment/index.ts';
import type { UserPreferencias } from '../../shared/types/index.ts';

const semEquip: UserPreferencias = { equipamentos: {}, exercicios_nao_recomendar: [] } as UserPreferencias;
const comPrancha: UserPreferencias = {
  equipamentos: { push_up_board: true },
  exercicios_nao_recomendar: [],
} as UserPreferencias;
const comPranchaBloqueado: UserPreferencias = {
  equipamentos: { push_up_board: true },
  exercicios_nao_recomendar: ['push-up-board-chest'],
} as UserPreferencias;

const exEquipAtivo = { slug: 'push-up-board-chest', ativo: true, equipamento: 'push_up_board' as const };
const exEquipGated = { slug: 'pull-up', ativo: false, equipamento: 'pull_up_bar' as const };
const exLivreAtivo = { slug: 'crunch', ativo: true, equipamento: null };
const exLivreInativo = { slug: 'legacy', ativo: false, equipamento: null };

// Equipamento DESMARCADO nunca vaza — nem mesmo um exercício salvo como ativo:true.
assert.equal(isExerciseAvailableForUser(exEquipAtivo, semEquip), false, 'equip desmarcado + ativo:true não pode vazar');
assert.equal(isExerciseAvailableForUser(exEquipGated, semEquip), false, 'equip desmarcado (gated) some');

// Equipamento MARCADO inclui os exercícios normalmente.
assert.equal(isExerciseAvailableForUser(exEquipAtivo, comPrancha), true, 'equip marcado aparece');
assert.equal(isExerciseAvailableForUser(exEquipGated, comPrancha), false, 'outro equip continua desmarcado');

// Exercícios livres seguem a flag `ativo`.
assert.equal(isExerciseAvailableForUser(exLivreAtivo, semEquip), true, 'livre ativo aparece');
assert.equal(isExerciseAvailableForUser(exLivreInativo, semEquip), false, 'livre inativo some');

// Bloqueio + equipamento atuam JUNTOS: marcado mas bloqueado ⇒ fora das recomendações.
assert.equal(isExerciseRecommendable(exEquipAtivo, comPrancha), true, 'marcado e não bloqueado entra');
assert.equal(isExerciseRecommendable(exEquipAtivo, comPranchaBloqueado), false, 'marcado mas bloqueado sai');
assert.equal(isExerciseRecommendable(exLivreAtivo, semEquip), true, 'livre ativo entra');
assert.equal(
  isExerciseRecommendable({ ...exLivreAtivo, slug: 'crunch' }, { equipamentos: {}, exercicios_nao_recomendar: ['crunch'] } as UserPreferencias),
  false,
  'livre bloqueado sai',
);

console.log('Equipment + block filter verification OK');
