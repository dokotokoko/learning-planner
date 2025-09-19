import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';

// 重要なページは静的インポート（初期ロードに必要）
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';

// その他のページは遅延ローディング
const HomePage = lazy(() => import('./pages/HomePage'));
const StepPage = lazy(() => import('./pages/StepPage'));
const GeneralInquiryPage = lazy(() => import('./pages/GeneralInquiryPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const MemoPage = lazy(() => import('./pages/MemoPage'));
const MultiMemoPage = lazy(() => import('./pages/MultiMemoPage'));
const NotificationDemoPage = lazy(() => import('./pages/NotificationDemoPage'));
const ThemeDeepDiveGame = lazy(() => import('./components/FrameworkGames/ThemeDeepDiveGame'));
const ConversationAgentTestPage = lazy(() => import('./pages/ConversationAgentTestPage'));

// import QuestBoardPage from './pages/QuestBoardPage'; // 一時的に非表示

import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 遅延ローディング用のラッパーコンポーネント
const LazyWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<LoadingScreen />}>
    {children}
  </Suspense>
);

function App() {
  const { user, isLoading } = useAuthStore();
  const { isDarkMode, primaryColor } = useThemeStore();

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
      primary: {
        main: primaryColor,
        light: isDarkMode ? '#52BAFF' : '#9ED8FF',
        dark: '#006EB8',
      },
      secondary: {
        main: '#52BAFF',
        light: '#9ED8FF',
        dark: '#00406B',
      },
      background: {
        default: '#E0F2F7', // 例: 明るい水色
        paper: isDarkMode ? '#1e1e1e' : '#ffffff',
      },
    },
    typography: {
      fontFamily: '"Noto Sans JP", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: {
        fontSize: '2.5rem',
        fontWeight: 600,
        lineHeight: 1.2,
      },
      h2: {
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.3,
      },
      body1: {
        fontSize: '1rem',
        lineHeight: 1.6,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 8,
            fontWeight: 600,
            padding: '10px 24px',
            transition: 'all 0.3s ease',
            '&:hover': {
              transform: 'translateY(-2px)',
              boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
            },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            borderRadius: 16,
            transition: 'all 0.3s ease',
            '&:hover': {
              boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              transform: 'translateY(-2px)',
            },
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 8,
              transition: 'all 0.3s ease',
              '&:hover': {
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: primaryColor,
                },
              },
            },
          },
        },
      },
    },
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AnimatePresence mode="wait">
            <Routes>
              <Route 
                path="/login" 
                element={
                  user ? <Navigate to="/chat" replace /> : 
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LoginPage />
                  </motion.div>
                } 
              />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/chat" replace />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="home" element={<LazyWrapper><HomePage /></LazyWrapper>} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="projects/:projectId" element={<LazyWrapper><ProjectPage /></LazyWrapper>} />
                <Route path="projects/:projectId/memos/:memoId" element={<LazyWrapper><MemoPage /></LazyWrapper>} />
                <Route path="step/:stepNumber" element={<LazyWrapper><StepPage /></LazyWrapper>} />
                <Route path="memos" element={<LazyWrapper><MultiMemoPage /></LazyWrapper>} />
                <Route path="inquiry" element={<LazyWrapper><GeneralInquiryPage /></LazyWrapper>} />
                {/* <Route path="quests" element={<QuestBoardPage />} /> 一時的に非表示 */}
                <Route path="framework-games/theme-deep-dive" element={<LazyWrapper><ThemeDeepDiveGame /></LazyWrapper>} />
                <Route path="conversation-agent-test" element={<LazyWrapper><ConversationAgentTestPage /></LazyWrapper>} />
                <Route path="notification-demo" element={<LazyWrapper><NotificationDemoPage /></LazyWrapper>} />
              </Route>
              
              <Route path="*" element={<Navigate to="/chat" replace />} />
            </Routes>
          </AnimatePresence>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 