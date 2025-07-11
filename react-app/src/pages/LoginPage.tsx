import React, { useState } from 'react';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  Button,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Fade,
  Grow,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  AccountCircle,
  Lock,
  Psychology,
  School,
  AutoStories,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`auth-tabpanel-${index}`}
      aria-labelledby={`auth-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

const FeatureCard = ({ icon, title, description, delay }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.6, delay }}
  >
    <Paper
      elevation={2}
      sx={{
        p: 3,
        textAlign: 'center',
        height: '100%',
        background: 'linear-gradient(145deg, rgba(115,187,255,0.05) 0%, rgba(71,215,172,0.05) 100%)',
        borderRadius: 3,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
        },
      }}
    >
      <Box sx={{ color: 'primary.main', mb: 2 }}>{icon}</Box>
      <Typography variant="h6" gutterBottom fontWeight={600}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {description}
      </Typography>
    </Paper>
  </motion.div>
);

const LoginPage = () => {
  const [tabValue, setTabValue] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: '',
  });
  
  const [registerData, setRegisterData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
  });

  const { login, register, isLoading } = useAuthStore();

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
    setSuccess('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await login(loginData.username, loginData.password);
    
    if (!result.success) {
      setError(result.error || 'ログインに失敗しました');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    const result = await register(
      registerData.username,
      registerData.password,
      registerData.confirmPassword
    );
    
    if (result.success) {
      setSuccess('ユーザー登録が完了しました。ログインしてください。');
      setTabValue(0);
      setRegisterData({ username: '', password: '', confirmPassword: '' });
    } else {
      setError(result.error || '登録に失敗しました');
    }
  };

  const features = [
    {
      icon: <Psychology sx={{ fontSize: 48 }} />,
      title: 'AI対話サポート',
      description: 'AIアシスタントが探究学習の各ステップをサポートします',
    },
    {
      icon: <AutoStories sx={{ fontSize: 48 }} />,
      title: '学習記録',
      description: '対話履歴や学習計画を自動保存・管理',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        py: 4,
      }}
    >
      <Container maxWidth="lg">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={24}
            sx={{
              borderRadius: 4,
              overflow: 'hidden',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <Box sx={{ display: 'flex', minHeight: '600px' }}>
              {/* 左側：機能紹介 */}
              <Box
                sx={{
                  flex: 1,
                  p: 6,
                  background: 'linear-gradient(145deg, #f8f9fa 0%, #e9ecef 100%)',
                  display: { xs: 'none', md: 'flex' },
                  flexDirection: 'column',
                  justifyContent: 'center',
                }}
              >
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8 }}
                >
                  <Typography
                    variant="h3"
                    gutterBottom
                    fontWeight={700}
                    sx={{
                      background: 'linear-gradient(45deg, #667eea, #764ba2)',
                      backgroundClip: 'text',
                      textFillColor: 'transparent',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    探Qメイト
                  </Typography>
                  <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                    AIを活用した探究学習支援アプリケーション
                  </Typography>
                </motion.div>

                <Box sx={{ display: 'grid', gap: 3 }}>
                  {features.map((feature, index) => (
                    <FeatureCard
                      key={feature.title}
                      {...feature}
                      delay={0.2 + index * 0.1}
                    />
                  ))}
                </Box>
              </Box>

              {/* 右側：ログインフォーム */}
              <Box sx={{ flex: 1, p: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Typography variant="h4" gutterBottom fontWeight={600} textAlign="center">
                    ようこそ
                  </Typography>
                  
                  <Tabs
                    value={tabValue}
                    onChange={handleTabChange}
                    centered
                    sx={{
                      mb: 3,
                      '& .MuiTab-root': {
                        fontWeight: 600,
                        minWidth: 120,
                      },
                    }}
                  >
                    <Tab label="ログイン" />
                    <Tab label="新規登録" />
                  </Tabs>

                  <AnimatePresence mode="wait">
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {error}
                        </Alert>
                      </motion.div>
                    )}
                    
                    {success && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Alert severity="success" sx={{ mb: 2 }}>
                          {success}
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <TabPanel value={tabValue} index={0}>
                    <Box component="form" onSubmit={handleLogin} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        fullWidth
                        label="ユーザー名"
                        value={loginData.username}
                        onChange={(e) => setLoginData({ ...loginData, username: e.target.value })}
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccountCircle color="action" />
                            </InputAdornment>
                          ),
                        }}
                        required
                      />
                      
                      <TextField
                        fullWidth
                        label="パスワード"
                        type={showPassword ? 'text' : 'password'}
                        value={loginData.password}
                        onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        required
                      />
                      
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isLoading}
                        sx={{
                          py: 1.5,
                          fontSize: '1.1rem',
                          background: 'linear-gradient(45deg, #667eea, #764ba2)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #5a6fd8, #6a4190)',
                          },
                        }}
                      >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : 'ログイン'}
                      </Button>
                    </Box>
                  </TabPanel>

                  <TabPanel value={tabValue} index={1}>
                    <Box component="form" onSubmit={handleRegister} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <TextField
                        fullWidth
                        label="ユーザー名"
                        value={registerData.username}
                        onChange={(e) => setRegisterData({ ...registerData, username: e.target.value })}
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <AccountCircle color="action" />
                            </InputAdornment>
                          ),
                        }}
                        required
                      />
                      
                      <TextField
                        fullWidth
                        label="パスワード"
                        type={showPassword ? 'text' : 'password'}
                        value={registerData.password}
                        onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                              >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        required
                      />
                      
                      <TextField
                        fullWidth
                        label="パスワード（確認）"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={registerData.confirmPassword}
                        onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                        disabled={isLoading}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <Lock color="action" />
                            </InputAdornment>
                          ),
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                edge="end"
                              >
                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                        required
                      />
                      
                      <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        size="large"
                        disabled={isLoading}
                        sx={{
                          py: 1.5,
                          fontSize: '1.1rem',
                          background: 'linear-gradient(45deg, #47d7ac, #2196F3)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #3bc99c, #1976D2)',
                          },
                        }}
                      >
                        {isLoading ? <CircularProgress size={24} color="inherit" /> : '新規登録'}
                      </Button>
                    </Box>
                  </TabPanel>
                </motion.div>
              </Box>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default LoginPage; 