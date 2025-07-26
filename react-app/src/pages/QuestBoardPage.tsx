import React, { useState, useEffect } from 'react';
import { questApi, Quest, UserQuest, QuestStats } from '../lib/api';
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

// アイコンマッピング
const iconMap: Record<string, React.ReactNode> = {
  'Explore': <Explore />,
  'CameraAlt': <CameraAlt />,
  'Group': <Group />,
  'Build': <Build />,
  'Psychology': <Psychology />,
  'SpeakerNotes': <SpeakerNotes />,
  'Movie': <Movie />,
  'Science': <Science />,
  'MenuBook': <MenuBook />,
  'Public': <Public />,
  'Lightbulb': <Lightbulb />,
};

// 拡張クエスト型（Quest + ユーザー進捗情報）
interface ExtendedQuest extends Quest {
  status: 'available' | 'in_progress' | 'completed';
  progress: number;
  user_quest_id?: number;
  icon: React.ReactNode;
}

const QuestBoardPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedQuest, setSelectedQuest] = useState<ExtendedQuest | null>(null);
  const [selectedUserQuest, setSelectedUserQuest] = useState<UserQuest | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSubmissionDialog, setShowSubmissionDialog] = useState(false);
  const [submissionData, setSubmissionData] = useState({
    description: '',
    fileUrl: '',
  });
  const [reflectionData, setReflectionData] = useState<ReflectionData | null>(null);
  const [submissionStep, setSubmissionStep] = useState<'submission' | 'reflection'>('submission');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // APIから取得するデータ
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
  const [questStats, setQuestStats] = useState<QuestStats>({
    total_quests: 0,
    available_quests: 0,
    completed_quests: 0,
    in_progress_quests: 0,
    total_points: 0
  });

  // データ取得用の関数
  const loadQuestData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [questsResult, userQuestsResult, statsResult] = await Promise.all([
        questApi.getQuests(),
        questApi.getUserQuests(),
        questApi.getQuestStats()
      ]);
      
      setQuests(questsResult);
      setUserQuests(userQuestsResult);
      setQuestStats(statsResult);
    } catch (err) {
      console.error('Failed to load quest data:', err);
      setError('クエストデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestData();
  }, []);

  // クエストの統合データを作成（Quest + UserQuest）
  const getQuestWithStatus = (quest: Quest): ExtendedQuest => {
    const userQuest = userQuests.find(uq => uq.quest_id === quest.id);
    return {
      ...quest,
      status: userQuest?.status || 'available',
      progress: userQuest?.progress || 0,
      user_quest_id: userQuest?.id,
      icon: iconMap[quest.icon_name || ''] || <Explore />
    };
  };

  // クエストデータは API から取得

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

  const filteredQuests = quests.map(getQuestWithStatus).filter(quest => {
    // ステータスフィルター
    const statusMatch = selectedTab === 0 || 
      (selectedTab === 1 && quest.status === 'available') ||
      (selectedTab === 2 && quest.status === 'in_progress') ||
      (selectedTab === 3 && quest.status === 'completed');
    
    // カテゴリフィルター
    const categoryMatch = selectedCategory === 'all' || quest.category === selectedCategory;
    
    return statusMatch && categoryMatch;
  });

  const handleQuestClick = (quest: ExtendedQuest) => {
    setSelectedQuest(quest);
    const userQuest = userQuests.find(uq => uq.quest_id === quest.id);
    setSelectedUserQuest(userQuest || null);
  };

  const handleStartQuest = async () => {
    if (selectedQuest && selectedQuest.status === 'available') {
      try {
        const result = await questApi.startQuest(selectedQuest.id);
        
        // ユーザークエストリストを更新
        setUserQuests(prev => [...prev.filter(uq => uq.quest_id !== selectedQuest.id), result]);
        setSelectedUserQuest(result);
        
        // 選択中のクエストも更新
        const updatedQuest = { ...selectedQuest, status: 'in_progress' as const, progress: 0, user_quest_id: result.id };
        setSelectedQuest(updatedQuest);
      } catch (err) {
        console.error('Failed to start quest:', err);
        setError('クエストの開始に失敗しました');
      }
    }
  };

  const handleSubmitQuest = () => {
    setShowSubmissionDialog(true);
  };

  const handleSubmissionComplete = async () => {
    if (selectedQuest && selectedUserQuest && reflectionData) {
      try {
        const submitData = {
          description: submissionData.description,
          file_url: submissionData.fileUrl || undefined,
          reflection_data: reflectionData
        };
        
        const result = await questApi.submitQuest(selectedUserQuest.id, submitData);
        
        // ユーザークエストを更新
        setUserQuests(prev => prev.map(uq => 
          uq.id === selectedUserQuest.id 
            ? { ...uq, status: 'completed', progress: 100 }
            : uq
        ));
        
        // 選択中のクエストも更新
        const updatedQuest = { ...selectedQuest, status: 'completed' as const, progress: 100 };
        setSelectedQuest(updatedQuest);
        
        // ダイアログを閉じる
        setShowSubmissionDialog(false);
        setSubmissionData({
          description: '',
          fileUrl: '',
        });
        setReflectionData(null);
        setSubmissionStep('submission');
        setShowSuccessMessage(true);
        
        // 統計を再読み込み
        const newStats = await questApi.getQuestStats();
        setQuestStats(newStats);
      } catch (err) {
        console.error('Failed to submit quest:', err);
        setError('クエストの提出に失敗しました');
      }
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

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Typography>クエストデータを読み込み中...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography color="error" sx={{ textAlign: 'center' }}>{error}</Typography>
      </Container>
    );
  }

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
                label={questStats.available_quests} 
                size="small" 
                color="success" 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                進行中:
              </Typography>
              <Chip 
                label={questStats.in_progress_quests} 
                size="small" 
                color="warning" 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                完了済み:
              </Typography>
              <Chip 
                label={questStats.completed_quests} 
                size="small" 
                color="primary" 
              />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                総獲得ポイント:
              </Typography>
              <Chip 
                label={`${questStats.total_points.toLocaleString()} pt`}
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
                      {selectedQuest.required_evidence}
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
                      background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #52BAFF, #00406B)',
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
                  必要な提出物: {selectedQuest?.required_evidence}
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
                    mt: 3,
                    background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                    color: 'white',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #52BAFF, #00406B)',
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