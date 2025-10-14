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
        background: 'linear-gradient(135deg, #FFB347 0%, #FF8A65 100%)',
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
        <Grid container spacing={6} direction="column" alignItems="center">
          {/* メインコンテンツ */}
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Typography
                  variant="h1"
                  sx={{
                    color: 'white',
                    fontWeight: 800,
                    fontSize: { xs: '2.5rem', sm: '3.5rem', md: '4rem' },
                    textShadow: '2px 2px 8px rgba(0,0,0,0.1)',
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
                    fontWeight: 500,
                    fontSize: { xs: '1.2rem', sm: '1.5rem', md: '1.8rem' },
                    lineHeight: 1.4,
                    mb: 4,
                  }}
                >
                  AIとの対話で自分の考えを言葉にしながら
                  <br />
                  楽しく探究を前に進めよう
                </Typography>

                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={onGetStarted}
                    endIcon={<ArrowForward />}
                    sx={{
                      background: 'linear-gradient(45deg, #FFF3E0, #FFCC80)',
                      color: '#D84315',
                      boxShadow: '0 4px 15px rgba(255,183,77,0.4)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #FFCC80, #FFB74D)',
                        transform: 'translateY(-2px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      },
                      px: 4,
                      py: 2,
                      fontSize: '1.1rem',
                      fontWeight: 700,
                      borderRadius: 25,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    探究を始める
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
                      borderRadius: 25,
                      transition: 'all 0.3s ease',
                    }}
                  >
                    詳しく見る
                  </Button>
                </Box>
              </Box>
            </motion.div>
          </Grid>

          {/* アプリケーション画面の画像 */}
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <Box
                sx={{
                  maxWidth: { xs: '100%', sm: '600px', md: '800px' },
                  mx: 'auto',
                  position: 'relative',
                  borderRadius: 0,
                  overflow: 'hidden',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                  background: 'rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  p: { xs: 1, sm: 2 },
                }}
              >
                {/* メインのアプリケーション画面 */}
                <Box
                  component="img"
                  src="/images/app-screenshot-main.png"
                  alt="探Qメイトのメイン画面"
                  loading="lazy"
                  sx={{
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                  }}
                  onError={(e) => {
                    // 画像が存在しない場合のフォールバック
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div style="
                        background: linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.1) 100%);
                        border-radius: 0px;
                        padding: 40px;
                        text-align: center;
                        min-height: 300px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex-direction: column;
                      ">
                        <div style="color: rgba(255,255,255,0.9); font-size: 1.2rem; font-weight: 600; margin-bottom: 20px;">
                          アプリケーション画面プレビュー
                        </div>
                        <div style="color: rgba(255,255,255,0.7); font-size: 0.9rem; line-height: 1.6;">
                          実際の探Qメイトの画面がここに表示されます<br>
                          /public/images/app-screenshot-main.png に画像を配置してください
                        </div>
                      </div>
                    `;
                  }}
                />
              </Box>
            </motion.div>
          </Grid>

        </Grid>
        
        {/* モバイル・タブレット用の機能表示 */}
        <Box sx={{ display: { xs: 'block', lg: 'none' }, mt: 6 }}>
          <Grid container spacing={2}>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
};

export default HeroSection;