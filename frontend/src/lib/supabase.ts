import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string;
          password: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email: string;
          password: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string;
          password?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      documents: {
        Row: {
          doc_id: string;
          user_id: string;
          doc_name: string;
          upload_time: string;
          file_path?: string;
          summary_text?: string;
          summary_audio_url?: string;
          summary_graph_data?: any;
          processed: boolean;
          processing_error?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          doc_id?: string;
          user_id: string;
          doc_name: string;
          upload_time?: string;
          file_path?: string;
          summary_text?: string;
          summary_audio_url?: string;
          summary_graph_data?: any;
          processed?: boolean;
          processing_error?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          doc_id?: string;
          user_id?: string;
          doc_name?: string;
          upload_time?: string;
          file_path?: string;
          summary_text?: string;
          summary_audio_url?: string;
          summary_graph_data?: any;
          processed?: boolean;
          processing_error?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}; 