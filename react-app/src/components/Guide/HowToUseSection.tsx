import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  Stack,
  Avatar,
  IconButton,
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
  ChevronRight,
  Lightbulb,
  AutoStories,
  Assessment,
  School,
  Edit,
  Save,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const HowToUseSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const steps = [
    {
      number: 1,
      title: 'アイデア出し',
      subtitle: '興味を見つける',
      description: '自分の興味関心から探究テーマを見つけます。AIが質問を通じてアイデアを引き出します。',
      features: [
        '興味の発見',
        'テーマの探索',
        'AIとのブレスト',
        'アイデアの整理',
      ],
      icon: <Lightbulb />,
      bgColor: '#FF7A00',
      chipColor: '#ff8733',
      progressColor: '#ffe1b5',
    },
    {
      number: 2,
      title: '問いを立てる',
      subtitle: '探究の軸を決める',
      description: 'なぜ？どうして？という疑問から、探究の核となる問いを設定します。',
      features: [
        '問いの設定',
        '仮説の構築',
        '探究計画',
        'AIからの助言',
      ],
      icon: <Assignment />,
      bgColor: '#4ECDC4',
      chipColor: '#4ECDC4',
      progressColor: '#cde1ff',
    },
    {
      number: 3,
      title: '調査・実験',
      subtitle: '情報を集める',
      description: '文献調査、インタビュー、実験など様々な方法で情報を収集します。',
      features: [
        '調査方法の選択',
        '情報の収集',
        'データの記録',
        '実験の実施',
      ],
      icon: <Psychology />,
      bgColor: '#28a745',
      chipColor: '#28a745',
      progressColor: '#c7efe1',
    },
    {
      number: 4,
      title: '考察・分析',
      subtitle: '深く考える',
      description: '集めた情報を整理し、パターンを見つけ、自分の考えを深めます。',
      features: [
        '情報の整理',
        'パターン発見',
        '批判的思考',
        'AIとの対話',
      ],
      icon: <School />,
      bgColor: '#9C27B0',
      chipColor: '#9C27B0',
      progressColor: '#e1ceff',
    },
    {
      number: 5,
      title: 'まとめ・発表',
      subtitle: '成果を共有',
      description: '探究の成果をまとめ、プレゼンテーションやレポートとして発表します。',
      features: [
        'レポート作成',
        'プレゼン準備',
        '成果の共有',
        '振り返り',
      ],
      icon: <Save />,
      bgColor: '#2196F3',
      chipColor: '#2196F3',
      progressColor: '#ffd4d4',
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        {/* メインコンテンツ */}
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          {/* 左側：テキストコンテンツ */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 14, height: 14, bgcolor: '#FF7A00', borderRadius: 0.5 }} />
                <Typography variant="subtitle1" sx={{ color: '#6d87a8', fontWeight: 700 }}>
                  5つのステップで進行
                </Typography>
              </Stack>

              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  lineHeight: 1.3, 
                  fontSize: { xs: '1.8rem', md: '2.4rem' } 
                }}
              >
                ステップに沿った進行で<br />
                <Box component="span" sx={{ 
                  background: 'linear-gradient(45deg, #FF7A00, #E55100)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  誰でもスムーズに探究できる
                </Box>
              </Typography>

              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'text.secondary', 
                  lineHeight: 1.8,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                }}
              >
                アイデア出しから発表まで、探究学習を5つのステップでガイド。
                各ステップでAIが適切なサポートを提供し、迷わず進められます。
              </Typography>

              {/* ステップリスト（コンパクト版） */}
              <Stack spacing={2} sx={{ mt: 3 }}>
                {steps.map((step, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: `${step.bgColor}20`,
                        color: step.bgColor,
                      }}
                    >
                      {React.cloneElement(step.icon, { fontSize: 'small' })}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {step.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.subtitle}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* 右側：インタラクティブなモックUI */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative' }}>
              {/* グロー影 */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 'auto 0 -20px 0',
                  height: 40,
                  mx: 'auto',
                  width: '80%',
                  filter: 'blur(20px)',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.15)',
                  zIndex: 0,
                }}
              />

              {/* 浮遊する抽象的なチャットUIモック */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                animate={{ y: [0, -8, 0] }}
                transition={{ 
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.6 }
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(120,144,180,0.15)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    maxWidth: 520,
                    width: '100%',
                    mx: 'auto',
                  }}
                >
                  {/* シンプルなヘッダー */}
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Box 
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF7A00, #E55100)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Chat sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ 
                        height: 8, 
                        width: 150, 
                        bgcolor: '#2b3a4d',
                        borderRadius: 4,
                        mb: 0.8,
                      }} />
                      <Box sx={{ 
                        height: 6, 
                        width: 100, 
                        bgcolor: '#c1c9d5',
                        borderRadius: 3,
                      }} />
                    </Box>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%',
                      bgcolor: '#4ade80',
                      boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)',
                    }} />
                  </Stack>

                  {/* チャット履歴（1往復は実際のテキスト） */}
                  <Stack spacing={2.5} sx={{ mb: 3 }}>
                    {/* ユーザーメッセージ（実際のテキスト） */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 2,
                          bgcolor: '#FF7A00',
                          color: 'white',
                          borderRadius: '20px 20px 4px 20px',
                          boxShadow: '0 4px 12px rgba(255, 122, 0, 0.2)',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                          どうやって探究テーマを見つければいいですか？
                        </Typography>
                      </Box>
                    </Box>

                    {/* AIメッセージ（実際のテキスト） */}
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%',
                        bgcolor: '#ffecd1',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Psychology sx={{ fontSize: 18, color: '#FF7A00' }} />
                      </Box>
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 2,
                          bgcolor: '#f0f4f8',
                          borderRadius: '4px 20px 20px 20px',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#334155' }}>
                          まずは身近な「なぜ？」から始めてみましょう。日常生活で感じる疑問や興味を書き出してみると、探究テーマが見つかりやすくなります。
                        </Typography>
                      </Box>
                    </Box>

                    {/* ユーザーメッセージ（右寄せ） */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          maxWidth: '65%',
                          p: 2,
                          bgcolor: '#FF7A00',
                          borderRadius: '20px 20px 4px 20px',
                          boxShadow: '0 4px 12px rgba(255, 122, 0, 0.2)',
                        }}
                      >
                        <Box sx={{ 
                          height: 6, 
                          width: 120, 
                          bgcolor: 'rgba(255,255,255,0.6)',
                          borderRadius: 3,
                        }} />
                      </Box>
                    </Box>

                    {/* AIタイピング中 */}
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%',
                        bgcolor: '#ffecd1',
                        flexShrink: 0,
                      }} />
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: '#f0f4f8',
                          borderRadius: '4px 20px 20px 20px',
                        }}
                      >
                        <Stack direction="row" spacing={0.8}>
                          <Box sx={{ 
                            width: 10, 
                            height: 10, 
                            bgcolor: '#FF7A00',
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite',
                            '@keyframes bounce': {
                              '0%, 60%, 100%': { 
                                transform: 'translateY(0)',
                                opacity: 0.3,
                              },
                              '30%': { 
                                transform: 'translateY(-8px)',
                                opacity: 1,
                              },
                            }
                          }} />
                          <Box sx={{ 
                            width: 10, 
                            height: 10, 
                            bgcolor: '#FF7A00',
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite 0.2s',
                          }} />
                          <Box sx={{ 
                            width: 10, 
                            height: 10, 
                            bgcolor: '#FF7A00',
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite 0.4s',
                          }} />
                        </Stack>
                      </Box>
                    </Box>
                  </Stack>

                  {/* 抽象的な入力エリア */}
                  <Box sx={{ 
                    p: 2.5,
                    bgcolor: '#f8fafc',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: '#e2e8f0',
                  }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ 
                        flex: 1,
                        height: 40,
                        bgcolor: 'white',
                        borderRadius: 20,
                        border: '1px solid',
                        borderColor: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                      }}>
                        <Box sx={{ 
                          height: 6, 
                          width: 200, 
                          bgcolor: '#cbd5e1',
                          borderRadius: 3,
                        }} />
                      </Box>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%',
                        bgcolor: '#FF7A00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(255, 122, 0, 0.3)',
                        cursor: 'pointer',
                      }}>
                        <ArrowForward sx={{ color: 'white', fontSize: 20 }} />
                      </Box>
                    </Stack>
                  </Box>
                </Paper>
              </motion.div>
            </Box>
          </Grid>
        </Grid>

        {/* 詳細セクション */}
        <Box sx={{ mt: { xs: 10, md: 14 } }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <Typography
              variant="h4"
              sx={{
                textAlign: 'center',
                fontWeight: 700,
                fontSize: { xs: '1.5rem', md: '2rem' },
                mb: { xs: 6, md: 8 },
              }}
            >
              各ステップの詳細
            </Typography>
          </motion.div>

          {/* ステップ詳細カード */}
          <Grid container spacing={3}>
            {steps.map((step, index) => (
              <Grid item xs={12} md={6} lg={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.1 * index }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      borderRadius: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.1)',
                      },
                    }}
                  >
                    <Stack spacing={2}>
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Avatar
                          sx={{
                            width: 48,
                            height: 48,
                            bgcolor: `${step.bgColor}15`,
                            color: step.bgColor,
                          }}
                        >
                          {React.cloneElement(step.icon, { fontSize: 'medium' })}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>
                            {step.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {step.subtitle}
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
                        {step.description}
                      </Typography>

                      <Stack spacing={1}>
                        {step.features.map((feature, i) => (
                          <Stack key={i} direction="row" alignItems="center" spacing={1}>
                            <CheckCircle sx={{ fontSize: 16, color: step.bgColor }} />
                            <Typography variant="caption">
                              {feature}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Stack>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* CTA セクション */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mt: { xs: 10, md: 12 } }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 6 },
                background: 'linear-gradient(135deg, #FF7A00 0%, #E55100 100%)',
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
                探究学習を始めよう
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.95,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  maxWidth: 600,
                  mx: 'auto',
                  lineHeight: 1.8,
                }}
              >
                5つのステップで、あなたの探究学習をサポート。
                AIアシスタントと一緒に、深い学びと創造的思考力を育てましょう。
              </Typography>
            </Paper>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HowToUseSection;