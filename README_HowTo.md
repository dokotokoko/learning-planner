# How to use This App

This document is a compilation of the components in `react-app/src/components/Guide`.

---

## `react-app/src/components/Guide/CTASection.tsx`

```tsx
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
```

---

## `react-app/src/components/Guide/HeroSection.tsx`

```tsx
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
```

---

## `react-app/src/components/Guide/HowToUseSection.tsx`

```tsx
import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Psychology,
  Assignment,
  Chat,
  TipsAndUpdates,
  PlayArrow,
  CheckCircle,
  ArrowForward,
  Lightbulb,
  AutoStories,
  Assessment,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const HowToUseSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const steps = [
    {
      number: 1,
      title: 'プロジェクト作成',
      subtitle: 'テーマを決めてスタート',
      description: 'ダッシュボードから新しい探究プロジェクトを作成し、興味のあるテーマを設定します。',
      features: [
        'テーマの設定',
        'プロジェクトの作成',
        'AIアシスタントとの対話',
        '探究の方向性の相談',
      ],
      icon: <Lightbulb sx={{ fontSize: 48 }} />,
      bgColor: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
      example: 'ダッシュボード→「新しいプロジェクト」→テーマを入力してプロジェクト作成',
    },
    {
      number: 2,
      title: '問いと仮説を設定',
      subtitle: '探究を深める準備',
      description: 'プロジェクトページで具体的な問いと仮説を設定し、探究の方向性を明確にします。',
      features: [
        '問いの設定',
        '仮説の構築',
        'インライン編集',
        'AIからのアドバイス',
      ],
      icon: <Assignment sx={{ fontSize: 48 }} />,
      bgColor: 'linear-gradient(135deg, #4ECDC4 0%, #67E6DC 100%)',
      example: 'プロジェクトページで問いと仮説の欄をクリックして編集・保存',
    },
    {
      number: 3,
      title: 'メモで記録・整理',
      subtitle: 'アイデアと調査を蓄積',
      description: 'メモ機能を使って調査内容やアイデアを記録し、AIチャットで対話しながら探究を深めます。',
      features: [
        'Markdown対応メモ',
        '自動保存機能',
        'AIチャット連携',
        '思考フレームワーク活用',
      ],
      icon: <Psychology sx={{ fontSize: 48 }} />,
      bgColor: 'linear-gradient(135deg, #A8E6CF 0%, #C1E6CF 100%)',
      example: 'メモ作成→内容記録→AIチャットで相談→思考フレームワークで整理',
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.paper' }}>
      <Container maxWidth="lg">
        {/* セクションタイトル */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 10 } }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                mb: 2,
                background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              どう使うか？
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              3つのステップで始める探究学習
            </Typography>
            <Chip
              label="すぐに始められる"
              color="primary"
              sx={{
                fontWeight: 600,
                px: 2,
                py: 1,
                fontSize: '0.9rem',
              }}
            />
          </Box>
        </motion.div>

        {/* ステップ */}
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 * index }}
          >
            <Box sx={{ mb: { xs: 8, md: 12 } }}>
              <Grid
                container
                spacing={{ xs: 4, md: 6 }}
                alignItems="center"
                direction={{ xs: 'column', md: index % 2 === 0 ? 'row' : 'row-reverse' }}
              >
                {/* コンテンツ側 */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    textAlign: { xs: 'center', md: index % 2 === 0 ? 'left' : 'right' },
                    pr: { md: index % 2 === 0 ? 4 : 0 },
                    pl: { md: index % 2 === 0 ? 0 : 4 },
                  }}>
                    {/* ステップ番号 */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: step.bgColor,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        mb: 3,
                        position: 'relative',
                      }}
                    >
                      {step.number}
                      {index < steps.length - 1 && (
                        <Box
                          sx={{
                            display: { xs: 'none', md: 'block' },
                            position: 'absolute',
                            [index % 2 === 0 ? 'right' : 'left']: -80,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'text.secondary',
                          }}
                        >
                          <ArrowForward sx={{ fontSize: 32 }} />
                        </Box>
                      )}
                    </Box>

                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 600,
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                        mb: 1,
                      }}
                    >
                      {step.title}
                    </Typography>
                    
                    <Typography
                      variant="h6"
                      color="primary"
                      sx={{
                        fontWeight: 500,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        mb: 3,
                      }}
                    >
                      {step.subtitle}
                    </Typography>

                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        lineHeight: 1.7,
                        mb: 4,
                      }}
                    >
                      {step.description}
                    </Typography>

                    {/* 特徴リスト */}
                    <Box sx={{ mb: 4 }}>
                      {step.features.map((feature, featureIndex) => (
                        <Box
                          key={featureIndex}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1.5,
                            justifyContent: { xs: 'center', md: index % 2 === 0 ? 'flex-start' : 'flex-end' },
                          }}
                        >
                          <CheckCircle
                            sx={{
                              color: 'success.main',
                              fontSize: 20,
                              mr: index % 2 === 0 ? 1.5 : 0,
                              ml: index % 2 === 0 ? 0 : 1.5,
                              order: { xs: 1, md: index % 2 === 0 ? 1 : 2 },
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: { xs: '0.85rem', sm: '0.9rem' },
                              order: { xs: 2, md: index % 2 === 0 ? 2 : 1 },
                            }}
                          >
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* 実例 */}
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        backgroundColor: 'rgba(5, 155, 255, 0.05)',
                        border: '1px solid rgba(5, 155, 255, 0.1)',
                        borderRadius: 3,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: '0.8rem', sm: '0.85rem' },
                          lineHeight: 1.6,
                          fontStyle: 'italic',
                          color: 'text.secondary',
                        }}
                      >
                        <strong>実例:</strong> {step.example}
                      </Typography>
                    </Paper>
                  </Box>
                </Grid>

                {/* ビジュアル側 */}
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={8}
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      background: step.bgColor,
                      color: 'white',
                      borderRadius: 4,
                      minHeight: { xs: 300, md: 400 },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 背景装飾 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -30,
                        left: -30,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    />

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      {step.icon}
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 600,
                          mt: 3,
                          mb: 2,
                          fontSize: { xs: '1.2rem', sm: '1.5rem' },
                        }}
                      >
                        ステップ {step.number}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.9,
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                        }}
                      >
                        {step.subtitle}
                      </Typography>
                      
                      <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        sx={{
                          mt: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          borderRadius: 2,
                          px: 3,
                        }}
                      >
                        詳しく見る
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </motion.div>
        ))}

        {/* 続けて学習の流れ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mt: { xs: 8, md: 10 } }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 4, md: 6 },
                background: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)',
                color: 'white',
                borderRadius: 4,
              }}
            >
              <AutoStories sx={{ fontSize: 48, mb: 3 }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  fontSize: { xs: '1.2rem', sm: '1.5rem' },
                }}
              >
                継続的な学習サイクル
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.9,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  maxWidth: 600,
                  mx: 'auto',
                }}
              >
                これらの3ステップを繰り返すことで、探究スキルが自然と身につき、
                深い学びと創造的思考力を育成できます。
              </Typography>
            </Paper>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HowToUseSection;
```

---

## `react-app/src/components/Guide/ResultsSection.tsx`

```tsx
import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  Avatar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp,
  Assessment,
  AutoStories,
  Share,
  EmojiEvents,
  Psychology,
  School,
  CheckCircle,
  Star,
  Timeline,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const ResultsSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const results = [
    {
      title: '学習履歴の可視化',
      description: '対話履歴、学習時間、成果物が自動的に記録・整理されます',
      icon: <Timeline sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
      features: [
        '対話履歴の自動保存',
        '学習時間の記録',
        'プロジェクト進捗の追跡',
        '成果物の整理',
      ],
    },
    {
      title: '成長の実感',
      description: 'スキルの向上や探究力の成長を数値とグラフで実感できます',
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: '#2196F3',
      features: [
        '探究スキルの可視化',
        '成長グラフの表示',
        '達成目標の設定',
        'マイルストーンの確認',
      ],
    },
    {
      title: '成果の共有',
      description: '探究成果を効果的に整理・共有し、学習コミュニティで活用',
      icon: <Share sx={{ fontSize: 40 }} />,
      color: '#FF9800',
      features: [
        'ポートフォリオ作成',
        '発表資料の生成',
        '学習成果の共有',
        'フィードバック収集',
      ],
    },
  ];

  // 利用者の声は実際のユーザーデータがないため削除

  const mockData = {
    projectsCompleted: 12,
    learningHours: 48,
    skillGrowth: 85,
    aiInteractions: 156,
  };

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        {/* セクションタイトル */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                mb: 2,
                background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              結果の見え方
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              学習成果を可視化して、成長を実感できる環境を提供
            </Typography>
          </Box>
        </motion.div>

        {/* 結果の種類 */}
        <Grid container spacing={{ xs: 3, md: 4 }} sx={{ mb: { xs: 8, md: 10 } }}>
          {results.map((result, index) => (
            <Grid item xs={12} md={4} key={result.title}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 6,
                    },
                    borderTop: `4px solid ${result.color}`,
                  }}
                >
                  <CardContent sx={{ p: 4, textAlign: 'center' }}>
                    <Box
                      sx={{
                        color: result.color,
                        mb: 3,
                        display: 'flex',
                        justifyContent: 'center',
                      }}
                    >
                      {result.icon}
                    </Box>
                    
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        mb: 2,
                        fontSize: { xs: '1.1rem', sm: '1.25rem' },
                      }}
                    >
                      {result.title}
                    </Typography>
                    
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 3,
                        fontSize: { xs: '0.85rem', sm: '0.9rem' },
                        lineHeight: 1.6,
                      }}
                    >
                      {result.description}
                    </Typography>

                    <Box sx={{ textAlign: 'left' }}>
                      {result.features.map((feature, featureIndex) => (
                        <Box
                          key={featureIndex}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1,
                          }}
                        >
                          <CheckCircle
                            sx={{
                              color: result.color,
                              fontSize: 16,
                              mr: 1,
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: { xs: '0.8rem', sm: '0.85rem' },
                            }}
                          >
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* ダッシュボードデモ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ mb: { xs: 8, md: 10 } }}>
            <Typography
              variant="h4"
              sx={{
                textAlign: 'center',
                fontWeight: 600,
                mb: 6,
                fontSize: { xs: '1.5rem', sm: '2rem' },
              }}
            >
              実際の学習ダッシュボード例
            </Typography>

            <Paper
              elevation={8}
              sx={{
                p: { xs: 3, md: 6 },
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: 4,
              }}
            >
              <Grid container spacing={4}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: 'white',
                      borderRadius: 3,
                    }}
                  >
                    <Typography variant="h3" color="primary" fontWeight={700}>
                      {mockData.projectsCompleted}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      完了プロジェクト
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: 'white',
                      borderRadius: 3,
                    }}
                  >
                    <Typography variant="h3" color="success.main" fontWeight={700}>
                      {mockData.learningHours}h
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      学習時間
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: 'white',
                      borderRadius: 3,
                    }}
                  >
                    <Typography variant="h3" color="warning.main" fontWeight={700}>
                      {mockData.skillGrowth}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      スキル向上度
                    </Typography>
                  </Paper>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Paper
                    elevation={2}
                    sx={{
                      p: 3,
                      textAlign: 'center',
                      backgroundColor: 'white',
                      borderRadius: 3,
                    }}
                  >
                    <Typography variant="h3" color="info.main" fontWeight={700}>
                      {mockData.aiInteractions}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      AI対話回数
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Box sx={{ mt: 4 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  探究スキルの成長
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">問題発見力</Typography>
                    <Typography variant="body2">85%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={85} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">情報収集力</Typography>
                    <Typography variant="body2">78%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={78} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">論理的思考力</Typography>
                    <Typography variant="body2">92%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={92} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2">創造的思考力</Typography>
                    <Typography variant="body2">88%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={88} sx={{ height: 8, borderRadius: 4 }} />
                </Box>
              </Box>
            </Paper>
          </Box>
        </motion.div>

        {/* 利用者の声セクション - 実際のユーザーデータがないため削除 */}
      </Container>
    </Box>
  );
};

export default ResultsSection;
```

---

## `react-app/src/components/Guide/WhyNeededSection.tsx`

```tsx
import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  TrendingUp,
  Psychology,
  School,
  GroupWork,
  Assessment,
  AutoStories,
  ReportProblem,
  Lightbulb,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const WhyNeededSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const problems = [
    {
      title: 'テーマ設定の困難',
      description: '生徒の興味関心に基づいた適切な探究テーマの設定が課題',
      icon: <School sx={{ fontSize: 40 }} />,
    },
    {
      title: '個別指導の限界',
      description: '多様な生徒に対する一対一の個別サポートが困難',
      icon: <GroupWork sx={{ fontSize: 40 }} />,
    },
    {
      title: '進捗管理の複雑さ',
      description: '学習の進捗と成果の可視化・記録が困難',
      icon: <Assessment sx={{ fontSize: 40 }} />,
    },
  ];

  const solutions = [
    {
      title: 'AI対話による個別サポート',
      description: 'プロジェクト文脈を理解したAIが探究活動を個別にサポート',
      icon: <Psychology sx={{ fontSize: 40 }} />,
    },
    {
      title: 'プロジェクト統合管理',
      description: 'テーマ・問い・仮説・メモを一つのプロジェクトで統合管理し進捗を可視化',
      icon: <AutoStories sx={{ fontSize: 40 }} />,
    },
    {
      title: '思考フレームワーク支援',
      description: '11種類の思考ツールで探究のアイデア整理と深化をサポート',
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        {/* セクションタイトル */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                mb: 2,
                background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              なぜ探Qメイトが必要なのか？
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              探究学習の現場で直面する課題を、AI技術によって解決します
            </Typography>
          </Box>
        </motion.div>

        {/* 課題セクション */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Box sx={{ mb: { xs: 8, md: 10 } }}>
            <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mb: 2,
                  color: '#d32f2f',
                }}
              >
                現在の探究学習における課題
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                教育現場で実際に直面している課題
              </Typography>
            </Box>

            <Grid container spacing={ { xs: 3, md: 4 } }>
              {problems.map((problem, index) => (
                <Grid item xs={12} md={4} key={problem.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                  >
                    <Card
                      elevation={3}
                      sx={{
                        height: '100%',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: 6,
                        },
                        borderTop: '4px solid #d32f2f',
                      }}
                    >
                      <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                        <Box
                          sx={{
                            color: '#d32f2f',
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'center',
                          }}
                        >
                          {problem.icon}
                        </Box>
                        
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            mb: 2,
                            fontSize: { xs: '1.1rem', sm: '1.25rem' },
                          }}
                        >
                          {problem.title}
                        </Typography>
                        
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: '0.85rem', sm: '0.9rem' },
                            lineHeight: 1.6,
                          }}
                        >
                          {problem.description}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Box>
        </motion.div>

        {/* 解決策セクション */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Box>
            <Box sx={{ textAlign: 'center', mb: { xs: 4, md: 6 } }}>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 600,
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mb: 2,
                  color: '#059BFF',
                }}
              >
                探Qメイトによる解決
              </Typography>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ fontSize: { xs: '0.9rem', sm: '1rem' } }}
              >
                AI技術を活用した革新的なソリューション
              </Typography>
            </Box>

            <Grid container spacing={ { xs: 3, md: 4 } }>
              {solutions.map((solution, index) => (
                <Grid item xs={12} md={4} key={solution.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                  >
                    <Card
                      elevation={3}
                      sx={{
                        height: '100%',
                        background: 'linear-gradient(145deg, rgba(5,155,255,0.05) 0%, rgba(0,110,184,0.05) 100%)',
                        border: '1px solid rgba(5,155,255,0.1)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-8px)',
                          boxShadow: '0 12px 40px rgba(5,155,255,0.15)',
                          background: 'linear-gradient(145deg, rgba(5,155,255,0.08) 0%, rgba(0,110,184,0.08) 100%)',
                        },
                        borderTop: '4px solid #059BFF',
                      }}
                    >
                      <CardContent sx={{ p: { xs: 3, md: 4 }, textAlign: 'center' }}>
                        <Box
                          sx={{
                            color: '#059BFF',
                            mb: 3,
                            display: 'flex',
                            justifyContent: 'center',
                          }}
                        >
                          {solution.icon}
                        </Box>
                        
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            mb: 2,
                            fontSize: { xs: '1.1rem', sm: '1.25rem' },
                          }}
                        >
                          {solution.title}
                        </Typography>
                        
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: { xs: '0.85rem', sm: '0.9rem' },
                            lineHeight: 1.6,
                          }}
                        >
                          {solution.description}
                        </Typography>
                      </CardContent>
                    </Card>
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

export default WhyNeededSection;
```
