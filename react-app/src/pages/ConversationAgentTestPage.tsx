// react-app/src/pages/ConversationAgentTestPage.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Divider,
  Grid,
  Paper,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
} from '@mui/material';
import {
  ExpandMore,
  Psychology,
  Send,
  Refresh,
  Science,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import AIChat from '../components/MemoChat/AIChat';
import { useAuthStore } from '../stores/authStore';

const ConversationAgentTestPage: React.FC = () => {
  const { user } = useAuthStore();
  const [projectInfo, setProjectInfo] = useState({
    theme: 'AIを活用した学習支援システムの効果検証',
    question: 'AIはどのように個別最適化された学習を実現できるか？',
    hypothesis: 'AIが学習者の理解度と学習パターンを分析することで、個別に最適化された学習経験を提供し、学習効果を向上させる',
  });
  
  const [conversationHistory, setConversationHistory] = useState<Array<{sender: string, message: string}>>([]);
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  
  // テストメッセージのプリセット
  const testMessages = [
    "このプロジェクトを始めるにあたって、どこから手を付ければよいでしょうか？",
    "実験の設計方法がよくわからず困っています",
    "データ収集の方法について迷っています",
    "結果の分析はどのようにすればよいでしょうか？",
    "研究の進め方について行き詰まりを感じています",
  ];

  const handleAIMessage = async (message: string): Promise<string> => {
    setLoading(true);
    try {
      const userId = user?.id;
      if (!userId) {
        throw new Error('ユーザーIDが見つかりません');
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
          page_id: 'conversation-agent-test',
          memo_content: `プロジェクト情報:\nテーマ: ${projectInfo.theme}\n問い: ${projectInfo.question}\n仮説: ${projectInfo.hypothesis}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLastResponse(data);
      
      // 会話履歴を更新
      setConversationHistory(prev => [
        ...prev,
        { sender: 'user', message },
        { sender: 'assistant', message: data.response }
      ]);
      
      return data.response;
    } catch (error) {
      console.error('AI応答の取得に失敗しました:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleQuickTest = async (message: string) => {
    try {
      await handleAIMessage(message);
    } catch (error) {
      console.error('クイックテストに失敗しました:', error);
    }
  };

  const resetConversation = () => {
    setConversationHistory([]);
    setLastResponse(null);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* ページヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Psychology color="primary" sx={{ fontSize: 32 }} />
            <Typography variant="h4" fontWeight={700} color="primary">
              対話エージェント検証ページ
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            実装した対話エージェント機能（計画思考フェーズ付き）をテストできます
          </Typography>
        </Box>
      </motion.div>

      <Grid container spacing={3}>
        {/* 左側：設定パネル */}
        <Grid item xs={12} lg={4}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* プロジェクト情報入力 */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  <Science sx={{ mr: 1, verticalAlign: 'middle' }} />
                  プロジェクト情報（理解フェーズ）
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  理解フェーズで使用される必須フィールド
                </Typography>
                
                <TextField
                  fullWidth
                  label="探究テーマ"
                  multiline
                  rows={2}
                  value={projectInfo.theme}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, theme: e.target.value }))}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="探究の問い"
                  multiline
                  rows={2}
                  value={projectInfo.question}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, question: e.target.value }))}
                  sx={{ mb: 2 }}
                />
                
                <TextField
                  fullWidth
                  label="仮説"
                  multiline
                  rows={3}
                  value={projectInfo.hypothesis}
                  onChange={(e) => setProjectInfo(prev => ({ ...prev, hypothesis: e.target.value }))}
                />
              </CardContent>
            </Card>

            {/* クイックテスト */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom>
                  クイックテスト
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  よくある質問でエージェントをテスト
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {testMessages.map((message, index) => (
                    <Button
                      key={index}
                      variant="outlined"
                      size="small"
                      onClick={() => handleQuickTest(message)}
                      disabled={loading}
                      sx={{ justifyContent: 'flex-start', textAlign: 'left', fontSize: '0.85rem' }}
                    >
                      {message}
                    </Button>
                  ))}
                </Box>

                <Button
                  variant="contained"
                  startIcon={<Refresh />}
                  onClick={resetConversation}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  会話をリセット
                </Button>
              </CardContent>
            </Card>

            {/* 最新の応答データ */}
            {lastResponse && (
              <Card>
                <CardContent>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    応答データ詳細
                  </Typography>
                  
                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2">支援タイプ & アクト</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">支援タイプ:</Typography>
                        <Chip 
                          label={lastResponse.support_type || 'N/A'} 
                          color="primary" 
                          size="small"
                          sx={{ mr: 1 }} 
                        />
                      </Box>
                      <Box>
                        <Typography variant="body2" color="text.secondary">選択されたアクト:</Typography>
                        {lastResponse.selected_acts?.map((act: string, index: number) => (
                          <Chip 
                            key={index}
                            label={act} 
                            variant="outlined" 
                            size="small"
                            sx={{ mr: 0.5, mt: 0.5 }} 
                          />
                        ))}
                      </Box>
                    </AccordionDetails>
                  </Accordion>

                  {lastResponse.project_plan && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle2">🎯 プロジェクト計画（NEW!）</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            北極星:
                          </Typography>
                          <Typography variant="body2" sx={{ mb: 2 }}>
                            {lastResponse.project_plan.north_star}
                          </Typography>
                        </Box>

                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            次の行動 (緊急度×重要度順):
                          </Typography>
                          {lastResponse.project_plan.next_actions?.slice(0, 3).map((action: any, index: number) => (
                            <Paper key={index} sx={{ p: 1, mt: 1, bgcolor: 'background.default' }}>
                              <Typography variant="caption" fontWeight={600}>
                                {action.action}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                                <Chip label={`緊急度: ${action.urgency}`} size="small" color="error" />
                                <Chip label={`重要度: ${action.importance}`} size="small" color="info" />
                              </Box>
                            </Paper>
                          ))}
                        </Box>

                        <Box>
                          <Typography variant="body2" fontWeight={600} color="primary">
                            マイルストーン数:
                          </Typography>
                          <Typography variant="body2">
                            {lastResponse.project_plan.milestones?.length || 0}個
                          </Typography>
                        </Box>
                      </AccordionDetails>
                    </Accordion>
                  )}

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2">状態スナップショット</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" color="text.secondary">目標:</Typography>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {lastResponse.state_snapshot?.goal || 'N/A'}
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary">目的:</Typography>
                      <Typography variant="body2">
                        {lastResponse.state_snapshot?.purpose || 'N/A'}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </Grid>

        {/* 右側：チャットインターフェース */}
        <Grid item xs={12} lg={8}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card sx={{ height: '80vh' }}>
              <CardContent sx={{ p: 2, height: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Psychology color="primary" />
                  <Typography variant="h6" fontWeight={600}>
                    AI対話エージェント
                  </Typography>
                  {loading && <CircularProgress size={20} />}
                </Box>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>実装機能:</strong> 状態抽出（簡素化）→ 計画思考フェーズ → 支援タイプ判定 → アクト選択 → 応答生成
                </Alert>

                <Box sx={{ height: 'calc(100% - 120px)' }}>
                  <AIChat
                    pageId="conversation-agent-test"
                    title="対話エージェントテスト"
                    persistentMode={true}
                    loadHistoryFromDB={true}
                    onMessageSend={handleAIMessage}
                    initialMessage="こんにちは！新しい対話エージェント機能をテストしています。プロジェクトについて何でもお気軽にご相談ください。"
                  />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ConversationAgentTestPage;