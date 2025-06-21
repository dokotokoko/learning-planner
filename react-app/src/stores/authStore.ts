import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
          // セッション有効性の確認はスキップ（シンプルな実装のため）
          // 必要に応じてバックエンドAPIでの検証を追加可能
        }
        set({ isInitialized: true });
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          // バックエンドAPIを使用してログイン
          const response = await fetch('http://localhost:8000/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              username: username,
              access_code: password,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            set({ isLoading: false });
            return { 
              success: false, 
              error: errorData.detail || 'ログインに失敗しました'
            };
          }

          const data = await response.json();
          
          const user: User = {
            id: data.id.toString(),
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
          // 現在、バックエンドAPIにユーザー登録エンドポイントがないため、
          // 簡易的にフロントエンドでのみバリデーション
          set({ isLoading: false });
          return { 
            success: false, 
            error: 'ユーザー登録機能は現在利用できません。管理者にお問い合わせください。' 
          };

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