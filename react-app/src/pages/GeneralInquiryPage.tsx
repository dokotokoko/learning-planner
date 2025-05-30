// react-app/src/pages/GeneralInquiryPage.tsx
import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import { motion } from 'framer-motion';

const GeneralInquiryPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Typography variant="h4" gutterBottom fontWeight={600}>
          なんでも相談窓口
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          探究学習で困ったことがあれば、何でもお聞かせください
        </Typography>

        <Paper sx={{ p: 4 }}>
          <Typography variant="body1">
            ここでAIとの相談チャット機能が表示されます（実装予定）
          </Typography>
        </Paper>
      </motion.div>
    </Container>
  );
};

export default GeneralInquiryPage;