// react-app/src/pages/ConversationAgentTestPage.tsx
import React, { useState, useEffect, useRef } from 'react';
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
  TrendingUp,
  Timeline,
  Assignment,
  Warning,
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
  
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [forceRefresh, setForceRefresh] = useState(false);
  const aiChatApiRef = useRef<{ sendMessage: (message: string) => void; } | null>(null);
  
  // テストメッセージのプリセット
  const testMessages = [
    "このプロジェクトを始めるにあたって、どこから手を付ければよいでしょうか？",
    "実験の設計方法がよくわからず困っています",
    "データ収集の方法について迷っています",
    "結果の分析はどのようにすればよいでしょうか？",
    "研究の進め方について行き詰まりを感じています",
    "やることが多すぎて何から始めたらいいかわからない",
    "プロジェクトの方向性が定まらない",
    "時間が足りない気がする"
  ];

  const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
    try {
      console.log('================== 対話エージェント処理開始 ==================');
      console.log('📝 ユーザーメッセージ:', message);
      
      const userId = user?.id;
      if (!userId) {
        throw new Error('ユーザーIDが見つかりません');
      }

      console.log('📋 プロジェクト情報:', {
        theme: projectInfo.theme,
        question: projectInfo.question,
        hypothesis: projectInfo.hypothesis
      });

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      console.log('🚀 対話エージェント専用APIリクエスト送信中...');
      
      const response = await fetch(`${apiBaseUrl}/conversation-agent/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message,
          page_id: 'conversation-agent-test',
          project_id: 1,  // テスト用プロジェクトID（整数）
          include_history: true,
          history_limit: 50,
          debug_mode: true,
          mock_mode: true
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // レスポンス全体を確認
      console.log('✅ APIレスポンス受信完了');
      console.log('📦 レスポンス全体:', data);
      console.log('  - レスポンスのキー:', Object.keys(data));
      console.log('================== ステップ詳細ログ ==================');
      
      // Step 1: 理解フェーズ
      if (data.state_snapshot) {
        console.log('📊 Step 1: 理解フェーズ (状態抽出)');
        console.log('  - 目標:', data.state_snapshot.goal || 'なし');
        console.log('  - 目的:', data.state_snapshot.purpose || 'なし');
        console.log('  - 時間軸:', data.state_snapshot.time_horizon || 'なし');
        console.log('  - ブロッカー:', data.state_snapshot.blockers?.length || 0, '個');
        console.log('  - 不確実性:', data.state_snapshot.uncertainties?.length || 0, '個');
      }
      
      // Step 2: 思考フェーズ
      if (data.project_plan) {
        console.log('🎯 Step 2: 思考フェーズ (計画作成)');
        console.log('  - 北極星:', data.project_plan.north_star);
        console.log('  - 次の行動数:', data.project_plan.next_actions?.length || 0);
        if (data.project_plan.next_actions?.length > 0) {
          console.log('  - 最優先行動:', data.project_plan.next_actions[0].action);
          console.log('    緊急度:', data.project_plan.next_actions[0].urgency);
          console.log('    重要度:', data.project_plan.next_actions[0].importance);
        }
        console.log('  - マイルストーン数:', data.project_plan.milestones?.length || 0);
        console.log('  - 計画信頼度:', data.project_plan.confidence ? `${(data.project_plan.confidence * 100).toFixed(0)}%` : 'なし');
      }
      
      // Step 3: 支援タイプ判定
      if (data.support_type) {
        console.log('🔍 Step 3: 支援タイプ判定');
        console.log('  - 選択された支援タイプ:', data.support_type);
        if (data.decision_metadata?.support_confidence) {
          console.log('  - 確信度:', `${(data.decision_metadata.support_confidence * 100).toFixed(0)}%`);
        }
        if (data.decision_metadata?.support_reason) {
          console.log('  - 判定理由:', data.decision_metadata.support_reason);
        }
      }
      
      // Step 4: 発話アクト選択
      if (data.selected_acts) {
        console.log('💬 Step 4: 発話アクト選択');
        console.log('  - 選択されたアクト:', data.selected_acts.join(', '));
        if (data.decision_metadata?.act_reason) {
          console.log('  - 選択理由:', data.decision_metadata.act_reason);
        }
      }
      
      // Step 5: 応答生成
      console.log('📝 Step 5: 応答生成');
      console.log('  - 応答文字数:', data.response?.length || 0);
      console.log('  - 応答内容プレビュー:', data.response?.substring(0, 100) + '...');
      
      // メトリクス
      if (data.metrics) {
        console.log('📈 会話メトリクス:');
        console.log('  - ターン数:', data.metrics.turns_count || 0);
        console.log('  - 前進感:', data.metrics.momentum_delta || 0);
      }
      
      console.log('================== 処理完了 ==================');
      console.log('総処理時間:', data.decision_metadata?.timestamp ? 
        `${new Date(data.decision_metadata.timestamp).toLocaleTimeString('ja-JP')}` : '不明');
      
      // 詳細情報のみを保存（UIの詳細パネル用）
      setLastResponse(data);
      
      return data.response;
    } catch (error) {
      console.error('AI応答の取得に失敗しました:', error);
      throw error;
    }
  };

  const handleQuickTest = (message: string) => {
    aiChatApiRef.current?.sendMessage(message);
  };

  const resetConversation = () => {
    setLastResponse(null);
    setForceRefresh(true);
    // forceRefreshをリセットして、次回のリセットに備える
    setTimeout(() => setForceRefresh(false), 100);
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
                      disabled={false}
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
                      <Typography variant="subtitle2">📋 支援タイプ & アクト選択</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="primary">支援タイプ:</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                          <Chip 
                            label={lastResponse.support_type || 'N/A'}
                            color="primary" 
                            size="medium"
                          />
                          {lastResponse.decision_metadata?.support_confidence && (
                            <Chip 
                              label={`確信度: ${(lastResponse.decision_metadata.support_confidence * 100).toFixed(0)}%`}
                              variant="outlined"
                              size="small"
                              color="info"
                            />
                          )}
                        </Box>
                        {lastResponse.decision_metadata?.support_reason && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                            理由: {lastResponse.decision_metadata.support_reason}
                          </Typography>
                        )}
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="primary">選択された発話アクト:</Typography>
                        <Box sx={{ mt: 1 }}>
                          {lastResponse.selected_acts?.map((act: string, index: number) => (
                            <Chip 
                              key={index}
                              label={act} 
                              variant="outlined" 
                              size="medium"
                              sx={{ mr: 1, mt: 0.5 }}
                            />
                          ))}
                        </Box>
                        {lastResponse.decision_metadata?.act_reason && (
                          <Typography variant="caption" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
                            選択理由: {lastResponse.decision_metadata.act_reason}
                          </Typography>
                        )}
                      </Box>
                      
                      {lastResponse.decision_metadata?.timestamp && (
                        <Typography variant="caption" color="text.secondary">
                          処理時刻: {new Date(lastResponse.decision_metadata.timestamp).toLocaleString('ja-JP')}
                        </Typography>
                      )}
                    </AccordionDetails>
                  </Accordion>

                  {lastResponse.project_plan && (
                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle2">
                          <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                          🎯 プロジェクト計画（思考フェーズ）
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {/* 北極星 */}
                        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.main', color: 'primary.contrastText', borderRadius: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                            🌟 北極星（最重要指標）
                          </Typography>
                          <Typography variant="body1">
                            {lastResponse.project_plan.north_star}
                          </Typography>
                          {lastResponse.project_plan.north_star_metric && (
                            <Typography variant="caption" sx={{ display: 'block', mt: 1, opacity: 0.9 }}>
                              測定方法: {lastResponse.project_plan.north_star_metric}
                            </Typography>
                          )}
                        </Box>

                        {/* 次の行動 */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" fontWeight={600} color="primary" sx={{ mb: 2 }}>
                            🚀 次の行動 (緊急度×重要度順)
                          </Typography>
                          {lastResponse.project_plan.next_actions?.slice(0, 3).map((action: any, index: number) => (
                            <Paper key={index} sx={{ p: 2, mb: 1.5, border: '1px solid', borderColor: 'divider' }}>
                              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                                {index + 1}. {action.action}
                              </Typography>
                              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                <Chip 
                                  label={`緊急度: ${action.urgency}`}
                                  size="small" 
                                  color={action.urgency >= 4 ? "error" : action.urgency >= 3 ? "warning" : "default"}
                                />
                                <Chip 
                                  label={`重要度: ${action.importance}`}
                                  size="small" 
                                  color={action.importance >= 4 ? "info" : "default"}
                                />
                                <Chip 
                                  label={`総合: ${action.urgency * action.importance}`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Box>
                              {action.reason && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                  理由: {action.reason}
                                </Typography>
                              )}
                              {action.expected_outcome && (
                                <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                                  期待結果: {action.expected_outcome}
                                </Typography>
                              )}
                            </Paper>
                          ))}
                        </Box>

                        {/* マイルストーン */}
                        <Box sx={{ mb: 3 }}>
                          <Typography variant="body2" fontWeight={600} color="primary" sx={{ mb: 1 }}>
                            <Timeline sx={{ mr: 1, verticalAlign: 'middle', fontSize: '1rem' }} />
                            マイルストーン ({lastResponse.project_plan.milestones?.length || 0}個)
                          </Typography>
                          {lastResponse.project_plan.milestones?.slice(0, 3).map((milestone: any, index: number) => (
                            <Box key={index} sx={{ ml: 2, mb: 1 }}>
                              <Typography variant="caption" fontWeight={600}>
                                {milestone.order}. {milestone.title}
                              </Typography>
                              {milestone.target_date && (
                                <Chip 
                                  label={milestone.target_date}
                                  size="small"
                                  variant="outlined"
                                  sx={{ ml: 1, fontSize: '0.7rem' }}
                                />
                              )}
                            </Box>
                          ))}
                        </Box>

                        {/* 戦略・リスク */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                          {lastResponse.project_plan.strategic_approach && (
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600} color="primary">
                                <Assignment sx={{ mr: 1, verticalAlign: 'middle', fontSize: '1rem' }} />
                                戦略的アプローチ:
                              </Typography>
                              <Typography variant="caption">
                                {lastResponse.project_plan.strategic_approach}
                              </Typography>
                            </Box>
                          )}
                          {lastResponse.project_plan.risk_factors && lastResponse.project_plan.risk_factors.length > 0 && (
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" fontWeight={600} color="warning.main">
                                <Warning sx={{ mr: 0.5, verticalAlign: 'middle', fontSize: '1rem' }} />
                                リスク要因:
                              </Typography>
                              {lastResponse.project_plan.risk_factors.slice(0, 3).map((risk: string, index: number) => (
                                <Chip 
                                  key={index}
                                  label={risk}
                                  size="small"
                                  color="warning"
                                  variant="outlined"
                                  sx={{ mr: 0.5, mt: 0.5, fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>

                        {lastResponse.project_plan.confidence && (
                          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="caption" color="text.secondary">
                              計画信頼度: {(lastResponse.project_plan.confidence * 100).toFixed(0)}%
                              {lastResponse.project_plan.created_at && (
                                ` | 作成: ${new Date(lastResponse.project_plan.created_at).toLocaleString('ja-JP')}`
                              )}
                            </Typography>
                          </Box>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  )}

                  <Accordion>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                      <Typography variant="subtitle2">📊 状態スナップショット & メトリクス</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      {/* 基本状態 */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" fontWeight={600} color="primary">学習者の状態:</Typography>
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">目標:</Typography>
                          <Typography variant="body2" sx={{ mb: 1, ml: 1 }}>
                            {lastResponse.state_snapshot?.goal || 'N/A'}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary">目的:</Typography>
                          <Typography variant="body2" sx={{ mb: 1, ml: 1 }}>
                            {lastResponse.state_snapshot?.purpose || 'N/A'}
                          </Typography>
                          
                          {lastResponse.state_snapshot?.time_horizon && (
                            <>
                              <Typography variant="body2" color="text.secondary">時間軸:</Typography>
                              <Chip 
                                label={lastResponse.state_snapshot.time_horizon}
                                size="small"
                                color="info"
                                sx={{ ml: 1, mb: 1 }}
                              />
                            </>
                          )}
                        </Box>
                      </Box>

                      {/* ブロッカー・不確実性 */}
                      {(lastResponse.state_snapshot?.blockers?.length > 0 || lastResponse.state_snapshot?.uncertainties?.length > 0) && (
                        <Box sx={{ mb: 2, p: 1.5, bgcolor: 'warning.light', borderRadius: 1 }}>
                          {lastResponse.state_snapshot?.blockers?.length > 0 && (
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" fontWeight={600} color="warning.dark">
                                🚧 ブロッカー:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {lastResponse.state_snapshot.blockers.map((blocker: string, index: number) => (
                                  <Chip 
                                    key={index}
                                    label={blocker}
                                    size="small"
                                    color="warning"
                                    sx={{ mr: 0.5, mt: 0.5, fontSize: '0.75rem' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                          
                          {lastResponse.state_snapshot?.uncertainties?.length > 0 && (
                            <Box>
                              <Typography variant="caption" fontWeight={600} color="warning.dark">
                                ❓ 不確実性:
                              </Typography>
                              <Box sx={{ mt: 0.5 }}>
                                {lastResponse.state_snapshot.uncertainties.map((uncertainty: string, index: number) => (
                                  <Chip 
                                    key={index}
                                    label={uncertainty}
                                    size="small"
                                    variant="outlined"
                                    color="warning"
                                    sx={{ mr: 0.5, mt: 0.5, fontSize: '0.75rem' }}
                                  />
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      )}
                      
                      {/* メトリクス */}
                      {lastResponse.metrics && (
                        <Box sx={{ pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="body2" fontWeight={600} color="primary" sx={{ mb: 1 }}>
                            📈 会話メトリクス:
                          </Typography>
                          <Grid container spacing={1}>
                            {lastResponse.metrics.turns_count && (
                              <Grid item>
                                <Chip 
                                  label={`ターン数: ${lastResponse.metrics.turns_count}`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Grid>
                            )}
                            {lastResponse.metrics.momentum_delta !== undefined && (
                              <Grid item>
                                <Chip 
                                  label={`前進感: ${lastResponse.metrics.momentum_delta >= 0 ? '+' : ''}${lastResponse.metrics.momentum_delta.toFixed(2)}`}
                                  size="small"
                                  color={lastResponse.metrics.momentum_delta >= 0 ? "success" : "error"}
                                />
                              </Grid>
                            )}
                          </Grid>
                        </Box>
                      )}
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
                </Box>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <strong>新実装機能:</strong> 状態抽出(理解) → 計画思考フェーズ(思考) → 支援タイプ判定 → アクト選択 → 応答生成
                </Alert>

                <Box sx={{ height: 'calc(100% - 120px)' }}>
                  <AIChat
                    onLoad={(api) => {
                      aiChatApiRef.current = api;
                    }}
                    pageId="conversation-agent-test"
                    title="対話エージェントテスト"
                    persistentMode={true}
                    loadHistoryFromDB={true}
                    onMessageSend={handleAIMessage}
                    forceRefresh={forceRefresh}
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
