import React, { useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import AIChat from '../components/MemoChat/AIChat';
import { useChatStore } from '../stores/chatStore';
import { AI_INITIAL_MESSAGE } from '../constants/aiMessages';

const ChatPage: React.FC = () => {
  const { clearCurrentMemo } = useChatStore();

  useEffect(() => {
    // チャットページ初期化時にメモ情報をクリア
    clearCurrentMemo();
  }, [clearCurrentMemo]);

  // AI応答の処理
  const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
    try {
      // ユーザーIDを取得
      let userId = null;
      
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.state?.user?.id) {
            userId = parsed.state.user.id;
          }
        } catch (e) {
          console.error('認証データの解析に失敗:', e);
        }
      }

      if (!userId) {
        throw new Error('ユーザーIDが見つかりません。再ログインしてください。');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message,
          memo_content: memoContent,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI応答の取得に失敗しました:', error);
      throw error;
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      bgcolor: 'background.default',
    }}>
      {/* Chat Header */}
      <Box sx={{ 
        p: 2, 
        borderBottom: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
      }}>
        <Typography variant="h5" fontWeight={600}>
          AIアシスタント
        </Typography>
        <Typography variant="body2" color="text.secondary">
          あなたの探究学習をサポートします
        </Typography>
      </Box>

      {/* Chat Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <AIChat
          title="AIアシスタント"
          persistentMode={true}
          loadHistoryFromDB={true}
          onMessageSend={handleAIMessage}
          initialMessage={AI_INITIAL_MESSAGE}
        />
      </Box>
    </Box>
  );
};

export default ChatPage;