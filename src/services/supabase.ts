import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please set up Supabase connection.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface QAPair {
  id: string;
  question: string;
  code?: string;
  answer: string;
  language: string;
  user_name: string;
  created_at: string;
  expires_at: string;
}

export async function fetchQAPairs(): Promise<QAPair[]> {
  const { data, error } = await supabase
    .from('qa_pairs')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching Q&A pairs:', error);
    throw new Error('Failed to fetch Q&A pairs');
  }

  return data || [];
}

export async function insertQAPair(qaPair: Omit<QAPair, 'id' | 'created_at' | 'expires_at'>): Promise<QAPair> {
  const { data, error } = await supabase
    .from('qa_pairs')
    .insert([qaPair])
    .select()
    .single();

  if (error) {
    console.error('Error inserting Q&A pair:', error);
    throw new Error('Failed to save Q&A pair');
  }

  return data;
}

export async function subscribeToQAPairs(callback: (qaPairs: QAPair[]) => void) {
  // Initial fetch
  const initialData = await fetchQAPairs();
  callback(initialData);

  // Subscribe to real-time changes
  const subscription = supabase
    .channel('qa_pairs_changes')
    .on('postgres_changes', 
      { 
        event: '*', 
        schema: 'public', 
        table: 'qa_pairs' 
      }, 
      async () => {
        // Refetch data when changes occur
        const updatedData = await fetchQAPairs();
        callback(updatedData);
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}