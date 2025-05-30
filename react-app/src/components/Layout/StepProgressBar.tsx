import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { motion } from 'framer-motion';
import { 
  TipsAndUpdates, 
  Flag, 
  Psychology, 
  AutoStories 
} from '@mui/icons-material';

interface StepProgressBarProps {
  currentStep: number;
  onStepClick?: (step: number) => void;
  clickable?: boolean;
}

interface StepData {
  number: number;
  label: string;
  title: string;
  icon: React.ReactNode;
  description: string;
}

const steps: StepData[] = [
  {
    number: 1,
    label: 'Step 1',
    title: 'テーマ設定',
    icon: <TipsAndUpdates />,
    description: '興味から探究テーマを決定',
  },
  {
    number: 2,
    label: 'Step 2', 
    title: 'ゴール設定',
    icon: <Flag />,
    description: '学習目標を明確化',
  },
  {
    number: 3,
    label: 'Step 3',
    title: 'アイディエーション',
    icon: <Psychology />,
    description: '活動内容を計画',
  },
  {
    number: 4,
    label: 'Step 4',
    title: 'まとめ',
    icon: <AutoStories />,
    description: '成果をまとめて振り返り',
  },
];

const StepProgressBar: React.FC<StepProgressBarProps> = ({ 
  currentStep, 
  onStepClick,
  clickable = false 
}) => {
  const theme = useTheme();

  const getStepStatus = (stepNumber: number) => {
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'active';
    return 'upcoming';
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'active':
        return theme.palette.primary.main;
      case 'upcoming':
        return theme.palette.grey[400];
      default:
        return theme.palette.grey[400];
    }
  };

  return (
    <Box sx={{ py: 4, px: 2 }}>
      {/* デスクトップ版：横並び */}
      <Box 
        sx={{ 
          display: { xs: 'none', md: 'flex' },
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: 800,
          mx: 'auto',
        }}
      >
        {/* 背景のライン */}
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '12.5%',
            right: '12.5%',
            height: 4,
            backgroundColor: theme.palette.grey[200],
            borderRadius: 2,
            zIndex: 1,
          }}
        />

        {/* アクティブなラインのアニメーション */}
        <motion.div
          style={{
            position: 'absolute',
            top: '50%',
            left: '12.5%',
            height: 4,
            backgroundColor: theme.palette.primary.main,
            borderRadius: 2,
            zIndex: 2,
            transformOrigin: 'left',
            transform: 'translateY(-50%)',
          }}
          initial={{ width: 0 }}
          animate={{ 
            width: `${Math.max(0, ((currentStep - 1) / (steps.length - 1)) * 75)}%` 
          }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        {steps.map((step, index) => {
          const status = getStepStatus(step.number);
          const isClickable = clickable && status !== 'upcoming';

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              style={{ 
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 3,
                cursor: isClickable ? 'pointer' : 'default',
              }}
              onClick={() => isClickable && onStepClick?.(step.number)}
              whileHover={isClickable ? { scale: 1.05 } : {}}
              whileTap={isClickable ? { scale: 0.95 } : {}}
            >
              {/* 円形アイコン */}
              <motion.div
                style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: getStepColor(status),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  marginBottom: 12,
                  boxShadow: status === 'active' ? `0 0 20px ${theme.palette.primary.main}40` : '0 2px 10px rgba(0,0,0,0.1)',
                }}
                animate={{
                  scale: status === 'active' ? [1, 1.1, 1] : 1,
                }}
                transition={{
                  repeat: status === 'active' ? Infinity : 0,
                  repeatType: 'reverse',
                  duration: 2,
                }}
              >
                {step.icon}
              </motion.div>

              {/* ステップ情報 */}
              <Box sx={{ textAlign: 'center', maxWidth: 120 }}>
                <Typography 
                  variant="caption" 
                  color={status === 'upcoming' ? 'text.secondary' : 'primary'}
                  fontWeight={600}
                  display="block"
                >
                  {step.label}
                </Typography>
                <Typography 
                  variant="body2" 
                  color={status === 'upcoming' ? 'text.secondary' : 'text.primary'}
                  fontWeight={status === 'active' ? 600 : 400}
                  sx={{ mt: 0.5 }}
                >
                  {step.title}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ mt: 0.5, display: 'block', lineHeight: 1.2 }}
                >
                  {step.description}
                </Typography>
              </Box>
            </motion.div>
          );
        })}
      </Box>

      {/* モバイル版：縦並び */}
      <Box sx={{ display: { xs: 'block', md: 'none' } }}>
        {steps.map((step, index) => {
          const status = getStepStatus(step.number);
          const isClickable = clickable && status !== 'upcoming';
          const isLast = index === steps.length - 1;

          return (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
            >
              <Box 
                sx={{ 
                  display: 'flex',
                  alignItems: 'flex-start',
                  position: 'relative',
                  cursor: isClickable ? 'pointer' : 'default',
                  '&:hover': isClickable ? {
                    '& .step-circle': {
                      transform: 'scale(1.1)',
                    },
                  } : {},
                }}
                onClick={() => isClickable && onStepClick?.(step.number)}
              >
                {/* 左側：アイコンとライン */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 3 }}>
                  <motion.div
                    className="step-circle"
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: '50%',
                      backgroundColor: getStepColor(status),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      transition: 'all 0.3s ease',
                      boxShadow: status === 'active' ? `0 0 20px ${theme.palette.primary.main}40` : '0 2px 10px rgba(0,0,0,0.1)',
                    }}
                    animate={{
                      scale: status === 'active' ? [1, 1.05, 1] : 1,
                    }}
                    transition={{
                      repeat: status === 'active' ? Infinity : 0,
                      repeatType: 'reverse', 
                      duration: 2,
                    }}
                  >
                    {step.icon}
                  </motion.div>

                  {/* 縦のライン */}
                  {!isLast && (
                    <Box
                      sx={{
                        width: 2,
                        height: 40,
                        backgroundColor: status === 'completed' ? theme.palette.primary.main : theme.palette.grey[300],
                        mt: 2,
                        transition: 'all 0.3s ease',
                      }}
                    />
                  )}
                </Box>

                {/* 右側：コンテンツ */}
                <Box sx={{ flex: 1, pb: !isLast ? 3 : 0 }}>
                  <Typography 
                    variant="caption" 
                    color={status === 'upcoming' ? 'text.secondary' : 'primary'}
                    fontWeight={600}
                    display="block"
                  >
                    {step.label}
                  </Typography>
                  <Typography 
                    variant="h6" 
                    color={status === 'upcoming' ? 'text.secondary' : 'text.primary'}
                    fontWeight={status === 'active' ? 600 : 500}
                    sx={{ mt: 0.5 }}
                  >
                    {step.title}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mt: 1, lineHeight: 1.4 }}
                  >
                    {step.description}
                  </Typography>
                </Box>
              </Box>
            </motion.div>
          );
        })}
      </Box>
    </Box>
  );
};

export default StepProgressBar; 