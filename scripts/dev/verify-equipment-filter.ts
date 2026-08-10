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

const semEquip: UserPreferencias = {
  equipamentos: {},
  exercicios_nao_recomendar: [],
} as UserPreferencias;
const comBarra: UserPreferencias = {
  equipamentos: { pull_up_bar: true },
  exercicios_nao_recomendar: [],
} as UserPreferencias;
const comBarraBloqueada: UserPreferencias = {
  equipamentos: { pull_up_bar: true },
  exercicios_nao_recomendar: ['pull-up'],
} as UserPreferencias;

const exEquipAtivo = {
  slug: 'pull-up',
  ativo: true,
  equipamento: 'pull_up_bar' as const,
};
const exEquipGated = { slug: 'ab-wheel', ativo: false, equipamento: 'ab_wheel' as const };
const exLivreAtivo = { slug: 'crunch', ativo: true, equipamento: null };
const exLivreInativo = { slug: 'legacy', ativo: false, equipamento: null };
const exBoardCompat = { slug: 'wide-push-up', ativo: true, equipamento: 'push_up_board' as const };

// Equipamento DESMARCADO nunca vaza — nem mesmo um exercício salvo como ativo:true.
assert.equal(
  isExerciseAvailableForUser(exEquipAtivo, semEquip),
  false,
  'equip desmarcado + ativo:true não pode vazar',
);
assert.equal(
  isExerciseAvailableForUser(exEquipGated, semEquip),
  false,
  'equip desmarcado (gated) some',
);

// Equipamento MARCADO inclui os exercícios normalmente.
assert.equal(isExerciseAvailableForUser(exEquipAtivo, comBarra), true, 'equip marcado aparece');
assert.equal(
  isExerciseAvailableForUser(exEquipGated, comBarra),
  false,
  'outro equip continua desmarcado',
);

// Exercícios livres seguem a flag `ativo`.
assert.equal(isExerciseAvailableForUser(exLivreAtivo, semEquip), true, 'livre ativo aparece');
assert.equal(isExerciseAvailableForUser(exLivreInativo, semEquip), false, 'livre inativo some');

// O board 9 em 1 é apenas uma opção de perfil/compra: nunca controla flexões.
assert.equal(
  isExerciseAvailableForUser(exBoardCompat, semEquip),
  true,
  'flexão compatível aparece sem board',
);
assert.equal(
  isExerciseAvailableForUser({ ...exBoardCompat, ativo: false }, semEquip),
  false,
  'registro legado inativo do board não reaparece',
);

// Bloqueio + equipamento atuam JUNTOS: marcado mas bloqueado ⇒ fora das recomendações.
assert.equal(
  isExerciseRecommendable(exEquipAtivo, comBarra),
  true,
  'marcado e não bloqueado entra',
);
assert.equal(
  isExerciseRecommendable(exEquipAtivo, comBarraBloqueada),
  false,
  'marcado mas bloqueado sai',
);
assert.equal(isExerciseRecommendable(exLivreAtivo, semEquip), true, 'livre ativo entra');
assert.equal(
  isExerciseRecommendable({ ...exLivreAtivo, slug: 'crunch' }, {
    equipamentos: {},
    exercicios_nao_recomendar: ['crunch'],
  } as UserPreferencias),
  false,
  'livre bloqueado sai',
);

console.log('Equipment + block filter verification OK');
