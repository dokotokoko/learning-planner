import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import MultiMemoManager from '../components/MultiMemo/MultiMemoManager';

const MultiMemoPage: React.FC = () => {
  const { user } = useAuthStore();

  if (!user) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        height="100vh"
      >
        <Typography variant="h6" color="textSecondary">
          ログインが必要です
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', overflow: 'hidden' }}>
              <MultiMemoManager 
          userId={user.id}
          onMemosChange={(memos) => {
            // メモ変更時の処理（必要に応じて）
            console.log('Memos updated:', memos.length);
          }}
        />
    </Box>
  );
};

export default MultiMemoPage; 