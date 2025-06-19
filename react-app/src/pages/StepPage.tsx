// react-app/src/pages/StepPage.tsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Alert,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  LightbulbOutlined as IdeaIcon,
  TipsAndUpdates as ThemeIcon,
  TrackChanges as GoalIcon,
  Assignment as PlanIcon,
  Assessment as ReviewIcon,
  Note as NoteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import StepProgressBar from '../components/Layout/StepProgressBar';
import WorkspaceWithAI from '../components/MemoChat/WorkspaceWithAI';
import AIChat from '../components/MemoChat/AIChat';
import { useAuthStore } from '../stores/authStore';
import { LayoutContext } from '../components/Layout/Layout';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTheme } from '@mui/material';

const StepPage: React.FC = () => {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { sidebarOpen, onSidebarToggle } = useContext(LayoutContext);
  const muiTheme = useTheme();
  const currentStep = parseInt(stepNumber || '1');

  const [theme, setTheme] = useState('');
  const [goal, setGoal] = useState('');
  const [workContent, setWorkContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [step1Theme, setStep1Theme] = useState('');
  const [hasStep2AutoMessage, setHasStep2AutoMessage] = useState(false);

  // データの初期ロード
  useEffect(() => {
    const loadData = async () => {
      try {
        // Step1で保存されたテーマを読み込み
        const savedTheme = localStorage.getItem('step-1-theme');
        if (savedTheme && currentStep >= 2) {
          setTheme(savedTheme);
        }
        
        if (currentStep >= 3) {
          setGoal("AIを活用したメタ認知支援システムの効果を検証し、学習効率向上のための具体的な手法を提案する");
        }
        
        // 既存の作業内容を読み込み
        const savedContent = localStorage.getItem(`step-${currentStep}-content`);
        if (savedContent) {
          setWorkContent(savedContent);
        }
        
        // Step1の場合はテーマも読み込み
        if (currentStep === 1) {
          const savedTheme = localStorage.getItem('step-1-theme');
          if (savedTheme) {
            setStep1Theme(savedTheme);
          }
        }
        
        // Step2の場合は保存された目標も読み込み
        if (currentStep === 2) {
          const savedGoal = localStorage.getItem('step-2-goal');
          if (savedGoal) {
            setGoal(savedGoal);
          }
          
          // Step2での自動初期メッセージ送信をチェック
          const autoMessageSent = localStorage.getItem('step2-auto-message-sent');
          if (autoMessageSent) {
            setHasStep2AutoMessage(true);
          }
        }
      } catch (error) {
        console.error('データ読み込みエラー:', error);
        setError('データの読み込みに失敗しました');
      }
    };

    loadData();
  }, [currentStep, user]);

  // Step2でテーマが読み込まれた時の自動初期メッセージ送信
  useEffect(() => {
    if (currentStep === 2 && theme && !hasStep2AutoMessage) {
      // 自動メッセージ送信済みフラグを設定（初期メッセージは AIChatコンポーネント側で表示）
      localStorage.setItem('step2-auto-message-sent', 'true');
      setHasStep2AutoMessage(true);
    }
  }, [currentStep, theme, hasStep2AutoMessage]);

  // Step2の初期メッセージを生成
  const generateStep2InitialMessage = (userTheme: string): string => {
    // 簡易的なAI応答を生成（実際の実装ではAPI呼び出し）
    return `こんにちは！あなたの探究テーマ「${userTheme}」について、具体的な学習目標を一緒に考えていきましょう。

まず、このテーマを選んだ理由について教えてください。

例えば：
• このテーマに興味を持ったきっかけは何ですか？
• 将来の進路や関心との関連はありますか？
• 解決したいと思う具体的な問題はありますか？

お気軽にお話しください！😊`;
  };

  // AI応答の処理（FastAPI バックエンド経由）
  const handleAIMessage = async (message: string, workContent: string): Promise<string> => {
    try {
      // FastAPI バックエンドに接続
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer dummy-token',
        },
        body: JSON.stringify({
          message: message,
          context: `現在のステップ: Step ${currentStep}
探究テーマ: ${theme || '（未設定）'}
学習目標: ${goal || '（未設定）'}
ワークスペース内容: ${workContent || '（記入なし）'}`
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI API エラー:', error);
      
      // フォールバック：ローカル応答
      return new Promise((resolve) => {
        setTimeout(() => {
          let response = '';
          
          switch (currentStep) {
            case 1:
              response = `「${message}」について考えてみますね。\n\n興味を探究テーマに発展させるには、以下の点を考えてみてください：\n\n1. なぜそれに興味を持ったのか？\n2. その分野で解決したい問題は何か？\n3. 他の人も関心を持ちそうな課題は何か？\n\n${workContent ? 'ワークスペースの内容' : '思いついたこと'}を具体的なテーマに絞り込んでいきましょう！`;
              break;
            case 2:
              // Step2では対話ベースの応答
              if (message.includes('興味') || message.includes('きっかけ')) {
                response = `なるほど、${message.substring(0, 50)}...というきっかけがあったのですね。\n\nそれでは次に、「${theme}」について、どんなことを具体的に理解したいですか？\n\n例えば：\n• 基本的な仕組みや原理\n• 実際の応用事例や活用方法\n• 現在の研究動向や課題\n• 自分なりの新しいアプローチ\n\nどの方向に興味がありますか？`;
              } else if (message.includes('理解') || message.includes('学び') || message.includes('知り')) {
                response = `とても良い視点ですね！${message.substring(0, 50)}...について理解を深めたいのですね。\n\n最後に、この探究を通じてどのような成果を目指したいですか？\n\n例えば：\n• レポートや論文としてまとめる\n• 実際のプロトタイプや作品を作る\n• プレゼンテーションで発表する\n• 実験や調査の結果を分析する\n\nどのような形で成果を残したいでしょうか？`;
              } else {
                response = `「${message}」について詳しく教えてくださり、ありがとうございます。\n\nこれまでのお話から、具体的な学習目標が見えてきました。これらの内容を踏まえて、SMART原則（具体的・測定可能・達成可能・関連性・期限設定）に沿った目標を一緒に作ってみましょう。\n\n下の「目標入力エリア」に、今回の対話を参考にして具体的な学習目標を書いてみてください。何か分からないことがあれば、いつでもお聞きください！`;
              }
              break;
            case 3:
              response = `「${message}」について、具体的な活動を考えてみましょう。\n\n${workContent ? 'ワークスペースの内容から興味深いアイデアが見えますね。' : 'まずは思いついた活動をワークスペースに整理してみてください。'}\n\n目標達成のための活動として、以下の観点で考えてみてはいかがでしょうか：\n\n📚 **情報収集・調査**\n• 文献調査、論文検索\n• 専門家への取材・インタビュー\n• アンケート調査、データ収集\n\n🔬 **実験・検証**\n• 仮説設定と検証実験\n• プロトタイプ作成・テスト\n• 効果測定・分析`;
              break;
            case 4:
              response = `「${message}」について振り返ってみましょう。\n\n${workContent ? 'これまでの学習過程がよく整理されていますね。' : 'これまでの経験を振り返って、学んだことをまとめてみてください。'}\n\n振り返りでは以下の観点が大切です：\n\n🎯 **達成できたこと**\n• 設定した目標に対する達成度\n• 新しく学んだ知識・スキル\n• 予想外の発見や気づき\n\n🔄 **改善点・課題**\n• うまくいかなかった点\n• 次回に活かしたい学び\n• さらに深めたいテーマ`;
              break;
            default:
              response = 'ご質問ありがとうございます。詳しくお答えします。';
          }
          
          resolve(response);
        }, 1500);
      });
    }
  };

  const stepContent = {
    1: {
      title: 'Step 1: 探究テーマを決める',
      description: '興味から探究テーマを具体化しましょう',
      workPlaceholder: `あなたの興味や関心について自由に書いてください...

【ガイダンス】
以下の観点から探究テーマを考えてみましょう：

■ 興味・関心の領域
• 社会問題や身近な疑問・課題
• 将来の夢や目標に関連するテーマ
• これまでに学んできた中で特に興味を持ったこと
• 最近気になっているニュースや出来事

■ テーマの絞り込み
• なぜそれに興味を持ったのか？
• その分野で解決したい問題は何か？
• 他の人も関心を持ちそうな課題は何か？
• 実際に調査・研究できそうな範囲か？

■ 最終的なテーマ（例）
• 「AIによるメタ認知支援」
• 「地域活性化とSNSの関係性」
• 「学習効率を高める環境デザイン」

右下のAIボタンから質問・相談ができます。`,
      aiButtonText: 'テーマ設定AI',
             initialMessage: `こんにちは！探究学習のテーマ設定をお手伝いします。

まずは、あなたが興味を持っていることについて教えてください。どんな小さなことでも構いません。

例えば：
• 最近気になっているニュース
• 将来やってみたい仕事
• 解決したいと思う身近な問題
• 趣味や好きなこと

ワークスペースに思いついたことを書きながら、お気軽にお話しください！😊`,
    },
    2: {
      title: 'Step 2: 学習目標を設定する',
      description: 'AIとの対話を通じて具体的な学習目標を明確にしましょう',
      workPlaceholder: 'AI対話で決まった目標をここに入力してください...',
      aiButtonText: '目標設定AI',
      initialMessage: theme ? generateStep2InitialMessage(theme) : 'Step1で探究テーマを設定してから進んでください。',
    },
    3: {
      title: 'Step 3: 活動計画を立てる',
      description: '目標達成のための具体的な活動計画を作成しましょう',
      workPlaceholder: `目標「${goal}」を達成するための活動計画を立ててください...

【ガイダンス】
以下の活動を組み合わせて計画を立てましょう：

■ 情報収集・調査
• 文献調査、論文検索
• 専門家への取材・インタビュー
• アンケート調査、データ収集
• 現地調査・フィールドワーク

■ 実験・検証
• 仮説設定と検証実験
• プロトタイプ作成・テスト
• 効果測定・分析
• データの統計処理

■ 制作・開発
• システム・アプリ開発
• 作品・モデル制作
• 提案書・レポート作成

■ 発表・共有
• プレゼンテーション準備
• ポスター・資料作成
• 成果発表会での発表

■ スケジュール例
1. 文献調査（1ヶ月目）
2. 専門家インタビュー（2ヶ月目）
3. システム設計・開発（3ヶ月目）
4. 効果検証実験（4ヶ月目）
5. 成果発表準備（5ヶ月目）

AIアシスタントが活動計画の作成をサポートします。`,
      aiButtonText: '活動計画AI',
             initialMessage: `こんにちは！目標達成のための具体的な活動計画を一緒に考えていきましょう。

あなたの目標：「${goal}」

この目標を達成するために、以下について一緒に考えてみませんか：

1. どのような調査や実験が必要だと思いますか？
2. どんな人に話を聞いてみたいですか？
3. どのような資料や情報が必要でしょうか？
4. 成果をどのような形でまとめたいですか？

ワークスペースにアイデアを書きながら、お気軽にお話しください！💡`,
    },
    4: {
      title: 'Step 4: 学習の振り返り',
      description: '探究学習の成果をまとめて振り返りましょう',
      workPlaceholder: `探究学習の振り返りと今後の課題について記録してください...

【ガイダンス】
以下の観点で振り返りを行いましょう：

■ 達成できたこと
• 設定した目標に対する達成度
• 新しく学んだ知識・スキル
• 予想外の発見や気づき
• 成長を実感できた点

■ プロセスの振り返り
• 効果的だった学習方法
• 困難だった点とその対処法
• 他者との協働・連携
• 情報収集・分析の方法

■ 成果物・アウトプット
• 作成した資料・作品
• 発表・プレゼンテーション
• 他者からのフィードバック
• 社会への影響・貢献

■ 今後の課題・展望
• さらに深めたい領域
• 新たに生まれた疑問・課題
• 次の探究テーマへの発展
• 長期的な学習計画

■ 学んだこと
• 探究学習のスキル
• 問題解決能力
• 批判的思考力
• コミュニケーション能力

AIアシスタントが振り返りをサポートします。`,
      aiButtonText: '振り返りAI',
             initialMessage: `お疲れ様でした！探究学習の計画が完成しましたね。

これまでの学習過程を振り返ってみましょう。

• どんな学びがありましたか？
• 困難だった点は何でしたか？
• 今後さらに深めたいことはありますか？

ワークスペースに振り返りを書きながら、お気軽にお話しください！📝`,
    },
  };

  const content = stepContent[currentStep as keyof typeof stepContent];

  // データ保存処理
  const handleSave = async () => {
    try {
      // LocalStorageに保存
      localStorage.setItem(`step-${currentStep}-content`, workContent);
      // TODO: Supabaseに保存
      console.log(`Step ${currentStep} saved:`, workContent);
      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);
    } catch (error) {
      console.error('保存エラー:', error);
      setError('保存に失敗しました');
    }
  };

  // ナビゲーション
  const handleNext = () => {
    // Step1の場合はテーマの入力をチェック
    if (currentStep === 1) {
      if (!step1Theme.trim()) {
        setError('探究テーマを入力してから次へ進んでください');
        return;
      }
      // テーマを保存
      localStorage.setItem('step-1-theme', step1Theme);
      setTheme(step1Theme);
      // Step2の自動メッセージフラグをリセット
      localStorage.removeItem('step2-auto-message-sent');
    } else if (currentStep === 2) {
      // Step2の場合は目標の入力をチェック
      if (!goal.trim()) {
        setError('学習目標を入力してから次へ進んでください');
        return;
      }
      // 目標を保存
      localStorage.setItem('step-2-goal', goal);
    } else {
      if (!workContent.trim() && currentStep < 4) {
        setError(`内容を入力してから次へ進んでください`);
        return;
      }
    }
    
    // 現在の内容を保存してから次へ
    handleSave();
    
    if (currentStep < 4) {
      navigate(`/step/${currentStep + 1}`);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      navigate(`/step/${currentStep - 1}`);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* 上部のProgressBar */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        px: 3,
        py: 2,
      }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
            {content?.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <StepProgressBar 
                currentStep={currentStep} 
                onStepClick={(step) => navigate(`/step/${step}`)}
                clickable
                compact
              />
            </Box>
            <Button
              variant={isMemoOpen ? "contained" : "outlined"}
              startIcon={<NoteIcon />}
              onClick={() => setIsMemoOpen(!isMemoOpen)}
              size="small"
              sx={{ 
                minWidth: 120,
                whiteSpace: 'nowrap',
              }}
            >
              {isMemoOpen ? 'メモ帳閉じる' : 'メモ帳'}
            </Button>
          </Box>
        </Box>
      </Box>

      {/* メインワークスペース */}
      <Box sx={{ flex: 1 }}>
        {currentStep === 1 ? (
          /* Step1専用UI */
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ヘッダー */}
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              p: 3,
              backgroundColor: 'background.paper',
            }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
          {content?.title}
        </Typography>
              {content?.description && (
                <Typography variant="body2" color="text.secondary">
          {content?.description}
                </Typography>
              )}
            </Box>

            {/* Step1メインコンテンツ */}
            <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* テーマ入力エリア */}
              <Paper elevation={1} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  🎯 探究テーマを決めましょう
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  あなたが興味を持っている分野から、探究したいテーマを1つ決めてください
                </Typography>
                <TextField
                  fullWidth
                  value={step1Theme}
                  onChange={(e) => setStep1Theme(e.target.value)}
                  placeholder="例：AIによるメタ認知支援、地域活性化とSNSの関係性、学習効率を高める環境デザイン"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    💡 興味のある分野や解決したい問題を具体的に表現してみてください
                  </Typography>
                  <Chip
                    label={`${step1Theme.length} 文字`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>
              </Paper>

              {/* 思考整理エリア（メモ帳機能付き） */}
              {isMemoOpen ? (
                /* メモ帳分割表示 */
                <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                    {/* ガイダンスパネル */}
                    <Panel defaultSize={60} minSize={40} maxSize={80}>
                      <Box sx={{ height: '100%', p: 3, overflow: 'auto' }}>
                        <Typography variant="h6" gutterBottom>
                          💭 思考の整理
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          テーマを決めるために、以下について考えてみましょう
        </Typography>

                        <Stack spacing={2}>
                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom>
                                🔍 興味・関心の領域
                              </Typography>
                              <List dense>
                                <ListItem sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 20 }}>
                                    <Typography variant="body2">•</Typography>
                                  </ListItemIcon>
                                  <ListItemText primary="社会問題や身近な疑問・課題" primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                                <ListItem sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 20 }}>
                                    <Typography variant="body2">•</Typography>
                                  </ListItemIcon>
                                  <ListItemText primary="将来の夢や目標に関連するテーマ" primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                                <ListItem sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 20 }}>
                                    <Typography variant="body2">•</Typography>
                                  </ListItemIcon>
                                  <ListItemText primary="これまでに学んできた中で特に興味を持ったこと" primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                              </List>
                            </CardContent>
                          </Card>

                          <Card variant="outlined">
                            <CardContent>
                              <Typography variant="subtitle2" gutterBottom>
                                ⚡ テーマの絞り込み
                              </Typography>
                              <List dense>
                                <ListItem sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 20 }}>
                                    <Typography variant="body2">•</Typography>
                                  </ListItemIcon>
                                  <ListItemText primary="なぜそれに興味を持ったのか？" primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                                <ListItem sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 20 }}>
                                    <Typography variant="body2">•</Typography>
                                  </ListItemIcon>
                                  <ListItemText primary="その分野で解決したい問題は何か？" primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                                <ListItem sx={{ py: 0 }}>
                                  <ListItemIcon sx={{ minWidth: 20 }}>
                                    <Typography variant="body2">•</Typography>
                                  </ListItemIcon>
                                  <ListItemText primary="実際に調査・研究できそうな範囲か？" primaryTypographyProps={{ variant: 'body2' }} />
                                </ListItem>
                              </List>
                            </CardContent>
                          </Card>
                        </Stack>
                      </Box>
                    </Panel>

                    {/* リサイズハンドル */}
                    <PanelResizeHandle>
                      <Box
                        sx={{
                          width: '4px',
                          height: '100%',
                          backgroundColor: '#e0e0e0',
                          cursor: 'col-resize',
                          transition: 'background-color 0.2s',
                                                     '&:hover': {
                             backgroundColor: muiTheme.palette.primary.main,
                           },
                        }}
                      />
                    </PanelResizeHandle>

                    {/* メモ帳パネル */}
                    <Panel defaultSize={40} minSize={20} maxSize={60}>
                      <Box sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        backgroundColor: 'background.default',
                      }}>
                        {/* メモ帳ヘッダー */}
                        <Box sx={{ 
                          p: 2, 
                          borderBottom: 1, 
                          borderColor: 'divider',
                          backgroundColor: 'background.paper',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}>
                          <Typography variant="h6" fontWeight={600}>
                            📝 メモ帳
                          </Typography>
                          <IconButton onClick={() => setIsMemoOpen(false)} size="small">
                            <CloseIcon />
                          </IconButton>
                        </Box>

                        {/* メモ入力エリア */}
                        <Box sx={{ 
                          flex: 1, 
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                        }}>
                          <TextField
                            multiline
                            fullWidth
                            rows={8}
                            value={workContent}
                            onChange={(e) => setWorkContent(e.target.value)}
                            placeholder="思いついたアイデアや気になることを自由にメモしてください..."
                            variant="outlined"
                            sx={{
                              flex: 1,
                              '& .MuiOutlinedInput-root': {
                                height: '100%',
                                alignItems: 'flex-start',
                                '& textarea': {
                                  height: '100% !important',
                                  overflow: 'auto !important',
                                },
                              },
                            }}
                          />

                          {/* メモツールバー */}
                          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<SaveIcon />}
                              onClick={handleSave}
                            >
                              保存
                            </Button>
                            <Chip
                              label={`${workContent.length} 文字`}
                              size="small"
                              variant="outlined"
                            />
                          </Stack>
                        </Box>
                      </Box>
                    </Panel>
                  </PanelGroup>
                </Paper>
              ) : (
                /* ガイダンスのみ表示 */
                <Paper elevation={1} sx={{ flex: 1, p: 3, overflow: 'auto' }}>
                  <Typography variant="h6" gutterBottom>
                    💭 思考の整理（右上の「メモ帳」ボタンでメモを取りながら考えることができます）
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    テーマを決めるために、以下について考えてみましょう
          </Typography>
          
                  <Stack spacing={3}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                          🔍 興味・関心の領域
                        </Typography>
                        <List>
                          <ListItem>
                            <ListItemIcon><IdeaIcon color="primary" /></ListItemIcon>
                            <ListItemText 
                              primary="社会問題や身近な疑問・課題" 
                              secondary="環境問題、教育格差、高齢化社会など"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><GoalIcon color="primary" /></ListItemIcon>
                            <ListItemText 
                              primary="将来の夢や目標に関連するテーマ" 
                              secondary="なりたい職業や取り組みたい分野"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><ThemeIcon color="primary" /></ListItemIcon>
                            <ListItemText 
                              primary="これまでに学んできた中で特に興味を持ったこと" 
                              secondary="授業や読書、体験から得た興味"
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>

                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                          ⚡ テーマの絞り込み
                        </Typography>
                        <List>
                          <ListItem>
                            <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                            <ListItemText 
                              primary="なぜそれに興味を持ったのか？" 
                              secondary="きっかけや理由を明確にしましょう"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                            <ListItemText 
                              primary="その分野で解決したい問題は何か？" 
                              secondary="具体的な課題を見つけましょう"
                            />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                            <ListItemText 
                              primary="実際に調査・研究できそうな範囲か？" 
                              secondary="現実的に取り組める規模を考えましょう"
                            />
                          </ListItem>
                        </List>
                      </CardContent>
                    </Card>
                  </Stack>
                                 </Paper>
               )}

               {/* 次のステップボタン */}
               <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                 <Button
                   variant="contained"
                   size="large"
                   onClick={handleNext}
                   disabled={!step1Theme.trim()}
                   sx={{ minWidth: 200, py: 1.5 }}
                 >
                   次のステップへ進む
                 </Button>
               </Box>
                          </Box>
           </Box>
         ) : currentStep === 2 ? (
           /* Step2専用UI - AI対話ベースの目標設定 */
           <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
             {/* ヘッダー */}
             <Box sx={{ 
               borderBottom: 1, 
               borderColor: 'divider',
               p: 3,
               backgroundColor: 'background.paper',
             }}>
               <Typography variant="h5" fontWeight={600} gutterBottom>
                 {content?.title}
               </Typography>
               {content?.description && (
                 <Typography variant="body2" color="text.secondary">
                   {content?.description}
                 </Typography>
               )}
               {theme && (
                 <Chip 
                   label={`探究テーマ: ${theme}`} 
                   color="primary" 
                   sx={{ mt: 2 }} 
                 />
               )}
             </Box>

             {/* Step2メインコンテンツ */}
             <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
               {/* AI対話エリア（メモ帳機能付き） */}
               {isMemoOpen ? (
                 /* AI対話とメモ帳の分割表示 */
                 <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                   <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                     {/* AI対話パネル */}
                     <Panel defaultSize={60} minSize={40} maxSize={80}>
                       <AIChat
                         pageId="step2-chat"
                         title="🤖 目標設定AI"
                         initialMessage={content?.initialMessage}
                         memoContent={workContent}
                         onMessageSend={handleAIMessage}
                       />
                     </Panel>

                     {/* リサイズハンドル */}
                     <PanelResizeHandle>
                       <Box
                         sx={{
                           width: '4px',
                           height: '100%',
                           backgroundColor: '#e0e0e0',
                           cursor: 'col-resize',
                           transition: 'background-color 0.2s',
                           '&:hover': {
                             backgroundColor: muiTheme.palette.primary.main,
                           },
                         }}
                       />
                     </PanelResizeHandle>

                     {/* メモ帳パネル */}
                     <Panel defaultSize={40} minSize={20} maxSize={60}>
                       <Box sx={{ 
                         height: '100%', 
                         display: 'flex', 
                         flexDirection: 'column',
                         backgroundColor: 'background.default',
                       }}>
                         {/* メモ帳ヘッダー */}
                         <Box sx={{ 
                           p: 2, 
                           borderBottom: 1, 
                           borderColor: 'divider',
                           backgroundColor: 'background.paper',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'space-between',
                         }}>
                           <Typography variant="h6" fontWeight={600}>
                             💭 思考メモ
                           </Typography>
                           <IconButton onClick={() => setIsMemoOpen(false)} size="small">
                             <CloseIcon />
                           </IconButton>
                         </Box>

                         {/* メモ入力エリア */}
                         <Box sx={{ 
                           flex: 1, 
                           p: 2,
                           display: 'flex',
                           flexDirection: 'column',
                           gap: 2,
                         }}>
                           <TextField
                             multiline
                             fullWidth
                             rows={8}
                             value={workContent}
                             onChange={(e) => setWorkContent(e.target.value)}
                             placeholder="AIとの対話を通じて考えたことや、目標についてのアイデアを自由にメモしてください..."
                             variant="outlined"
                             sx={{
                               flex: 1,
                               '& .MuiOutlinedInput-root': {
                                 height: '100%',
                                 alignItems: 'flex-start',
                                 '& textarea': {
                                   height: '100% !important',
                                   overflow: 'auto !important',
                                 },
                               },
                             }}
                           />

                           {/* メモツールバー */}
                           <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                             <Button
                               variant="outlined"
                               size="small"
                               startIcon={<SaveIcon />}
                               onClick={handleSave}
                             >
                               保存
                             </Button>
                             <Chip
                               label={`${workContent.length} 文字`}
                               size="small"
                               variant="outlined"
                             />
                           </Stack>
                         </Box>
                       </Box>
                     </Panel>
                   </PanelGroup>
                 </Paper>
               ) : (
                 /* AI対話のみ表示 */
                 <Paper elevation={1} sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                   <AIChat
                     pageId="step2-chat"
                     title="🤖 目標設定AI（右上の「メモ帳」ボタンで思考メモを取りながら対話できます）"
                     initialMessage={content?.initialMessage}
                     memoContent={workContent}
                     onMessageSend={handleAIMessage}
                   />
                 </Paper>
               )}

               {/* 目標入力エリア */}
               <Paper elevation={1} sx={{ p: 3 }}>
                 <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                   🎯 最終的な学習目標
                 </Typography>
                 <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                   上記のAIとの対話とメモを参考に、具体的な学習目標を入力してください
                 </Typography>
                 <TextField
                   fullWidth
                   multiline
                   rows={4}
                   value={goal}
                   onChange={(e) => setGoal(e.target.value)}
                   placeholder="例：AIを活用したメタ認知支援システムの効果を検証し、学習効率向上のための具体的な手法を3ヶ月以内に提案する"
                   variant="outlined"
                   sx={{ mb: 2 }}
                 />
                 <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                   <Typography variant="caption" color="text.secondary">
                     💡 SMART原則（具体的・測定可能・達成可能・関連性・期限設定）を意識してください
                   </Typography>
                   <Chip
                     label={`${goal.length} 文字`}
                     size="small"
                     variant="outlined"
                   />
                 </Stack>
               </Paper>

               {/* 次のステップボタン */}
               <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                 <Button
                   variant="contained"
                   size="large"
                   onClick={handleNext}
                   disabled={!goal.trim()}
                   sx={{ minWidth: 200, py: 1.5 }}
                 >
                   次のステップへ進む
                 </Button>
               </Box>
             </Box>
           </Box>
         ) : (
           /* Step3以降のワークスペース */
          <WorkspaceWithAI
            pageId={`step-${currentStep}`}
            title={content?.title || 'ワークスペース'}
            description={content?.description}
            placeholder={content?.workPlaceholder || 'ここに内容を入力してください...'}
            value={workContent}
            onChange={setWorkContent}
            onSave={handleSave}
            onMessageSend={handleAIMessage}
            initialMessage={content?.initialMessage}
            aiButtonText={content?.aiButtonText}
            isAIOpen={isMemoOpen}
            onAIOpenChange={setIsMemoOpen}
            showFabButton={false}
          />
        )}
      </Box>

      {/* ナビゲーションボタン（右下に固定） */}
      <Box sx={{
        position: 'fixed',
        bottom: 24,
        left: 24,
        display: 'flex',
        gap: 2,
        zIndex: 1000,
      }}>
        {currentStep > 1 && (
            <Button
              variant="outlined"
            onClick={handlePrevious}
            sx={{ minWidth: 100 }}
            >
              前へ
            </Button>
        )}
            
        {currentStep < 4 ? (
            <Button
              variant="contained"
            onClick={handleNext}
            sx={{ minWidth: 100 }}
            >
              次へ
            </Button>
        ) : (
          <Button
            variant="contained"
            onClick={() => navigate('/home')}
            color="primary"
            sx={{ minWidth: 100 }}
          >
            完了
          </Button>
        )}
      </Box>

      {/* エラー・成功メッセージ */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            minWidth: 300,
          }}
        >
          {error}
        </Alert>
      )}

      {savedSuccessfully && (
        <Alert 
          severity="success"
          sx={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            minWidth: 300,
          }}
        >
          保存されました！
        </Alert>
      )}
          </Box>
  );
};

export default StepPage;