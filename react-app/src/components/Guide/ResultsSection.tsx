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