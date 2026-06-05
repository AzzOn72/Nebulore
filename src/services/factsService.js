import { supabase } from '../../lib/supabase';
import { mapSupabaseFact } from '../utils/mapFact';

function formatExcludeFilter(ids) {
  if (!ids.length) return null;

  const allNumeric = ids.every((id) => /^\d+$/.test(String(id)));
  if (allNumeric) {
    return `(${ids.join(',')})`;
  }

  return `(${ids.map((id) => `"${id}"`).join(',')})`;
}

export async function fetchFactsBatch({ excludeIds = [], limit = 20, offset = 0 } = {}) {
  let query = supabase
    .from('facts')
    .select('id, title, description')
    .order('id', { ascending: true });

  const filter = formatExcludeFilter(excludeIds);
  if (filter) {
    query = query.not('id', 'in', filter);
  }

  const { data, error } = await query.range(offset, offset + limit - 1);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row, index) => mapSupabaseFact(row, offset + index));
}
