// react-app/src/pages/GeneralInquiryPage.tsx
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Alert,
  Button,
} from '@mui/material';
import { motion } from 'framer-motion';
import { Psychology as PsychologyIcon, Chat as ChatIcon } from '@mui/icons-material';
import MemoChat from '../components/MemoChat/MemoChat';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import { AnimatePresence } from 'framer-motion';
import AIChat from '../components/MemoChat/AIChat';
import { supabase } from '../lib/supabase';

const GeneralInquiryPage: React.FC = () => {
  const { isChatOpen, toggleChat } = useChatStore();
  const { user } = useAuthStore();

  // AIチャットをデフォルトで開く
  useEffect(() => {
    if (user && !isChatOpen) {
      setTimeout(() => toggleChat(), 500);
    }
  }, [user, isChatOpen, toggleChat]);

  // 手動保存機能
  const handleSave = async (content: string) => {
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('ユーザーが認証されていません');
      }

      // 既存のメモを確認
      const { data: existingMemo, error: fetchError } = await supabase
        .from('user_memos')
        .select('id')
        .eq('user_id', userId)
        .eq('page_id', 'general-inquiry')
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const now = new Date().toISOString();

      if (existingMemo) {
        // 既存のメモを更新
        const { error: updateError } = await supabase
          .from('user_memos')
          .update({
            content: content,
            updated_at: now,
          })
          .eq('id', existingMemo.id);

        if (updateError) throw updateError;
      } else {
        // 新規メモを作成
        const { error: insertError } = await supabase
          .from('user_memos')
          .insert({
            user_id: userId,
            page_id: 'general-inquiry',
            content: content,
            created_at: now,
            updated_at: now,
          });

        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('自動保存エラー:', error);
      throw error;
    }
  };

  // AI応答の処理
  const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
    try {
      // ユーザーIDを取得
      let userId = null;
      
      // auth-storageからユーザーIDを取得
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

      // バックエンドAPIに接続
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
          page: "general_inquiry",
          context: `現在のページ: AI相談
テーマ: 探究学習の疑問解決`
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI API エラー:', error);
      
      // デバッグ用：エラーの詳細をアラート表示
      alert(`API Error: ${error.message || error}`);
      
      // エラー時の代替応答
      return new Promise((resolve) => {
        setTimeout(() => {
          const responses = [
            `「${message}」についてお答えします。

${memoContent ? 'メモに書かれている内容も参考にさせていただきました。' : ''}

探究学習では以下のようなアプローチが効果的です：

1. **問いの設定**: 明確で具体的な問いを立てる
2. **情報収集**: 多角的な視点から情報を集める
3. **仮説検証**: 仮説を立てて検証する
4. **成果発表**: 学んだことを他者に伝える

他にもご質問があれば、お気軽にお聞かせください！`,
            
            `良いご質問ですね！${memoContent ? 'メモの内容' : 'そのお悩み'}は多くの学習者が抱える課題です。

私のおすすめは以下のステップです：

**まず小さく始める**
完璧を目指さず、できることから始めましょう

**具体的に考える**
抽象的な目標を具体的な行動に分解しましょう

**他者から学ぶ**
成功事例や専門家の意見を参考にしましょう

継続が何より大切です。一歩ずつ進んでいきましょう！`,
            
            `とても重要なポイントについてのご質問ですね。${memoContent ? 'メモに整理されている内容' : 'そのような課題'}は確かに悩ましいものです。

以下の観点から考えてみてはいかがでしょうか：

**目的の明確化**
何のためにそれを行うのか、目的を明確にする

⚖️ **優先順位の設定**
重要度と緊急度で活動に優先順位をつける

**PDCA サイクル**
計画→実行→評価→改善のサイクルを回す

ご不明な点があれば、さらに詳しくお聞かせください。`,
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          resolve(randomResponse);
        }, 1500);
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* タイトルとAIチャットボタン */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4 
        }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            AI相談
          </Typography>
          <Button
            variant="contained"
            startIcon={<PsychologyIcon />}
            onClick={toggleChat}
            sx={{
              background: 'linear-gradient(45deg, #059BFF, #006EB8)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #52BAFF, #00406B)',
              },
              borderRadius: 2,
              px: 3,
              py: 1.5,
            }}
          >
            AIアシスタント
          </Button>
        </Box>

        <MemoChat
          pageId="general-inquiry"
          memoTitle="💭 相談メモ"
          memoPlaceholder="相談したい内容や疑問をメモしてください..."
          chatPlaceholder="AIに相談してください..."
          onMessageSend={handleAIMessage}
          onSave={handleSave}
        />

        {/* AIチャット */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '400px',
                height: '100vh',
                zIndex: 1300,
                background: 'white',
                boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
              }}
            >
              <AIChat
                title="AI相談アシスタント"
                onClose={toggleChat}
                persistentMode={true}
                enableSmartNotifications={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </Container>
  );
};

export default GeneralInquiryPage;