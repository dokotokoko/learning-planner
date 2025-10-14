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
const GuidePage = lazy(() => import('./pages/GuidePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const StepPage = lazy(() => import('./pages/StepPage'));
const GeneralInquiryPage = lazy(() => import('./pages/GeneralInquiryPage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const MemoPage = lazy(() => import('./pages/MemoPage'));
const MultiMemoPage = lazy(() => import('./pages/MultiMemoPage'));
const NotificationDemoPage = lazy(() => import('./pages/NotificationDemoPage'));
const ThemeDeepDiveGame = lazy(() => import('./components/FrameworkGames/ThemeDeepDiveGame'));
const ConversationAgentTestPage = lazy(() => import('./pages/ConversationAgentTestPage'));
const InquiryExplorer = lazy(() => import('./components/InquiryExplorer/InquiryExplorer'));

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
        light: isDarkMode ? '#FFCC80' : '#FFD54F',
        dark: '#FF8F00',
      },
      secondary: {
        main: '#FF8A65',
        light: '#FFAB91',
        dark: '#FF5722',
      },
      background: {
        default: '#FFF9C4', // より明るいパステルクリーム色
        paper: isDarkMode ? '#1e1e1e' : '#FFFDE7',
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
      borderRadius: 20,
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: 'none',
            borderRadius: 20,
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
            borderRadius: 24,
          },
        },
      },
      MuiTextField: {
        styleOverrides: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 20,
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
              {/* 使い方ページ（認証不要） */}
              <Route 
                path="/" 
                element={
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <LazyWrapper><GuidePage /></LazyWrapper>
                  </motion.div>
                } 
              />
              
              {/* ログインページ */}
              <Route 
                path="/login" 
                element={
                  user ? <Navigate to="/app" replace /> : 
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
              
              {/* アプリケーション本体（認証必要） */}
              <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                <Route index element={<Navigate to="/dashboard" replace />} />
              </Route>
              
              {/* InquiryExplorer - サイドバーなしのフルスクリーン */}
              <Route 
                path="/inquiry-explorer" 
                element={
                  <ProtectedRoute>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                      style={{ height: '100vh' }}
                    >
                      <LazyWrapper><InquiryExplorer /></LazyWrapper>
                    </motion.div>
                  </ProtectedRoute>
                } 
              />

              <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
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
              
              {/* 未定義ルートのフォールバック */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AnimatePresence>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 