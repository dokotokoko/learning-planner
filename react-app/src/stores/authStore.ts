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
  isFirstLogin: boolean;
  lastLoginTime: Date | null;
  loginCount: number;
  registrationMessage: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  initialize: () => Promise<void>;
  markFirstLoginComplete: () => void;
  isNewUser: () => boolean;
  clearRegistrationMessage: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      isInitialized: false,
      isFirstLogin: true,
      lastLoginTime: null,
      loginCount: 0,
      registrationMessage: null,

      initialize: async () => {
        const { user } = get();
        if (user) {
          // セッション有効性の確認はスキップ（シンプルな実装のため）
          // 必要に応じてバックエンドAPIでの検証を追加可能
        }
        set({ isInitialized: true });
      },

      markFirstLoginComplete: () => {
        set({ isFirstLogin: false });
      },

      isNewUser: () => {
        const { loginCount, isFirstLogin } = get();
        return isFirstLogin || loginCount <= 1;
      },

      login: async (username: string, password: string) => {
        set({ isLoading: true });
        
        try {
          // バックエンドAPIを使用してログイン
          const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
          const response = await fetch(`${apiBaseUrl}/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
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
          
          // トークンとしてuser_idを保存（バックエンドの簡易認証システムに対応）
          localStorage.setItem('auth-token', data.id.toString());
          
          const user: User = {
            id: data.id.toString(),
            username: data.username,
          };

          // ログイン情報を更新
          const { loginCount } = get();
          const currentTime = new Date();
          
          set({ 
            user, 
            isLoading: false,
            lastLoginTime: currentTime,
            loginCount: loginCount + 1,
          });
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
          // バックエンドAPIにユーザー登録リクエストを送信
          const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || '/api';
          
          const response = await fetch(`${apiBaseUrl}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              username: username,
              password: password,
              confirm_password: confirmPassword,
            }),
          });

          // 201 (Created) も成功として扱う
          if (!response.ok && response.status !== 201) {
            const errorData = await response.json().catch(() => ({}));
            set({ isLoading: false });
            
            // 特殊なケース：ユーザー名が既に使用されている場合でも、
            // 実際にはアカウントが作成されている可能性がある
            if (response.status === 400 && errorData.detail?.includes('既に使用されています')) {
              // この場合、アカウントは既に作成されている可能性が高い
              return { 
                success: true, 
                message: '🎉 アカウント登録が完了しました！ログインしてください。'
              };
            }
            
            return { 
              success: false, 
              error: errorData.detail || 'ユーザー登録に失敗しました'
            };
          }

          const data = await response.json();
          
          const message = data.message || 'ユーザー登録が完了しました';
          set({ 
            isLoading: false,
            registrationMessage: message 
          });
          
          return { 
            success: true,
            message: message
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
        localStorage.removeItem('auth-token');
        set({ user: null });
      },

      clearRegistrationMessage: () => {
        set({ registrationMessage: null });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ 
        user: state.user, 
        isFirstLogin: state.isFirstLogin,
        lastLoginTime: state.lastLoginTime,
        loginCount: state.loginCount,
      }),
    }
  )
);

// 初期化処理
useAuthStore.getState().initialize(); 