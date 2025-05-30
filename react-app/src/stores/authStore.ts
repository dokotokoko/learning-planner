import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  username: string;
  email?: string;
  created_at?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        const { user } = get();
        if (user) {
          // セッションが有効か確認
          try {
            const { data, error } = await supabase
              .from('users')
              .select('id, username')
              .eq('id', user.id)
              .single();

            if (error || !data) {
              set({ user: null });
            }
          } catch (error) {
            set({ user: null });
          }
        }
        set({ isInitialized: true });
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          const { data, error } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', username)
            .eq('password', password) // 本番環境ではハッシュ化が必要
            .single();

          if (error || !data) {
            set({ isLoading: false });
            return { 
              success: false, 
              error: 'ユーザー名またはパスワードが正しくありません' 
            };
          }

          const user: User = {
            id: data.id,
            username: data.username,
          };

          set({ user, isLoading: false });
          return { success: true };

        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: `ログインエラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
          };
        }
      },

      register: async (username: string, password: string, confirmPassword: string) => {
        set({ isLoading: true });

        if (password !== confirmPassword) {
          set({ isLoading: false });
          return { success: false, error: 'パスワードが一致しません' };
        }

        if (!username.trim() || !password.trim()) {
          set({ isLoading: false });
          return { success: false, error: 'ユーザー名とパスワードを入力してください' };
        }

        try {
          const { data, error } = await supabase
            .from('users')
            .insert({ username, password }) // 本番環境ではハッシュ化が必要
            .select('id, username')
            .single();

          if (error) {
            set({ isLoading: false });
            if (error.message.includes('duplicate key')) {
              return { success: false, error: 'そのユーザー名は既に使用されています' };
            }
            return { success: false, error: `登録エラー: ${error.message}` };
          }

          set({ isLoading: false });
          return { success: true };

        } catch (error) {
          set({ isLoading: false });
          return { 
            success: false, 
            error: `登録エラー: ${error instanceof Error ? error.message : '不明なエラー'}` 
          };
        }
      },

      logout: () => {
        set({ user: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
);

// 初期化処理
useAuthStore.getState().initialize(); 