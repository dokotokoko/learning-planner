import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  Tabs,
  Tab,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Stack,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Home as HomeIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  School as SchoolIcon,
  GpsFixed as TargetIcon,
  Assignment as PlanIcon,
  Lightbulb as ThemeIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import MyTags from '../components/MyTags';
import { useAuthStore } from '../stores/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`profile-tabpanel-${index}`}
      aria-labelledby={`profile-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

  // プロフィールデータの状態管理
  const [myTags, setMyTags] = useState<string[]>([]);

  // 学習履歴データ（サンプル）
  const [learningHistory, setLearningHistory] = useState({
    themes: [] as { name: string; date: string; status: string }[],
    goals: [] as { content: string; date: string; step: number }[],
    plans: [] as { title: string; date: string; progress: number }[],
  });

  // データ読み込み
  useEffect(() => {
    loadProfileData();
    loadLearningHistory();
  }, [user]);

  const loadProfileData = async () => {
    try {
      // LocalStorageから読み込み
      const savedTags = localStorage.getItem(`user-${user?.id}-interests`);
      setMyTags(savedTags ? JSON.parse(savedTags) : []);

      // TODO: Supabaseからの読み込み
      // const response = await fetch('/api/profile', { ... });
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
      showMessage('error', 'データの読み込みに失敗しました');
    }
  };

  const loadLearningHistory = async () => {
    try {
      // 学習履歴をLocalStorageから読み込み
      const themes: { name: string; date: string; status: string }[] = [];
      const goals: { content: string; date: string; step: number }[] = [];
      const plans: { title: string; date: string; progress: number }[] = [];

      // Step1-4の履歴を読み込み
      for (let step = 1; step <= 4; step++) {
        const stepContent = localStorage.getItem(`step-${step}-content`);
        if (stepContent) {
          switch (step) {
            case 1:
              const theme = localStorage.getItem('step-1-theme');
              if (theme) {
                themes.push({
                  name: theme,
                  date: new Date().toLocaleDateString('ja-JP'),
                  status: '設定済み'
                });
              }
              break;
            case 2:
              const goal = localStorage.getItem('step-2-goal');
              if (goal) {
                goals.push({
                  content: goal,
                  date: new Date().toLocaleDateString('ja-JP'),
                  step: 2
                });
              }
              break;
            case 3:
              if (stepContent.length > 50) {
                plans.push({
                  title: `活動計画 (Step ${step})`,
                  date: new Date().toLocaleDateString('ja-JP'),
                  progress: 75
                });
              }
              break;
          }
        }
      }

      setLearningHistory({ themes, goals, plans });
    } catch (error) {
      console.error('学習履歴読み込みエラー:', error);
    }
  };

  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      // LocalStorageに保存（ユーザーIDを使用）
      localStorage.setItem(`user-${user?.id}-interests`, JSON.stringify(myTags));

      // TODO: Supabaseに保存
      // const response = await fetch('/api/profile', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ myTags }),
      // });

      showMessage('success', 'プロフィールを保存しました');
    } catch (error) {
      console.error('保存エラー:', error);
      showMessage('error', '保存に失敗しました。再試行してください。');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* ヘッダー */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon color="primary" />
            プロフィール設定
          </Typography>
          <Typography variant="body1" color="text.secondary">
            あなたの興味や関心を管理し、学習履歴を確認できます
          </Typography>
        </Box>

        {/* メッセージ表示 */}
        {message && (
          <Alert 
            severity={message.type} 
            sx={{ mb: 3 }}
            onClose={() => setMessage(null)}
          >
            {message.text}
          </Alert>
        )}

        {/* ローディング */}
        {loading && <LinearProgress sx={{ mb: 3 }} />}

        {/* タブナビゲーション */}
        <Paper elevation={1} sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab 
              label="マイタグ" 
              icon={<PersonIcon />}
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
            <Tab 
              label="過去に設定した探究テーマ" 
              icon={<HistoryIcon />}
              iconPosition="start"
              sx={{ minHeight: 64 }}
            />
          </Tabs>
        </Paper>

        {/* タブコンテンツ */}
        <TabPanel value={tabValue} index={0}>
          {/* マイタグセクション */}
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
            My Tags
          </Typography>

          {/* マイタグ */}
          <MyTags
            tags={myTags}
            onTagsChange={setMyTags}
            placeholder="例: 音楽、映画、AI、環境問題、プログラミング"
            maxTags={50}
          />

          {/* 保存ボタン */}
          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<SaveIcon />}
              onClick={handleSaveProfile}
              disabled={loading}
              sx={{ minWidth: 200, py: 1.5 }}
            >
              保存
            </Button>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          {/* 探究テーマ履歴セクション */}
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 1 }}>
            過去に設定した探究テーマ
          </Typography>

          <Stack spacing={3}>
            {/* テーマ履歴 */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ThemeIcon color="primary" />
                  探究テーマ履歴
                </Typography>
                {learningHistory.themes.length > 0 ? (
                  <List>
                    {learningHistory.themes.map((theme, index) => (
                      <ListItem key={index} divider={index < learningHistory.themes.length - 1}>
                        <ListItemIcon>
                          <Chip label={theme.status} color="primary" size="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={theme.name}
                          secondary={`設定日: ${theme.date}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    まだ探究テーマが設定されていません
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* 目標履歴 */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TargetIcon color="primary" />
                  学習目標履歴
                </Typography>
                {learningHistory.goals.length > 0 ? (
                  <List>
                    {learningHistory.goals.map((goal, index) => (
                      <ListItem key={index} divider={index < learningHistory.goals.length - 1}>
                        <ListItemIcon>
                          <Chip label={`Step ${goal.step}`} color="secondary" size="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={goal.content.length > 100 ? `${goal.content.substring(0, 100)}...` : goal.content}
                          secondary={`設定日: ${goal.date}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    まだ学習目標が設定されていません
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* 活動計画履歴 */}
            <Card elevation={2}>
              <CardContent>
                <Typography variant="h6" fontWeight={600} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlanIcon color="primary" />
                  活動計画履歴
                </Typography>
                {learningHistory.plans.length > 0 ? (
                  <List>
                    {learningHistory.plans.map((plan, index) => (
                      <ListItem key={index} divider={index < learningHistory.plans.length - 1}>
                        <ListItemIcon>
                          <Chip label={`${plan.progress}%`} color="success" size="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={plan.title}
                          secondary={
                            <Box>
                              <Typography variant="caption" display="block">
                                作成日: {plan.date}
                              </Typography>
                              <LinearProgress 
                                variant="determinate" 
                                value={plan.progress} 
                                sx={{ mt: 1, height: 6, borderRadius: 3 }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                    まだ活動計画が作成されていません
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Stack>
        </TabPanel>

        {/* ホームに戻るボタン */}
        <Divider sx={{ my: 4 }} />
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            size="large"
            startIcon={<HomeIcon />}
            onClick={() => navigate('/home')}
            sx={{ minWidth: 200, py: 1.5 }}
          >
            ホームに戻る
          </Button>
        </Box>
      </motion.div>
    </Container>
  );
};

export default ProfilePage; 