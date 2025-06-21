// react-app/src/pages/GeneralInquiryPage.tsx
import React, { useState } from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Alert,
} from '@mui/material';
import { motion } from 'framer-motion';
import MemoChat from '../components/MemoChat/MemoChat';

const GeneralInquiryPage: React.FC = () => {
  // AI応答の処理（FastAPI バックエンド経由）
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

      // FastAPI バックエンドに接続
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
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
      
      // フォールバック：ローカル応答
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
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >


        {/* メイン：メモ&チャット統合UI */}
        <Box sx={{ height: 'calc(100vh - 300px)', minHeight: '500px', mb: 4 }}>
          <MemoChat
            pageId="inquiry"
            memoTitle="相談メモ"
            memoPlaceholder={`思考整理のための個人的なメモスペースです。
LLMには送信されません。

例：
- 漠然とした悩みや疑問
- 思いついたアイデア
- 整理したい考え
- 頭の中の整理
- 個人的なメモ
- 自分だけの覚書`}
            chatPlaceholder="相談内容を入力してください..."
            initialMessage="こんにちは！探究学習に関することでしたら、どんなことでもお気軽にご相談ください。

これまでの対話履歴を記憶していますので、継続的にサポートできます。

左側のメモ欄はあなただけの思考整理スペースです。自由にお使いください。

例えば以下のようなことでも構いません：
• テーマが決まらない
• 目標設定の方法が分からない
• 活動内容のアイデアが欲しい
• 調査方法について相談したい
• 成果のまとめ方を知りたい

どのようなことでお困りですか？"
            onMessageSend={handleAIMessage}
          />
        </Box>
      </motion.div>
    </Container>
  );
};

export default GeneralInquiryPage;