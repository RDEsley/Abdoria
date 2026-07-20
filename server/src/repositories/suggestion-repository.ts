import { getSupabase } from '../db.js';

export interface AppSuggestionEntry {
  id: string;
  user_id: string;
  nome: string;
  texto: string;
  criada_em: string;
}

export const Suggestions = {
  async create(userId: string, texto: string): Promise<void> {
    const sb = getSupabase();
    const { error } = await sb.from('app_suggestions').insert({ user_id: userId, texto });
    if (error) throw error;
  },

  async listAll(limit = 200): Promise<AppSuggestionEntry[]> {
    const sb = getSupabase();
    const { data, error } = await sb
      .from('app_suggestions')
      .select('id, user_id, texto, criada_em, profiles(nome)')
      .order('criada_em', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data ?? []).map((row) => {
      const perfil = (row as { profiles?: { nome?: string } | { nome?: string }[] }).profiles;
      const nome = Array.isArray(perfil) ? perfil[0]?.nome : perfil?.nome;
      return {
        id: String(row.id),
        user_id: String(row.user_id),
        nome: nome ?? 'Jogador',
        texto: String(row.texto),
        criada_em: String(row.criada_em),
      };
    });
  },
};
