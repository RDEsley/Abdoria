/**
 * Metadados de cosméticos no client — derivados do catálogo compartilhado
 * (`@shared/cosmetics`), a mesma fonte que o servidor usa. Antes isto era um
 * espelho mantido à mão que ficava dessincronizado: títulos que existiam só no
 * servidor resolviam pra `undefined` e sumiam do card/perfil. Derivar daqui
 * garante que todo cosmético (inclusive os novos) apareça sempre.
 */
import { COSMETICS } from '@shared/cosmetics';
import type { CosmeticDefinition, CosmeticRarity } from '@/types';

export const COSMETIC_BY_ID: Record<string, CosmeticDefinition> = Object.fromEntries(
  COSMETICS.map((item) => [item.id, item]),
);

export const COSMETIC_DISPLAY: Record<
  string,
  { nome: string; descricao: string; icon: string; raridade: CosmeticRarity }
> = Object.fromEntries(
  COSMETICS.map((item) => [
    item.id,
    { nome: item.nome, descricao: item.descricao, icon: item.icon, raridade: item.raridade },
  ]),
);
