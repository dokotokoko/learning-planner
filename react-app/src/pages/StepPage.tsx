// react-app/src/pages/StepPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { Container, Box, Typography, Paper, Button } from '@mui/material';
import { motion } from 'framer-motion';
import StepProgressBar from '../components/Layout/StepProgressBar';

const StepPage: React.FC = () => {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const currentStep = parseInt(stepNumber || '1');

  const stepContent = {
    1: {
      title: 'Step 1: テーマ設定',
      description: '興味から探究テーマを決めましょう',
      content: 'ここでテーマ設定のフォームが表示されます（実装予定）',
    },
    2: {
      title: 'Step 2: ゴール設定',
      description: '学習目標を明確にしましょう',
      content: 'ここでゴール設定の対話機能が表示されます（実装予定）',
    },
    3: {
      title: 'Step 3: アイディエーション',
      description: '活動内容を計画しましょう',
      content: 'ここでアイディエーション機能が表示されます（実装予定）',
    },
    4: {
      title: 'Step 4: まとめ',
      description: '成果をまとめて振り返りましょう',
      content: 'ここでまとめ機能が表示されます（実装予定）',
    },
  };

  const content = stepContent[currentStep as keyof typeof stepContent];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Typography variant="h4" gutterBottom fontWeight={600}>
          {content?.title}
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          {content?.description}
        </Typography>

        <StepProgressBar currentStep={currentStep} />

        <Paper sx={{ p: 4, mt: 4 }}>
          <Typography variant="body1" sx={{ mb: 3 }}>
            {content?.content}
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between' }}>
            <Button
              variant="outlined"
              disabled={currentStep === 1}
              onClick={() => window.history.back()}
            >
              前へ
            </Button>
            
            <Button
              variant="contained"
              disabled={currentStep === 4}
            >
              次へ
            </Button>
          </Box>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default StepPage;