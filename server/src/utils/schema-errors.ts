export function isMissingRelation(
  error: { code?: string; message?: string } | null | undefined,
  relation: string,
): boolean {
  if (!error) return false;
  if (error.code === '42P01' || error.code === 'PGRST205') return true;
  const message = error.message ?? '';
  return new RegExp(relation, 'i').test(message) && /does not exist|schema cache/i.test(message);
}

export function throwIfMissingRelation(
  error: { code?: string; message?: string } | null | undefined,
  relation: string,
): void {
  if (!error) return;
  if (isMissingRelation(error, relation)) {
    throw new Error(
      `Tabela ${relation} ausente. Aplique as migrations do Evolyn antes de usar este recurso.`,
    );
  }
  throw error;
}
