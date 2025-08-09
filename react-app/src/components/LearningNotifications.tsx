import React from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  IconButton,
  Chip,
  Alert,
  AlertTitle
} from '@mui/material';
import { 
  AccessTime, 
  Psychology, 
  LightbulbOutlined, 
  Close,
  Coffee,
  Refresh,
  EmojiEvents,
  Visibility,
  SelfImprovement,
  Psychology as PsychologyIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { NotificationData } from '../hooks/useNotifications';

interface LearningNotificationsProps {
  notifications: NotificationData[];
  onDismiss: (id: string) => void;
  onBreakTaken: () => void;
}

const LearningNotifications: React.FC<LearningNotificationsProps> = ({
  notifications,
  onDismiss,
  onBreakTaken
}) => {
  const navigate = useNavigate();

  const handleBreakAction = (id: string) => {
    onBreakTaken();
    onDismiss(id);
    // 5分タイマーを表示（簡易実装）
    alert('5分間の休憩を開始しました！\n時間になったらお知らせします。');
    setTimeout(() => {
      alert('お疲れ様でした！休憩時間が終了しました。');
    }, 5 * 60 * 1000); // 5分
  };

  const handleFrameworkGameAction = (gameType: string, id: string) => {
    onDismiss(id);
    navigate(`/framework-games/${gameType}`);
  };

  const handleQuestBoardAction = (id: string) => {
    onDismiss(id);
    // navigate('/quests'); // 一時的に非表示
    console.log('クエスト機能は一時的に利用できません');
  };

  const handleReflectionAction = (id: string) => {
    onDismiss(id);
    navigate('/profile');
  };

  const getNotificationIcon = (type: string, subType?: string) => {
    switch (type) {
      case 'time':
        return <AccessTime color="warning" />;
      case 'thinking':
        return <Psychology color="primary" />;
      case 'quest':
        return <EmojiEvents color="secondary" />;
      default:
        return <LightbulbOutlined color="info" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'warning';
      case 'info':
        return 'info';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 80,
        right: 20,
        zIndex: 1300,
        maxWidth: 400,
        width: '100%',
        '@media (max-width: 768px)': {
          right: 10,
          left: 10,
          maxWidth: 'none'
        }
      }}
    >
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{ marginBottom: 16 }}
          >
            <Alert
              severity={getNotificationColor(notification.type)}
              sx={{
                boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                borderRadius: 2,
                '& .MuiAlert-icon': {
                  fontSize: '1.5rem'
                }
              }}
              action={
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => onDismiss(notification.id)}
                >
                  <Close fontSize="small" />
                </IconButton>
              }
            >
              <AlertTitle sx={{ fontWeight: 600 }}>
                {notification.title}
              </AlertTitle>
              <Typography variant="body2" sx={{ mb: 2 }}>
                {notification.message}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {notification.action && (
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={
                      notification.action.label.includes('休憩') ? <Coffee /> :
                      notification.action.label === 'マインドマップ' ? <PsychologyIcon /> :
                      notification.action.label === '5-Whys' ? <PsychologyIcon /> :
                      notification.action.label === 'ロジックツリー' ? <PsychologyIcon /> :
                      notification.action.label.includes('振り返り') ? <SelfImprovement /> :
                      notification.action.label.includes('クエスト') ? <EmojiEvents /> :
                      <LightbulbOutlined />
                    }
                    onClick={() => {
                      const actionLabel = notification.action?.label;
                      if (actionLabel?.includes('休憩')) {
                        handleBreakAction(notification.id);
                      } else if (actionLabel === 'マインドマップ') {
                        handleFrameworkGameAction('mind-map', notification.id);
                      } else if (actionLabel === '5-Whys') {
                        handleFrameworkGameAction('5-whys', notification.id);
                      } else if (actionLabel === 'ロジックツリー') {
                        handleFrameworkGameAction('logic-tree', notification.id);
                      } else if (actionLabel?.includes('振り返り')) {
                        handleReflectionAction(notification.id);
                      } else if (actionLabel?.includes('クエスト')) {
                        handleQuestBoardAction(notification.id);
                      } else {
                        notification.action?.onClick();
                      }
                    }}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {notification.action.label}
                  </Button>
                )}
                
                {notification.secondaryAction && (
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      const secondaryLabel = notification.secondaryAction?.label;
                      if (secondaryLabel === 'マインドマップ') {
                        handleFrameworkGameAction('mind-map', notification.id);
                      } else if (secondaryLabel === '5-Whys') {
                        handleFrameworkGameAction('5-whys', notification.id);
                      } else if (secondaryLabel === 'ロジックツリー') {
                        handleFrameworkGameAction('logic-tree', notification.id);
                      } else if (secondaryLabel?.includes('クエスト')) {
                        handleQuestBoardAction(notification.id);
                      } else {
                        notification.secondaryAction?.onClick();
                      }
                    }}
                    sx={{ fontSize: '0.75rem' }}
                  >
                    {notification.secondaryAction.label}
                  </Button>
                )}
              </Box>
            </Alert>
          </motion.div>
        ))}
      </AnimatePresence>
    </Box>
  );
};

export default LearningNotifications; 