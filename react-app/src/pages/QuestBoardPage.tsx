import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Grid, 
  Typography, 
  Tab, 
  Tabs,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Fade,
  Grow,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Rating,
  Snackbar,
  Alert,
} from '@mui/material';
import { 
  EmojiEvents,
  LocalFireDepartment,
  Psychology,
  Explore,
  Star,
  StarBorder,
  Close,
  CameraAlt,
  Description,
  Group,
  Science,
  Build,
  MenuBook,
  Movie,
  SpeakerNotes,
  Public,
  Lightbulb,
  FilterList,
  CloudUpload,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ReflectionForm, { ReflectionData } from '../components/Reflection/ReflectionForm';

// クエストの型定義
interface Quest {
  id: string;
  title: string;
  description: string;
  category: 'creative' | 'research' | 'experiment' | 'communication';
  difficulty: 1 | 2 | 3;
  points: number;
  requiredEvidence: string;
  status: 'available' | 'in_progress' | 'completed';
  progress?: number;
  icon: React.ReactNode;
}

const QuestBoardPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    description: '',
    fileUrl: '',
  });
  const [reflectionData, setReflectionData] = useState<ReflectionData | null>(null);
  const [submissionStep, setSubmissionStep] = useState<'submission' | 'reflection'>('submission');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([
    {
      id: '1',
      title: '初めての観察日記',
      description: '身の回りの何か興味深いものを3日間観察して、変化を記録してみよう！植物、天気、人の行動など、なんでもOK！',
      category: 'research',
      difficulty: 1,
      points: 1000,
      requiredEvidence: '3日分の観察記録（写真または文章）',
      status: 'available',
      icon: <Explore />,
    },
    {
      id: '2',
      title: 'アートで表現してみよう',
      description: '今の気持ちや考えを絵、コラージュ、デジタルアートなど、好きな方法で表現してみよう。正解はないから自由に！',
      category: 'creative',
      difficulty: 1,
      points: 1000,
      requiredEvidence: '作品の写真',
      status: 'available',
      icon: <CameraAlt />,
    },
    {
      id: '3',
      title: 'インタビューマスター',
      description: '興味のあるテーマについて、身近な人（家族、友達、先生など）3人にインタビューしてみよう。質問は5つ以上考えてね！',
      category: 'communication',
      difficulty: 2,
      points: 5000,
      requiredEvidence: 'インタビューの質問と回答のまとめ',
      status: 'available',
      icon: <Group />,
    },
    {
      id: '4',
      title: 'プロトタイプチャレンジ',
      description: '身の回りの問題を解決するアイデアを、ペーパーモック、段ボール、粘土などを使って形にしてみよう！',
      category: 'experiment',
      difficulty: 2,
      points: 5000,
      requiredEvidence: 'プロトタイプの写真と説明',
      status: 'in_progress',
      progress: 60,
      icon: <Build />,
    },
    {
      id: '5',
      title: 'フィールドワーク探検隊',
      description: '興味のある場所（図書館、博物館、商店街など）に実際に行って、5つ以上の発見をしてこよう！',
      category: 'research',
      difficulty: 3,
      points: 8000,
      requiredEvidence: '発見したことのレポート（写真付き）',
      status: 'available',
      icon: <Psychology />,
    },
    {
      id: '6',
      title: '1分間スピーチ・チャレンジ',
      description: '自分の好きなテーマで1分間のスピーチ動画を撮影してみよう！完璧である必要はありません。伝える練習をしよう！',
      category: 'communication',
      difficulty: 1,
      points: 1000,
      requiredEvidence: 'スピーチ動画または音声録音',
      status: 'available',
      icon: <SpeakerNotes />,
    },
    {
      id: '7',
      title: 'ドキュメンタリー制作',
      description: '身近な「面白い人」や「面白いこと」を5分以内の動画で紹介してみよう。スマホ撮影でOK！',
      category: 'creative',
      difficulty: 3,
      points: 8000,
      requiredEvidence: '制作した動画ファイル',
      status: 'available',
      icon: <Movie />,
    },
    {
      id: '8',
      title: '24時間チャレンジ実験',
      description: '何かを24時間やってみる、または24時間やめてみる実験をしよう。変化を記録してね！',
      category: 'experiment',
      difficulty: 2,
      points: 5000,
      requiredEvidence: '実験レポート（開始前・途中・終了後の記録）',
      status: 'available',
      icon: <Science />,
    },
    {
      id: '9',
      title: '地域の歴史ハンター',
      description: '自分の住んでいる地域の知られざる歴史や面白いエピソードを調べて、友達に教えられるレベルでまとめよう！',
      category: 'research',
      difficulty: 2,
      points: 5000,
      requiredEvidence: '調査レポート（参考資料も含む）',
      status: 'available',
      icon: <MenuBook />,
    },
    {
      id: '10',
      title: '世界とつながる！国際交流',
      description: '海外の人と実際に会話してみよう！オンライン言語交換、留学生との交流、SNSでの交流など方法は自由！',
      category: 'communication',
      difficulty: 3,
      points: 8000,
      requiredEvidence: '交流の記録（会話内容、学んだこと、感想）',
      status: 'completed',
      icon: <Public />,
    },
    {
      id: '11',
      title: '逆転の発想・創作',
      description: '身の回りの「当たり前」を逆転させた面白いアイデアを考えて、文章・絵・動画などで表現してみよう！',
      category: 'creative',
      difficulty: 2,
      points: 5000,
      requiredEvidence: '創作物と発想プロセスの説明',
      status: 'available',
      icon: <Lightbulb />,
    },
    {
      id: '12',
      title: 'ミニ社会実験',
      description: '興味のある社会現象について、小規模な実験や調査を行ってみよう。友達や家族の協力もOK！',
      category: 'experiment',
      difficulty: 3,
      points: 8000,
      requiredEvidence: '実験計画・実施記録・結果分析レポート',
      status: 'available',
      icon: <Psychology />,
    },
  ]);

  const categoryColors = {
    creative: '#FF6B6B',
    research: '#4ECDC4',
    experiment: '#FFE66D',
    communication: '#6C5CE7',
  };

  const categoryLabels = {
    creative: 'クリエイティブ',
    research: '調査・探究',
    experiment: '実験・プロトタイプ',
    communication: 'コミュニケーション',
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  const filteredQuests = quests.filter(quest => {
    // ステータスフィルター
    const statusMatch = selectedTab === 0 || 
      (selectedTab === 1 && quest.status === 'available') ||
      (selectedTab === 2 && quest.status === 'in_progress') ||
      (selectedTab === 3 && quest.status === 'completed');
    
    // カテゴリフィルター
    const categoryMatch = selectedCategory === 'all' || quest.category === selectedCategory;
    
    return statusMatch && categoryMatch;
  });

  const handleQuestClick = (quest: Quest) => {
    setSelectedQuest(quest);
  };

  const handleStartQuest = () => {
    if (selectedQuest) {
      setQuests(quests.map(q => 
        q.id === selectedQuest.id 
          ? { ...q, status: 'in_progress', progress: 0 }
          : q
      ));
      setSelectedQuest({ ...selectedQuest, status: 'in_progress', progress: 0 });
    }
  };

  const handleSubmitQuest = () => {
    setShowSubmissionDialog(true);
  };

  const handleSubmissionComplete = () => {
    if (selectedQuest && reflectionData) {
      setQuests(quests.map(q => 
        q.id === selectedQuest.id 
          ? { ...q, status: 'completed', progress: 100 }
          : q
      ));
      setSelectedQuest({ ...selectedQuest, status: 'completed', progress: 100 });
      setShowSubmissionDialog(false);
      setSubmissionData({
        description: '',
        fileUrl: '',
      });
      setReflectionData(null);
      setSubmissionStep('submission');
      setShowSuccessMessage(true);
    }
  };

  const handleReflectionSubmit = (data: ReflectionData) => {
    setReflectionData(data);
    setSubmissionStep('submission');
    // ここで実際の提出処理を実行
    handleSubmissionComplete();
  };

  const handleNextToReflection = () => {
    if (submissionData.description.trim()) {
      setSubmissionStep('reflection');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
            クエスト掲示板
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            リアルワールドでの体験を通じて、探究を深めよう！
          </Typography>
          
          {/* クエスト統計 */}
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                利用可能:
              </Typography>
              <Chip 
                label={quests.filter(q => q.status === 'available').length} 
                size="small" 
                color="success" 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                進行中:
              </Typography>
              <Chip 
                label={quests.filter(q => q.status === 'in_progress').length} 
                size="small" 
                color="warning" 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                完了済み:
              </Typography>
              <Chip 
                label={quests.filter(q => q.status === 'completed').length} 
                size="small" 
                color="primary" 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                総獲得ポイント:
              </Typography>
              <Chip 
                label={`${quests.filter(q => q.status === 'completed').reduce((sum, q) => sum + q.points, 0).toLocaleString()} pt`}
                size="small" 
                color="secondary"
                icon={<LocalFireDepartment />}
              />
            </Box>
          </Box>
        </Box>

        <Paper sx={{ mb: 3 }}>
          <Tabs value={selectedTab} onChange={handleTabChange} variant="fullWidth">
            <Tab label="すべて" />
            <Tab label="新着クエスト" />
            <Tab label="進行中" />
            <Tab label="完了済み" />
          </Tabs>
        </Paper>

        {/* カテゴリフィルター */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            <Typography variant="body2" color="text.secondary">
              カテゴリ:
            </Typography>
          </Box>
          <Chip
            label="すべて"
            onClick={() => setSelectedCategory('all')}
            color={selectedCategory === 'all' ? 'primary' : 'default'}
            variant={selectedCategory === 'all' ? 'filled' : 'outlined'}
          />
          <Chip
            label="クリエイティブ"
            onClick={() => setSelectedCategory('creative')}
            color={selectedCategory === 'creative' ? 'primary' : 'default'}
            variant={selectedCategory === 'creative' ? 'filled' : 'outlined'}
            sx={{
              bgcolor: selectedCategory === 'creative' ? `${categoryColors.creative}20` : 'transparent',
              color: selectedCategory === 'creative' ? categoryColors.creative : 'text.primary',
              borderColor: selectedCategory === 'creative' ? categoryColors.creative : 'divider',
            }}
          />
          <Chip
            label="調査・探究"
            onClick={() => setSelectedCategory('research')}
            color={selectedCategory === 'research' ? 'primary' : 'default'}
            variant={selectedCategory === 'research' ? 'filled' : 'outlined'}
            sx={{
              bgcolor: selectedCategory === 'research' ? `${categoryColors.research}20` : 'transparent',
              color: selectedCategory === 'research' ? categoryColors.research : 'text.primary',
              borderColor: selectedCategory === 'research' ? categoryColors.research : 'divider',
            }}
          />
          <Chip
            label="実験・プロトタイプ"
            onClick={() => setSelectedCategory('experiment')}
            color={selectedCategory === 'experiment' ? 'primary' : 'default'}
            variant={selectedCategory === 'experiment' ? 'filled' : 'outlined'}
            sx={{
              bgcolor: selectedCategory === 'experiment' ? `${categoryColors.experiment}20` : 'transparent',
              color: selectedCategory === 'experiment' ? categoryColors.experiment : 'text.primary',
              borderColor: selectedCategory === 'experiment' ? categoryColors.experiment : 'divider',
            }}
          />
          <Chip
            label="コミュニケーション"
            onClick={() => setSelectedCategory('communication')}
            color={selectedCategory === 'communication' ? 'primary' : 'default'}
            variant={selectedCategory === 'communication' ? 'filled' : 'outlined'}
            sx={{
              bgcolor: selectedCategory === 'communication' ? `${categoryColors.communication}20` : 'transparent',
              color: selectedCategory === 'communication' ? categoryColors.communication : 'text.primary',
              borderColor: selectedCategory === 'communication' ? categoryColors.communication : 'divider',
            }}
          />
        </Box>

        <Grid container spacing={3}>
          {filteredQuests.map((quest, index) => (
            <Grow
              in
              key={quest.id}
              timeout={index > 0 ? 500 + index * 100 : 500}
              style={{ transformOrigin: '0 0 0' }}
            >
              <Grid item xs={12} sm={6} md={4}>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'visible',
                      border: quest.status === 'in_progress' ? '2px solid' : 'none',
                      borderColor: 'primary.main',
                      '&::before': quest.status === 'completed' ? {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: 'inherit',
                        zIndex: 1,
                      } : {},
                    }}
                    onClick={() => handleQuestClick(quest)}
                  >
                    {quest.status === 'completed' && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: '50%',
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          zIndex: 2,
                        }}
                      >
                        <EmojiEvents sx={{ fontSize: 80, color: '#FFD700' }} />
                      </Box>
                    )}
                    
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 2,
                            bgcolor: `${categoryColors[quest.category]}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mr: 2,
                          }}
                        >
                          {quest.icon}
                        </Box>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {quest.title}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                            {[...Array(3)].map((_, i) => (
                              i < quest.difficulty ? 
                                <Star key={i} sx={{ fontSize: 16, color: '#FFD700' }} /> :
                                <StarBorder key={i} sx={{ fontSize: 16, color: '#ccc' }} />
                            ))}
                          </Box>
                        </Box>
                      </Box>

                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ mb: 2, minHeight: 60 }}
                      >
                        {quest.description}
                      </Typography>

                      {quest.status === 'in_progress' && quest.progress !== undefined && (
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="caption">進捗</Typography>
                            <Typography variant="caption">{quest.progress}%</Typography>
                          </Box>
                          <LinearProgress 
                            variant="determinate" 
                            value={quest.progress} 
                            sx={{ height: 8, borderRadius: 4 }}
                          />
                        </Box>
                      )}

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={categoryLabels[quest.category]}
                          size="small"
                          sx={{
                            bgcolor: `${categoryColors[quest.category]}20`,
                            color: categoryColors[quest.category],
                            fontWeight: 600,
                          }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocalFireDepartment sx={{ fontSize: 16, color: '#FF6B6B' }} />
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {quest.points.toLocaleString()} pt
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            </Grow>
          ))}
        </Grid>

        {/* クエスト詳細ダイアログ */}
        <Dialog
          open={selectedQuest !== null}
          onClose={() => setSelectedQuest(null)}
          maxWidth="sm"
          fullWidth
          TransitionComponent={Fade}
        >
          {selectedQuest && (
            <>
              <DialogTitle>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {selectedQuest.title}
                  </Typography>
                  <IconButton onClick={() => setSelectedQuest(null)}>
                    <Close />
                  </IconButton>
                </Box>
              </DialogTitle>
              <DialogContent>
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip
                      label={categoryLabels[selectedQuest.category]}
                      sx={{
                        bgcolor: `${categoryColors[selectedQuest.category]}20`,
                        color: categoryColors[selectedQuest.category],
                        fontWeight: 600,
                      }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {[...Array(3)].map((_, i) => (
                        i < selectedQuest.difficulty ? 
                          <Star key={i} sx={{ fontSize: 20, color: '#FFD700' }} /> :
                          <StarBorder key={i} sx={{ fontSize: 20, color: '#ccc' }} />
                      ))}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocalFireDepartment sx={{ color: '#FF6B6B' }} />
                      <Typography sx={{ fontWeight: 600 }}>
                        {selectedQuest.points.toLocaleString()} pt
                      </Typography>
                    </Box>
                  </Box>

                  <Typography variant="body1" sx={{ mb: 3 }}>
                    {selectedQuest.description}
                  </Typography>

                  <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                      <Description sx={{ fontSize: 18, verticalAlign: 'middle', mr: 1 }} />
                      提出するもの
                    </Typography>
                    <Typography variant="body2">
                      {selectedQuest.requiredEvidence}
                    </Typography>
                  </Paper>

                  {selectedQuest.status === 'in_progress' && selectedQuest.progress !== undefined && (
                    <Box sx={{ mt: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2">進捗状況</Typography>
                        <Typography variant="body2">{selectedQuest.progress}%</Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={selectedQuest.progress} 
                        sx={{ height: 10, borderRadius: 5 }}
                      />
                    </Box>
                  )}
                </Box>
              </DialogContent>
              <DialogActions sx={{ p: 3 }}>
                {selectedQuest.status === 'available' && (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleStartQuest}
                    sx={{
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #5a67d8, #6b46a0)',
                      },
                    }}
                  >
                    クエストを開始する
                  </Button>
                )}
                {selectedQuest.status === 'in_progress' && (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    onClick={handleSubmitQuest}
                    sx={{
                      background: 'linear-gradient(45deg, #48bb78, #38a169)',
                    }}
                  >
                    成果物を提出する
                  </Button>
                )}
                {selectedQuest.status === 'completed' && (
                  <Typography variant="body1" sx={{ textAlign: 'center', width: '100%' }}>
                    🎉 このクエストは完了済みです！
                  </Typography>
                )}
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* クエスト提出ダイアログ */}
        <Dialog
          open={showSubmissionDialog}
          onClose={() => setShowSubmissionDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <CloudUpload color="success" />
              <Typography variant="h5" sx={{ fontWeight: 600 }}>
                {submissionStep === 'submission' ? 'クエスト提出' : 'クエスト振り返り'}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            {submissionStep === 'submission' ? (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {selectedQuest?.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  必要な提出物: {selectedQuest?.requiredEvidence}
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="成果物の説明"
                      multiline
                      rows={4}
                      value={submissionData.description}
                      onChange={(e) => setSubmissionData({...submissionData, description: e.target.value})}
                      placeholder="作成した成果物について詳しく説明してください..."
                      variant="outlined"
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <Paper sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        📁 ファイルアップロード（実装予定）
                      </Typography>
                      <TextField
                        fullWidth
                        label="ファイルURL（写真、動画、ドキュメントなど）"
                        value={submissionData.fileUrl}
                        onChange={(e) => setSubmissionData({...submissionData, fileUrl: e.target.value})}
                        placeholder="https://..."
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                        ※ 現在は一時的にURLでの提出となります。将来的にはファイル直接アップロード機能を追加予定です。
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <ReflectionForm
                title="クエストの振り返り"
                subtitle="このクエストを通じて感じたことや学んだことを教えてください"
                context="quest"
                onSubmit={handleReflectionSubmit}
                onCancel={() => setSubmissionStep('submission')}
                showAdvanced={true}
              />
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            {submissionStep === 'submission' && (
              <>
                <Button onClick={() => setShowSubmissionDialog(false)}>
                  キャンセル
                </Button>
                <Button
                  variant="contained"
                  onClick={handleNextToReflection}
                  disabled={!submissionData.description.trim()}
                  sx={{
                    background: 'linear-gradient(45deg, #48bb78, #38a169)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #38a169, #2d7d55)',
                    },
                  }}
                >
                  次へ：振り返り
                </Button>
              </>
            )}
          </DialogActions>
        </Dialog>

        {/* 成功メッセージ */}
        <Snackbar
          open={showSuccessMessage}
          autoHideDuration={6000}
          onClose={() => setShowSuccessMessage(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert 
            onClose={() => setShowSuccessMessage(false)} 
            severity="success" 
            sx={{ width: '100%' }}
          >
            🎉 クエスト完了おめでとうございます！ {selectedQuest?.points.toLocaleString()} ポイントを獲得しました！
          </Alert>
        </Snackbar>
      </motion.div>
    </Container>
  );
};

export default QuestBoardPage; 