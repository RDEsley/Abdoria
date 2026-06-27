import { mergeDadosSalvos } from '../../shared/utils/user-dados.js';
import { REP_SCHEME_BY_NIVEL, resolveUserDadosSalvos } from '../../shared/types/index.js';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

const base = resolveUserDadosSalvos({});

const merged = mergeDadosSalvos(base, {
  esquema_reps_selecionado: { iniciante: 'vol-10x3' },
});
assert(merged.esquema_reps_selecionado.iniciante === 'vol-10x3', 'deve salvar esquema selecionado');

const mergedLevels = mergeDadosSalvos(
  {
    ...base,
    esquema_reps_selecionado: { intermediario: 'vol-14x3' },
  },
  {
    esquema_reps_selecionado: { iniciante: 'vol-10x3' },
  },
);
assert(
  mergedLevels.esquema_reps_selecionado.iniciante === 'vol-10x3'
    && mergedLevels.esquema_reps_selecionado.intermediario === 'vol-14x3',
  'deve mesclar esquemas por nível sem sobrescrever outros',
);

const inicianteIds = REP_SCHEME_BY_NIVEL.iniciante.map((scheme) => scheme.id);
assert(inicianteIds.includes('vol-10x3'), 'catálogo recomendado deve usar ids estáveis');

console.log('validate-rep-scheme-persist: OK');
