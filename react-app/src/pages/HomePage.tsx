// react-app/src/pages/HomePage.tsx
import React from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  TipsAndUpdates,
  Flag,
  Psychology,
  AutoStories,
  QuestionAnswer,
  Timeline,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import StepProgressBar from '../components/Layout/StepProgressBar';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  // TODO: 実際のデータに置き換え
  const progress = {
    currentStep: 2,
    completedSteps: [1],
    totalSteps: 4,
  };

  const quickActions = [
    {
      title: '探究を始める',
      description: 'Step 1から探究学習をスタート',
      icon: <TipsAndUpdates />,
      action: () => navigate('/step/1'),
      color: 'primary',
    },
    {
      title: '途中から続ける',
      description: '前回の続きから再開',
      icon: <Timeline />,
      action: () => navigate(`/step/${progress.currentStep}`),
      color: 'secondary',
    },
    {
      title: '相談する',
      description: '困ったことを何でも相談',
      icon: <QuestionAnswer />,
      action: () => navigate('/inquiry'),
      color: 'info',
    },
  ];

  const steps = [
    {
      number: 1,
      title: 'テーマ設定',
      description: '興味から探究テーマを決定',
      icon: <TipsAndUpdates />,
      completed: progress.completedSteps.includes(1),
    },
    {
      number: 2,
      title: 'ゴール設定',
      description: '学習目標を明確化',
      icon: <Flag />,
      completed: progress.completedSteps.includes(2),
    },
    {
      number: 3,
      title: 'アイディエーション',
      description: '活動内容を計画',
      icon: <Psychology />,
      completed: progress.completedSteps.includes(3),
    },
    {
      number: 4,
      title: 'まとめ',
      description: '成果をまとめて振り返り',
      icon: <AutoStories />,
      completed: progress.completedSteps.includes(4),
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* ウェルカムセクション */}
        <Box sx={{ mb: 6 }}>
          <Typography
            variant="h3"
            gutterBottom
            sx={{
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              backgroundClip: 'text',
              textFillColor: 'transparent',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            おかえりなさい、{user?.username}さん！
          </Typography>
          <Typography
            variant="h6"
            color="text.secondary"
            textAlign="center"
            sx={{ mt: 2 }}
          >
            今日も探究学習を進めましょう
          </Typography>
        </Box>

        {/* 進捗表示 */}
        <Card sx={{ mb: 4, overflow: 'visible' }}>
          <CardContent>
            <Typography variant="h5" gutterBottom fontWeight={600}>
              あなたの進捗
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Typography variant="body1" color="text.secondary">
                {progress.completedSteps.length} / {progress.totalSteps} ステップ完了
              </Typography>
              <Chip
                label={`現在: Step ${progress.currentStep}`}
                color="primary"
                size="small"
              />
            </Box>
            <LinearProgress
              variant="determinate"
              value={(progress.completedSteps.length / progress.totalSteps) * 100}
              sx={{ mb: 3, height: 8, borderRadius: 4 }}
            />
            <StepProgressBar 
              currentStep={progress.currentStep}
              clickable
              onStepClick={(step) => navigate(`/step/${step}`)}
            />
          </CardContent>
        </Card>

        {/* クイックアクション */}
        <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
          今日は何をしますか？
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {quickActions.map((action, index) => (
            <Grid item xs={12} md={4} key={action.title}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    },
                  }}
                  onClick={action.action}
                >
                  <CardContent sx={{ textAlign: 'center', py: 4 }}>
                    <Box
                      sx={{
                        color: `${action.color}.main`,
                        mb: 2,
                        '& svg': { fontSize: 48 },
                      }}
                    >
                      {action.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button
                      variant="contained"
                      color={action.color as any}
                      size="large"
                    >
                      開始する
                    </Button>
                  </CardActions>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* ステップ概要 */}
        <Typography variant="h5" gutterBottom fontWeight={600} sx={{ mb: 3 }}>
          探究学習の4ステップ
        </Typography>
        
        <Grid container spacing={3}>
          {steps.map((step, index) => (
            <Grid item xs={12} sm={6} md={3} key={step.number}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    border: step.completed ? '2px solid' : '1px solid',
                    borderColor: step.completed ? 'success.main' : 'divider',
                    background: step.completed
                      ? 'linear-gradient(145deg, rgba(76,175,80,0.05) 0%, rgba(76,175,80,0.1) 100%)'
                      : 'background.paper',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Box
                      sx={{
                        color: step.completed ? 'success.main' : 'text.secondary',
                        mb: 2,
                        '& svg': { fontSize: 40 },
                      }}
                    >
                      {step.icon}
                    </Box>
                    <Typography variant="h6" gutterBottom fontWeight={600}>
                      Step {step.number}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      {step.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {step.description}
                    </Typography>
                    {step.completed && (
                      <Chip
                        label="完了"
                        color="success"
                        size="small"
                        sx={{ mt: 2 }}
                      />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>
    </Container>
  );
};

export default HomePage;