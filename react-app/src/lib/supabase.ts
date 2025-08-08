import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase環境変数が設定されていません。.envファイルを作成し、以下の変数を設定してください：\nVITE_SUPABASE_URL\nVITE_SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl || 'https://example.supabase.co', supabaseAnonKey || 'dummy-key', {
  auth: {
    persistSession: false, // 手動でセッション管理
  },
});

// データベース型定義
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          username: string;
          password: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          username: string;
          password: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          password?: string;
          created_at?: string;
        };
      };
      interests: {
        Row: {
          id: string;
          user_id: string;
          interest: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          interest: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          interest?: string;
          created_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          interest_id: string;
          goal: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          interest_id: string;
          goal: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          interest_id?: string;
          goal?: string;
          created_at?: string;
        };
      };
      learning_plans: {
        Row: {
          id: string;
          user_id: string;
          goal_id: string;
          nextStep: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_id: string;
          nextStep: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_id?: string;
          nextStep?: string;
          created_at?: string;
        };
      };
      chat_logs: {
        Row: {
          id: string;
          user_id: string;
          page: string;
          sender: string;
          message: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          page: string;
          sender: string;
          message: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          page?: string;
          sender?: string;
          message?: string;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          created_at?: string;
        };
      };
      memos: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          title: string;
          content: string;
          order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          title: string;
          content?: string;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          title?: string;
          content?: string;
          order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
} 