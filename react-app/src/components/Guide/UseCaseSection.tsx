import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  School,
  Science,
  Create,
  Group,
  Assignment,
  Psychology,
  Extension,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const UseCaseSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const useCases = [
    {
      title: '探究テーマが決まらない時に...',
      color: '#4CAF50',
      image: '/images/app-screenshot-main.png'
    },
    {
      title: '少し調べた後に行き詰ってしまった時に...',
      color: '#2196F3',
      image: '/images/app-screenshot-main.png'
    },
    {
      title: 'どうやって検証を進めたらよいかわからない時に...',
      color: '#FF9800',
      image: '/images/app-screenshot-main.png'
    }
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
              UseCase
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                maxWidth: 700,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              探Qメイトは探究学習のあらゆる過程を伴走します。
            </Typography>
          </Box>
        </motion.div>

        {/* Use Cases Grid */}
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {useCases.map((useCase, index) => (
            <Grid item xs={12} md={6} lg={4} key={useCase.title}>
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
                    borderTop: `4px solid ${useCase.color}`,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        fontSize: { xs: '1.1rem', sm: '1.2rem' },
                        lineHeight: 1.3,
                        color: useCase.color,
                        mb: 2,
                      }}
                    >
                      {useCase.title}
                    </Typography>

                    {/* Image */}
                    <Box
                      sx={{
                        mb: 3,
                        borderRadius: 0,
                        overflow: 'hidden',
                        backgroundColor: 'grey.100',
                        minHeight: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Box
                        component="img"
                        src={useCase.image}
                        alt={useCase.title}
                        sx={{
                          width: '100%',
                          height: 'auto',
                          display: 'block',
                        }}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.parentElement!.innerHTML = `
                            <div style="
                              color: #666;
                              font-size: 0.9rem;
                              text-align: center;
                              padding: 40px;
                            ">
                              画面イメージ<br>
                              ${useCase.title}
                            </div>
                          `;
                        }}
                      />
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        lineHeight: 1.6,
                        textAlign: 'center',
                      }}
                    >
                      探Qメイトがあなたの探究をサポートします
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box
            sx={{
              mt: 8,
              p: 4,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 2,
                fontSize: { xs: '1.3rem', sm: '1.5rem' },
              }}
            >
              あなたの探究活動にも活用できます
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              探Qメイトは、生徒一人ひとりの興味や学習スタイルに合わせて
              最適な探究学習をサポートします。
              まずは無料で試してみませんか？
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default UseCaseSection;