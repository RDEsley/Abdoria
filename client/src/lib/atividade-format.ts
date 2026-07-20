/** Rótulos curtos das métricas registradas na conclusão da atividade. */
const METRICA_UNIDADES: Record<string, string> = {
  tempo_min: 'min',
  paginas: 'páginas',
  km: 'km',
  metros: 'm',
  quantidade: '',
};

/** "30 páginas · 25 min" a partir das métricas salvas no histórico. */
export function formatMetricas(metricas: Record<string, number | string> | undefined): string {
  if (!metricas) return '';
  return Object.entries(metricas)
    .map(([chave, valor]) => {
      if (typeof valor === 'string') return valor;
      const unidade = METRICA_UNIDADES[chave];
      return unidade ? `${valor} ${unidade}` : String(valor);
    })
    .filter(Boolean)
    .join(' · ');
}
