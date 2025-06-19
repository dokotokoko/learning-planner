// react-app/src/pages/HomePage.tsx
import React from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
} from '@mui/material';
import {
  TipsAndUpdates,
  QuestionAnswer,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const features = [
    {
      title: '探究テーマを設定する',
      description: '4ステップでテーマから活動計画まで',
      icon: <TipsAndUpdates sx={{ fontSize: 48 }} />,
      action: () => navigate('/step/1'),
      color: 'primary',
    },
    {
      title: 'AIに相談する',
      description: '探究学習の疑問を何でも相談',
      icon: <QuestionAnswer sx={{ fontSize: 48 }} />,
      action: () => navigate('/inquiry'),
      color: 'secondary',
    },
  ];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h1" gutterBottom fontWeight={700}>
            探Qメイト
          </Typography>
          <Typography variant="h6" color="text.secondary">
            こんにちは、{user?.username}さん
          </Typography>
        </Box>

        <Grid container spacing={4} justifyContent="center">
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8 }}
              >
                <Card
                  sx={{
                    height: 280,
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      boxShadow: 6,
                    },
                  }}
                  onClick={feature.action}
                >
                  <CardContent
                    sx={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      p: 4,
                    }}
                  >
                    <Box
                      sx={{
                        mb: 3,
                        color: `${feature.color}.main`,
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" component="h2" gutterBottom fontWeight={600}>
                      {feature.title}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      {feature.description}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ justifyContent: 'center', pb: 3 }}>
                    <Button
                      variant="contained"
                      color={feature.color as 'primary' | 'secondary'}
                      size="large"
                      sx={{ minWidth: 120 }}
                    >
                      開始
                    </Button>
                  </CardActions>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>
    </Container>
  );
};

export default HomePage;