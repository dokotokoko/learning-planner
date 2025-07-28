import React, { useState, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Button, 
  Card, 
  CardContent,
  Grid,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import { 
  AccessTime, 
  Psychology, 
  EmojiEvents,
  Notifications,
  NotificationsActive
} from '@mui/icons-material';
import AIChat from '../components/MemoChat/AIChat';
import SmartNotificationManager, { SmartNotificationManagerRef } from '../components/SmartNotificationManager';
import LearningNotifications from '../components/LearningNotifications';
import { useNotifications } from '../hooks/useNotifications';
import { AI_INITIAL_MESSAGE } from '../constants/aiMessages';

const NotificationDemoPage: React.FC = () => {
  const [demoStep, setDemoStep] = useState(0);
  const { notifications, showNotification, removeNotification, requestBrowserPermission, browserPermission } = useNotifications();
  const notificationRef = useRef<SmartNotificationManagerRef>(null);

  const handleBreakTaken = () => {
    // SmartNotificationManagerに休憩を記録
    notificationRef.current?.recordBreak();
  };

  const handleManualTrigger = () => {
    switch (demoStep) {
      case 0:
        // 時間経過による通知をテスト
        showNotification({
          type: 'warning',
          title: '🌟 小休憩のススメ',
          message: '45分間集中されていますね！5分間の休憩で効率アップしませんか？',
          persistent: true,
          action: {
            label: '5分休憩',
            onClick: () => {
              alert('休憩を開始しました！');
              handleBreakTaken();
            }
          },
          secondaryAction: {
            label: '続ける',
            onClick: () => alert('学習を続けます！')
          }
        });
        break;

      case 1:
        // 思考停滞の通知をテスト
        showNotification({
          type: 'info',
          title: '🔄 思考の整理提案',
          message: '同じような内容が続いています。フレームワークで思考を整理してみませんか？',
          persistent: true,
          action: {
            label: 'マインドマップ',
            onClick: () => alert('マインドマップゲームに移動します！')
          },
          secondaryAction: {
            label: '5-Whys',
            onClick: () => alert('5-Whysゲームに移動します！')
          }
        });
        break;

      case 2:
        // クエスト提案の通知をテスト
        const questSuggestions = [
          '初めての観察日記',
          'アートで表現してみよう',
          'インタビューマスター',
          '1分間スピーチ・チャレンジ'
        ];
        const randomQuest = questSuggestions[Math.floor(Math.random() * questSuggestions.length)];
        
        showNotification({
          type: 'success',
          title: '🎯 新しいクエストに挑戦！',
          message: `「${randomQuest}」など、面白いクエストに挑戦して探究を深めてみませんか？`,
          persistent: true,
          action: {
            label: 'クエストボードを見る',
            onClick: () => {}
          },
          secondaryAction: {
            label: '後で',
            onClick: () => {}
          }
        });
        break;
    }
    setDemoStep((prev) => (prev + 1) % 3);
  };

  const simulateUserActivity = () => {
    const messages = [
      'わからない、どうしよう',
      '複雑で整理できない',
      'でも、それでも、やっぱり同じことを繰り返している',
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    notificationRef.current?.recordActivity(randomMessage, 'user');
    
    setTimeout(() => {
      notificationRef.current?.recordActivity('AIからの応答です', 'ai');
    }, 1000);
  };

  const demoSteps = [
    { label: '時間経過通知', icon: <AccessTime />, color: 'warning' },
    { label: '思考停滞通知', icon: <Psychology />, color: 'info' },
    { label: 'クエスト提案', icon: <EmojiEvents />, color: 'success' },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        🔔 スマート通知システム デモ
      </Typography>
      <Typography variant="body1" color="text.secondary" align="center" paragraph>
        探究学習支援アプリの通知機能をテストできます
      </Typography>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                🎮 通知デモ
              </Typography>
              
              {/* ブラウザ通知許可 */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  ブラウザ通知の許可状態: 
                  <Chip 
                    label={browserPermission} 
                    color={browserPermission === 'granted' ? 'success' : 'warning'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </Typography>
                {browserPermission !== 'granted' && (
                  <Button 
                    size="small" 
                    onClick={requestBrowserPermission}
                    startIcon={<Notifications />}
                  >
                    ブラウザ通知を許可
                  </Button>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 通知トリガーボタン */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  手動通知トリガー:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                  {demoSteps.map((step, index) => (
                    <Chip
                      key={index}
                      icon={step.icon}
                      label={step.label}
                      color={demoStep === index ? step.color as any : 'default'}
                      variant={demoStep === index ? 'filled' : 'outlined'}
                    />
                  ))}
                </Box>
                <Button
                  variant="contained"
                  onClick={handleManualTrigger}
                  startIcon={<NotificationsActive />}
                  fullWidth
                >
                  {demoSteps[demoStep].label}をテスト
                </Button>
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* 学習活動シミュレーション */}
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  学習活動シミュレーション:
                </Typography>
                <Button
                  variant="outlined"
                  onClick={simulateUserActivity}
                  fullWidth
                >
                  思考停滞メッセージを送信
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* 機能説明 */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                📋 実装済み機能
              </Typography>
              <Box component="ul" sx={{ pl: 2 }}>
                <li>
                  <Typography variant="body2">
                    <strong>時間経過通知:</strong> 45分以上の学習で休憩提案
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>思考停滞検出:</strong> キーワード分析で停滞を検出
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>クエスト提案:</strong> QuestBoardの実際のクエストを提案
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>ブラウザ通知:</strong> ページが非アクティブ時の通知
                  </Typography>
                </li>
                <li>
                  <Typography variant="body2">
                    <strong>通知クールダウン:</strong> 同じ種類の通知の頻度制限
                  </Typography>
                </li>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: 600 }}>
            <CardContent sx={{ height: '100%', p: 1 }}>
              <Typography variant="h6" gutterBottom sx={{ px: 2 }}>
                💬 AIチャット（通知機能付き）
              </Typography>
              <Box sx={{ height: 'calc(100% - 40px)' }}>
                <AIChat
                  pageId="notification-demo"
                  title="通知デモ"
                  initialMessage={AI_INITIAL_MESSAGE}
                  enableSmartNotifications={true}
                  loadHistoryFromDB={false}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 隠れた通知システム */}
      <SmartNotificationManager
        ref={notificationRef}
        pageId="notification-demo"
      />

      {/* デモ用通知表示 */}
      <LearningNotifications
        notifications={notifications}
        onDismiss={removeNotification}
        onBreakTaken={handleBreakTaken}
      />

      {/* 使用方法の説明 */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="body2">
          <strong>使い方:</strong><br />
          1. ブラウザ通知を許可してください<br />
          2. 手動トリガーボタンで各種通知をテストできます<br />
          3. 通知のボタンをクリックすると適切なページに遷移します<br />
          4. AIチャットで実際の会話を行い、自動通知を体験してください<br />
          5. ページを別タブに切り替えるとブラウザ通知が表示されます
        </Typography>
      </Alert>
    </Container>
  );
};

export default NotificationDemoPage; 