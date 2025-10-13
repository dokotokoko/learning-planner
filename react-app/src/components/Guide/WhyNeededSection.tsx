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