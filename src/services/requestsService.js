import { supabase } from '../../lib/supabase';

export async function submitUserRequest(title, description) {
  const { error } = await supabase.from('user_requests').insert({
    title: title.trim(),
    description: description.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }
}
