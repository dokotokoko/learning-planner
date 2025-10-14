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
      title: '探Qメイトは、高校生の探究学習を個別に伴走する対話型AIです。AIとの対話で考えを言葉にし、小さな好奇心を具体的な行動に変え、振り返りまで導きます。教師のリソース不足で一人ひとりに寄り添いきれない課題を、AIの個別支援で補完します。',
      icon: <School sx={{ fontSize: 40 }} />,
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
                background: 'linear-gradient(45deg, #FF7A00, #E55100)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              あなたの探究を伴走するAIパートナー
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
            </Typography>
            <Box
              component="img"
              src="/images/about-tanqmates.png"
              alt="探究学習のイメージ"
              sx={{
                width: '100%',
                maxWidth: { xs: 600, sm: 700, md: 800 },
                height: 'auto',
                mt: 3,
                borderRadius: 2,
                boxShadow: 2,
              }}
            />
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
            <Grid container spacing={ { xs: 3, md: 4 } }>
              {problems.map((problem, index) => (
                <Grid item xs={12} key={problem.title}>
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: 0.1 * index }}
                  >
                    <Card
                      elevation={1}
                      sx={{
                        height: '100%',
                        width: { xs: '50%', sm: '60%', md: '70%' }, // 画面幅で段階的に絞る
                        mx: 'auto',    
                        borderTop: '4px solid #d32f2f',
                      }}
                    >
                      <CardContent sx={{ 
                        p: { xs: 3, md: 4 }, 
                        display: 'flex',          
                        flexDirection: 'column',  
                        alignItems: 'center',     
                        textAlign: 'center' }}>
                        <Box
                          sx={{
                            color: '#d32f2f',
                            mb: 3,
                            mx: 'auto'
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