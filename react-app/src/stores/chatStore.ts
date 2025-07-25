import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatState {
  // チャットUI状態
  isChatOpen: boolean;
  
  // 現在のコンテキスト
  currentProjectId: string | null;
  currentMemoId: string | null;
  currentMemoTitle: string;
  currentMemoContent: string;
  
  // チャットセッションID（プロジェクト単位）
  chatPageId: string;
  
  // メッセージ履歴（プロジェクトごと）
  messageHistory: Record<string, ChatMessage[]>;
  
  // Actions
  setChatOpen: (open: boolean) => void;
  toggleChat: () => void;
  setCurrentMemo: (projectId: string, memoId: string | null, title: string, content: string) => void;
  updateMemoContent: (title: string, content: string) => void;
  clearCurrentMemo: () => void;
  setCurrentProject: (projectId: string) => void;
  
  // メッセージ管理
  addMessage: (projectId: string, message: ChatMessage) => void;
  getMessages: (projectId: string) => ChatMessage[];
  clearMessages: (projectId: string) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      // 初期状態（デフォルトでAIチャットを開く）
      isChatOpen: true,
      currentProjectId: null,
      currentMemoId: null,
      currentMemoTitle: '',
      currentMemoContent: '',
      chatPageId: '',
      messageHistory: {},

      // チャット開閉
      setChatOpen: (open: boolean) => set({ isChatOpen: open }),
      
      toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),

      // 現在のメモ設定
      setCurrentMemo: (projectId: string, memoId: string | null, title: string, content: string) => {
        const chatPageId = `project-${projectId}`;
        set({
          currentProjectId: projectId,
          currentMemoId: memoId,
          currentMemoTitle: title,
          currentMemoContent: content,
          chatPageId,
        });
      },

      // メモ内容のみ更新
      updateMemoContent: (title: string, content: string) => {
        set({
          currentMemoTitle: title,
          currentMemoContent: content,
        });
      },

      // メモクリア
      clearCurrentMemo: () => {
        set({
          currentMemoId: null,
          currentMemoTitle: '',
          currentMemoContent: '',
        });
      },

      // プロジェクト設定（メモ一覧ページ用）
      setCurrentProject: (projectId: string) => {
        const state = get();
        const chatPageId = `project-${projectId}`;
        set({
          currentProjectId: projectId,
          chatPageId,
          // メモ情報はクリアしない（メモ一覧に戻っても保持）
        });
      },

      // メッセージ管理
      addMessage: (projectId: string, message: ChatMessage) => {
        set((state) => ({
          messageHistory: {
            ...state.messageHistory,
            [projectId]: [...(state.messageHistory[projectId] || []), message],
          },
        }));
      },

      getMessages: (projectId: string) => {
        const state = get();
        return state.messageHistory[projectId] || [];
      },

      clearMessages: (projectId: string) => {
        set((state) => ({
          messageHistory: {
            ...state.messageHistory,
            [projectId]: [],
          },
        }));
      },
    }),
    {
      name: 'chat-storage',
      // 永続化する項目（メッセージ履歴を追加）
      partialize: (state) => ({
        isChatOpen: state.isChatOpen,
        currentProjectId: state.currentProjectId,
        messageHistory: state.messageHistory,
      }),
    }
  )
); 