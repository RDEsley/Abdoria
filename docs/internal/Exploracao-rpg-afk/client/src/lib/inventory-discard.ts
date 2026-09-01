export function discardedItemsToastMessage(count: number | undefined | null): string | null {
  if (!count || count <= 0) return null;
  return `${count} item${count === 1 ? '' : 's'} excedente${count === 1 ? '' : 's'} ${count === 1 ? 'foi descartado' : 'foram descartados'} porque a pilha atingiu o limite.`;
}
