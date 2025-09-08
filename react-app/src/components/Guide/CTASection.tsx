import React from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Paper,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowForward,
  PlayArrow,
  CheckCircle,
  Psychology,
  School,
  TipsAndUpdates,
  Support,
  Security,
  Speed,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface CTASectionProps {
  onGetStarted: () => void;
  onWatchDemo?: () => void;
}

const CTASection: React.FC<CTASectionProps> = ({ onGetStarted, onWatchDemo }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const quickSteps = [
    {
      step: 1,
      title: 'アカウント作成',
      description: '無料で簡単登録',
      icon: <CheckCircle sx={{ fontSize: 24 }} />,
    },
    {
      step: 2,
      title: '初回設定',
      description: '興味分野を設定',
      icon: <TipsAndUpdates sx={{ fontSize: 24 }} />,
    },
    {
      step: 3,
      title: '探究開始',
      description: 'AIと対話して学習',
      icon: <Psychology sx={{ fontSize: 24 }} />,
    },
  ];

  const guarantees = [
    {
      title: '完全無料',
      description: '基本機能はすべて無料で利用可能',
      icon: <CheckCircle sx={{ fontSize: 32 }} />,
      color: '#4CAF50',
    },
    {
      title: '即時開始',
      description: '登録後すぐに使用開始できます',
      icon: <Speed sx={{ fontSize: 32 }} />,
      color: '#2196F3',
    },
    {
      title: '安心サポート',
      description: '導入・利用サポートを提供',
      icon: <Support sx={{ fontSize: 32 }} />,
      color: '#FF9800',
    },
    {
      title: 'データ保護',
      description: '学習データは安全に保護されます',
      icon: <Security sx={{ fontSize: 32 }} />,
      color: '#9C27B0',
    },
  ];

  return (
    <Box
      sx={{
        py: { xs: 8, md: 12 },
        background: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)',
        color: 'white',
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
            'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 50%), ' +
            'radial-gradient(circle at 70% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
          opacity: 0.8,
        }}
      />

      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
        {/* メインCTAセクション */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 8, md: 10 } }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3.5rem' },
                mb: 3,
                lineHeight: 1.2,
              }}
            >
              今すぐ探究学習を
              <br />
              変革しませんか？
            </Typography>
            
            <Typography
              variant="h6"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem', md: '1.3rem' },
                opacity: 0.9,
                maxWidth: 700,
                mx: 'auto',
                lineHeight: 1.6,
                mb: 5,
              }}
            >
              AIを活用した個別最適化で、すべての学習者が探究の楽しさを実感できます。
              無料で今すぐ始めて、学びの新しい可能性を発見しましょう。
            </Typography>

            <Box
              sx={{
                display: 'flex',
                gap: { xs: 2, sm: 4 },
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'center',
                alignItems: 'center',
                mb: 6,
              }}
            >
              <Button
                variant="contained"
                size="large"
                onClick={onGetStarted}
                endIcon={<ArrowForward />}
                sx={{
                  background: 'rgba(255,255,255,0.95)',
                  color: '#006EB8',
                  '&:hover': {
                    background: 'rgba(255,255,255,1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                  },
                  px: { xs: 4, sm: 6 },
                  py: { xs: 2, sm: 2.5 },
                  fontSize: { xs: '1.1rem', sm: '1.3rem' },
                  fontWeight: 700,
                  borderRadius: 3,
                  transition: 'all 0.3s ease',
                  minWidth: { xs: '280px', sm: '320px' },
                }}
              >
                探Qメイトを始める
              </Button>
              
              {onWatchDemo && (
                <Button
                  variant="outlined"
                  size="large"
                  onClick={onWatchDemo}
                  startIcon={<PlayArrow />}
                  sx={{
                    color: 'white',
                    borderColor: 'rgba(255,255,255,0.8)',
                    '&:hover': {
                      borderColor: 'white',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      transform: 'translateY(-2px)',
                    },
                    px: { xs: 4, sm: 5 },
                    py: { xs: 2, sm: 2.5 },
                    fontSize: { xs: '1rem', sm: '1.1rem' },
                    fontWeight: 600,
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    minWidth: { xs: '200px', sm: '240px' },
                  }}
                >
                  デモを見る
                </Button>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label="完全無料"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  px: 1,
                }}
              />
              <Chip
                label="即時開始"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  px: 1,
                }}
              />
              <Chip
                label="サポート付き"
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  px: 1,
                }}
              />
            </Box>
          </Box>
        </motion.div>

        {/* 簡単開始ステップ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Box sx={{ mb: { xs: 8, md: 10 } }}>
            <Typography
              variant="h4"
              sx={{
                textAlign: 'center',
                fontWeight: 600,
                fontSize: { xs: '1.5rem', sm: '2rem' },
                mb: 6,
                opacity: 0.95,
              }}
            >
              3分で始められます
            </Typography>

            <Grid container spacing={{ xs: 3, md: 4 }} justifyContent="center">
              {quickSteps.map((step, index) => (
                <Grid item xs={12} sm={4} md={3} key={step.step}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                  >
                    <Paper
                      elevation={0}
                      sx={{
                        p: 3,
                        textAlign: 'center',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: 3,
                        color: 'white',
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          backgroundColor: 'rgba(255,255,255,0.15)',
                          transform: 'translateY(-4px)',
                        },
                      }}
                    >
                      <Box
                        sx={{
                          width: 60,
                          height: 60,
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          mx: 'auto',
                          mb: 2,
                        }}
                      >
                        {step.icon}
                      </Box>
                      
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          fontSize: { xs: '1rem', sm: '1.1rem' },
                        }}
                      >
                        {step.title}
                      </Typography>
                      
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.9,
                          fontSize: { xs: '0.85rem', sm: '0.9rem' },
                        }}
                      >
                        {step.description}
                      </Typography>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>
        </motion.div>

        {/* 安心・保証セクション */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                textAlign: 'center',
                fontWeight: 600,
                fontSize: { xs: '1.2rem', sm: '1.5rem' },
                mb: 6,
                opacity: 0.95,
              }}
            >
              安心してご利用いただけます
            </Typography>

            <Grid container spacing={ { xs: 2, md: 3 } }>
              {guarantees.map((guarantee, index) => (
                <Grid item xs={6} md={3} key={guarantee.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.1 * index }}
                  >
                    <Box
                      sx={{
                        textAlign: 'center',
                        p: { xs: 2, md: 3 },
                      }}
                    >
                      <Box
                        sx={{
                          color: guarantee.color,
                          mb: 2,
                          filter: 'brightness(1.3)',
                        }}
                      >
                        {guarantee.icon}
                      </Box>
                      
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 600,
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                          mb: 1,
                        }}
                      >
                        {guarantee.title}
                      </Typography>
                      
                      <Typography
                        variant="body2"
                        sx={{
                          opacity: 0.8,
                          fontSize: { xs: '0.75rem', sm: '0.85rem' },
                          lineHeight: 1.4,
                        }}
                      >
                        {guarantee.description}
                      </Typography>
                    </Box>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default CTASection;