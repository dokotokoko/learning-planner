import { useState, useCallback, useEffect } from 'react';
import { useChatStore } from '../stores/chatStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string | undefined | null;
}

/**
 * AIチャットのメッセージ管理を統一するカスタムフック
 * chatStoreとローカルstateの同期を一元管理
 */
export const useAIChatMessages = () => {
  const { getMessages, addMessage: addToStore, clearMessages: clearStore } = useChatStore();
  const GLOBAL_CHAT_KEY = 'global'; // グローバルチャットの統一キー
  
  // メッセージを正規化してtimestampをDateオブジェクトに変換
  const normalizeMessages = (msgs: Message[]): Message[] => {
    return msgs.map(msg => ({
      ...msg,
      timestamp: msg.timestamp 
        ? (msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp))
        : new Date()
    }));
  };
  
  // メッセージをtimestampでソート（古い順）
  const sortMessages = (msgs: Message[]): Message[] => {
    return [...msgs].sort((a, b) => {
      const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : 0;
      const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : 0;
      return timeA - timeB;
    });
  };
  
  const [messages, setMessages] = useState<Message[]>(() => {
    // リロード検出: performance APIを使用
    const isPageReload = performance.navigation?.type === 1 || 
                        (performance.getEntriesByType?.('navigation')[0] as any)?.type === 'reload';
    
    // リロード時はストアから読み込まず、空配列で初期化（DBから取得するため）
    if (isPageReload) {
      return [];
    }
    
    // 通常のナビゲーション時はストアから復元
    const storeMessages = getMessages(GLOBAL_CHAT_KEY);
    return sortMessages(normalizeMessages(storeMessages));
  });
  
  // storeのメッセージとローカルを同期
  useEffect(() => {
    const storeMessages = getMessages(GLOBAL_CHAT_KEY);
    if (storeMessages.length !== messages.length) {
      const normalized = normalizeMessages(storeMessages);
      const sorted = sortMessages(normalized);
      setMessages(sorted);
    }
  }, [getMessages]);
  
  // メッセージ追加（ストアとローカル両方を更新、重複防止付き）
  const addMessage = useCallback((message: Message) => {
    const normalizedMessage = {
      ...message,
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
    };
    
    // ローカルstateを更新（重複チェックとソート）
    setMessages(prev => {
      // 重複チェック：同じIDまたは同じ内容・役割のメッセージが1秒以内に存在するか
      const isDuplicate = prev.some(msg => {
        if (msg.id === normalizedMessage.id) return true;
        
        if (msg.role === normalizedMessage.role && msg.content === normalizedMessage.content) {
          const msgTime = msg.timestamp instanceof Date ? msg.timestamp.getTime() : 0;
          const newMsgTime = normalizedMessage.timestamp instanceof Date ? normalizedMessage.timestamp.getTime() : 0;
          const timeDiff = Math.abs(msgTime - newMsgTime);
          return timeDiff < 1000; // 1秒以内
        }
        
        return false;
      });
      
      // 重複がなければ追加してソート
      if (!isDuplicate) {
        return sortMessages([...prev, normalizedMessage]);
      }
      
      // 重複の場合は変更なし
      return prev;
    });
    
    // ストアにも保存（ストア側でも重複チェックされる）
    addToStore(GLOBAL_CHAT_KEY, normalizedMessage);
  }, [addToStore]);
  
  // メッセージ一括設定
  const setAllMessages = useCallback((newMessages: Message[]) => {
    // 正規化とソートを適用
    const normalized = normalizeMessages(newMessages);
    const sorted = sortMessages(normalized);
    setMessages(sorted);
    
    // 必要に応じてストアも更新
    clearStore(GLOBAL_CHAT_KEY);
    sorted.forEach(msg => {
      addToStore(GLOBAL_CHAT_KEY, msg);
    });
  }, [clearStore, addToStore]);
  
  // メッセージクリア
  const clearMessages = useCallback(() => {
    setMessages([]);
    clearStore(GLOBAL_CHAT_KEY);
  }, [clearStore]);
  
  return {
    messages,  // 常に正規化・ソート済みのメッセージを返す
    addMessage,
    setMessages: setAllMessages,
    clearMessages,
  };
};