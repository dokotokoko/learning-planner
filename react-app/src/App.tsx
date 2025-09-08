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
import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';

// その他のページは遅延ローディング
const GuidePage = lazy(() => import('./pages/GuidePage'));
const HomePage = lazy(() => import('./pages/HomePage'));
const StepPage = lazy(() => import('./pages/StepPage'));
const GeneralInquiryPage = lazy(() => import('./pages/GeneralInquiryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ProjectPage = lazy(() => import('./pages/ProjectPage'));
const MemoPage = lazy(() => import('./pages/MemoPage'));
const MultiMemoPage = lazy(() => import('./pages/MultiMemoPage'));
const FrameworkGamesPage = lazy(() => import('./pages/FrameworkGamesPage'));
const NotificationDemoPage = lazy(() => import('./pages/NotificationDemoPage'));

// FrameworkGamesコンポーネントはすべて遅延ローディング
const FiveWhysGame = lazy(() => import('./components/FrameworkGames/FiveWhysGame'));
const LogicTreeGame = lazy(() => import('./components/FrameworkGames/LogicTreeGame'));
const HMWGame = lazy(() => import('./components/FrameworkGames/HMWGame'));
const ImpactFeasibilityGame = lazy(() => import('./components/FrameworkGames/ImpactFeasibilityGame'));
const SpeedStormingGame = lazy(() => import('./components/FrameworkGames/SpeedStormingGame'));
const GalleryWalkGame = lazy(() => import('./components/FrameworkGames/GalleryWalkGame'));
const MindMapGame = lazy(() => import('./components/FrameworkGames/MindMapGame'));
const IkigaiGame = lazy(() => import('./components/FrameworkGames/IkigaiGame'));
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
        default: isDarkMode ? '#121212' : '#f8f9fa',
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
                <Route path="home" element={<LazyWrapper><HomePage /></LazyWrapper>} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="projects/:projectId" element={<LazyWrapper><ProjectPage /></LazyWrapper>} />
                <Route path="projects/:projectId/memos/:memoId" element={<LazyWrapper><MemoPage /></LazyWrapper>} />
                <Route path="step/:stepNumber" element={<LazyWrapper><StepPage /></LazyWrapper>} />
                <Route path="memos" element={<LazyWrapper><MultiMemoPage /></LazyWrapper>} />
                <Route path="inquiry" element={<LazyWrapper><GeneralInquiryPage /></LazyWrapper>} />
                <Route path="profile" element={<LazyWrapper><ProfilePage /></LazyWrapper>} />
                <Route path="framework-games" element={<LazyWrapper><FrameworkGamesPage /></LazyWrapper>} />
                {/* <Route path="quests" element={<QuestBoardPage />} /> 一時的に非表示 */}
                <Route path="framework-games/theme-deep-dive" element={<LazyWrapper><ThemeDeepDiveGame /></LazyWrapper>} />
                <Route path="framework-games/5-whys" element={<LazyWrapper><FiveWhysGame /></LazyWrapper>} />
                <Route path="framework-games/logic-tree" element={<LazyWrapper><LogicTreeGame /></LazyWrapper>} />
                <Route path="framework-games/hmw" element={<LazyWrapper><HMWGame /></LazyWrapper>} />
                <Route path="framework-games/impact-feasibility" element={<LazyWrapper><ImpactFeasibilityGame /></LazyWrapper>} />
                <Route path="framework-games/speed-storming" element={<LazyWrapper><SpeedStormingGame /></LazyWrapper>} />
                <Route path="framework-games/gallery-walk" element={<LazyWrapper><GalleryWalkGame /></LazyWrapper>} />
                <Route path="framework-games/mind-map" element={<LazyWrapper><MindMapGame /></LazyWrapper>} />
                <Route path="framework-games/ikigai" element={<LazyWrapper><IkigaiGame /></LazyWrapper>} />
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