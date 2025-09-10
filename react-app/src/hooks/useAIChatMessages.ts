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
export const useAIChatMessages = (pageId: string) => {
  const { getMessages, addMessage: addToStore, clearMessages: clearStore } = useChatStore();
  const [messages, setMessages] = useState<Message[]>(() => getMessages(pageId));
  
  // storeのメッセージとローカルを同期
  useEffect(() => {
    const storeMessages = getMessages(pageId);
    if (storeMessages.length !== messages.length) {
      setMessages(storeMessages);
    }
  }, [pageId, getMessages]);
  
  // メッセージ追加（ストアとローカル両方を更新）
  const addMessage = useCallback((message: Message) => {
    const normalizedMessage = {
      ...message,
      timestamp: message.timestamp ? new Date(message.timestamp) : new Date(),
    };
    
    // ローカルstateを更新
    setMessages(prev => [...prev, normalizedMessage]);
    
    // ストアにも保存
    addToStore(pageId, normalizedMessage);
  }, [pageId, addToStore]);
  
  // メッセージ一括設定
  const setAllMessages = useCallback((newMessages: Message[]) => {
    setMessages(newMessages);
    // 必要に応じてストアも更新
    clearStore(pageId);
    newMessages.forEach(msg => {
      addToStore(pageId, {
        ...msg,
        timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
      });
    });
  }, [pageId, clearStore, addToStore]);
  
  // メッセージクリア
  const clearMessages = useCallback(() => {
    setMessages([]);
    clearStore(pageId);
  }, [pageId, clearStore]);
  
  return {
    messages,
    addMessage,
    setMessages: setAllMessages,
    clearMessages,
  };
};