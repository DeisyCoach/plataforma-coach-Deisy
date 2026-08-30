import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../types/database.types'; // Importamos los tipos

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

// Le pasamos el tipo <Database> al cliente para que sea "inteligente"
export const supabase = createClient<Database>(supabaseUrl, supabaseKey);



