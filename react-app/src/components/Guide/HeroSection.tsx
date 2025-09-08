import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Psychology,
  School,
  TipsAndUpdates,
  ArrowForward,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface HeroSectionProps {
  onGetStarted: () => void;
  onLearnMore: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetStarted, onLearnMore }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const features = [
    {
      icon: <Psychology sx={{ fontSize: 48 }} />,
      title: 'AI対話サポート',
      description: 'プロジェクト文脈理解によるAI対話',
    },
    {
      icon: <School sx={{ fontSize: 48 }} />,
      title: 'プロジェクト管理',
      description: '問い・仮説設定とメモ統合管理',
    },
    {
      icon: <TipsAndUpdates sx={{ fontSize: 48 }} />,
      title: '思考フレームワーク',
      description: '11種類の思考ツールでアイデア整理',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 8,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 背景装飾 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 
            'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), ' +
            'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.1) 0%, transparent 50%), ' +
            'radial-gradient(circle at 40% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          opacity: 0.7,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        <Grid container spacing={6} alignItems="center">
          {/* メインコンテンツ */}
          <Grid item xs={12} lg={7}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Typography
                variant="h1"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                  lineHeight: 1.2,
                  mb: 3,
                }}
              >
                探Qメイト
              </Typography>
              
              <Typography
                variant="h4"
                sx={{
                  color: 'rgba(255,255,255,0.9)',
                  fontWeight: 400,
                  fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' },
                  lineHeight: 1.4,
                  mb: 4,
                }}
              >
                AIを活用した探究学習支援で
                <br />
                学びの質を変革する
              </Typography>

              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  lineHeight: 1.6,
                  mb: 5,
                  maxWidth: '600px',
                }}
              >
                探究学習の課題設定から成果発表まで、AI対話によって一人ひとりの学習者を個別にサポート。
                先生・生徒・管理職すべてにとって価値のある学習環境を提供します。
              </Typography>

              <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' } }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={onGetStarted}
                  endIcon={<ArrowForward />}
                  sx={{
                    background: 'rgba(255,255,255,0.9)',
                    color: '#006EB8',
                    '&:hover': {
                      background: 'rgba(255,255,255,1)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    },
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                  }}
                >
                  探Qメイトを始める
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onLearnMore}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.8)',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-2px)',
                    },
                    px: 4,
                    py: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                  }}
                >
                  詳しく見る
                </Button>
              </Box>
            </motion.div>
          </Grid>

          {/* 特徴アイコン */}
          <Grid item xs={12} lg={5}>
            <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
              <Grid container spacing={3}>
                {features.map((feature, index) => (
                  <Grid item xs={12} key={feature.title}>
                    <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.8, delay: index * 0.2 + 0.4 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          p: 3,
                          background: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 3,
                          border: '1px solid rgba(255,255,255,0.2)',
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            background: 'rgba(255,255,255,0.15)',
                            transform: 'translateY(-4px)',
                          },
                        }}
                      >
                        <Box
                          sx={{
                            color: 'rgba(255,255,255,0.9)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {feature.icon}
                        </Box>
                        <Box>
                          <Typography
                            variant="h6"
                            sx={{
                              color: 'white',
                              fontWeight: 600,
                              mb: 0.5,
                            }}
                          >
                            {feature.title}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              color: 'rgba(255,255,255,0.8)',
                              fontSize: '0.9rem',
                            }}
                          >
                            {feature.description}
                          </Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* モバイル・タブレット用の簡略版 */}
            <Box sx={{ display: { xs: 'block', lg: 'none' }, mt: 4 }}>
              <Grid container spacing={2}>
                {features.map((feature, index) => (
                  <Grid item xs={12} sm={4} key={feature.title}>
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: index * 0.1 + 0.4 }}
                    >
                      <Box
                        sx={{
                          textAlign: 'center',
                          p: 2,
                          background: 'rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          borderRadius: 2,
                          border: '1px solid rgba(255,255,255,0.2)',
                        }}
                      >
                        <Box sx={{ color: 'rgba(255,255,255,0.9)', mb: 1 }}>
                          {React.cloneElement(feature.icon, { sx: { fontSize: 32 } })}
                        </Box>
                        <Typography
                          variant="body2"
                          sx={{
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}
                        >
                          {feature.title}
                        </Typography>
                      </Box>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Box>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
};

export default HeroSection;