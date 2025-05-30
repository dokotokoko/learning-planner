// react-app/src/components/LoadingScreen.tsx
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { motion } from 'framer-motion';

const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        zIndex: 9999,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
        }}
      >
        <Typography
          variant="h3"
          sx={{
            color: 'white',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          探Qメイト
        </Typography>
        
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        >
          <CircularProgress
            size={60}
            thickness={4}
            sx={{
              color: 'white',
            }}
          />
        </motion.div>
        
        <Typography
          variant="body1"
          sx={{
            color: 'rgba(255, 255, 255, 0.8)',
            textAlign: 'center',
          }}
        >
          アプリを読み込んでいます...
        </Typography>
      </motion.div>
    </Box>
  );
};

export default LoadingScreen;