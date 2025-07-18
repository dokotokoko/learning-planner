import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { QueryClient, QueryClientProvider } from 'react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import StepPage from './pages/StepPage';
import GeneralInquiryPage from './pages/GeneralInquiryPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import ProjectPage from './pages/ProjectPage';
import MemoPage from './pages/MemoPage';
import MultiMemoPage from './pages/MultiMemoPage';
import FrameworkGamesPage from './pages/FrameworkGamesPage';
import QuestBoardPage from './pages/QuestBoardPage';
import FiveWhysGame from './components/FrameworkGames/FiveWhysGame';
import LogicTreeGame from './components/FrameworkGames/LogicTreeGame';
import HMWGame from './components/FrameworkGames/HMWGame';
import ImpactFeasibilityGame from './components/FrameworkGames/ImpactFeasibilityGame';
import SpeedStormingGame from './components/FrameworkGames/SpeedStormingGame';
import GalleryWalkGame from './components/FrameworkGames/GalleryWalkGame';
import MindMapGame from './components/FrameworkGames/MindMapGame';
import IkigaiGame from './components/FrameworkGames/IkigaiGame';
import ThemeDeepDiveGame from './components/FrameworkGames/ThemeDeepDiveGame';
import NotificationDemoPage from './pages/NotificationDemoPage';

import Layout from './components/Layout/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import LoadingScreen from './components/LoadingScreen';
import './styles/global.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

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
              <Route 
                path="/login" 
                element={
                  user ? <Navigate to="/dashboard" replace /> : 
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
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="home" element={<HomePage />} />
                <Route path="dashboard" element={<DashboardPage />} />
                <Route path="projects/:projectId" element={<ProjectPage />} />
                <Route path="projects/:projectId/memos/:memoId" element={<MemoPage />} />
                <Route path="step/:stepNumber" element={<StepPage />} />
                <Route path="memos" element={<MultiMemoPage />} />
                <Route path="inquiry" element={<GeneralInquiryPage />} />
                <Route path="profile" element={<ProfilePage />} />
                <Route path="framework-games" element={<FrameworkGamesPage />} />
                <Route path="quests" element={<QuestBoardPage />} />
                <Route path="framework-games/theme-deep-dive" element={<ThemeDeepDiveGame />} />
                <Route path="framework-games/5-whys" element={<FiveWhysGame />} />
                <Route path="framework-games/logic-tree" element={<LogicTreeGame />} />
                <Route path="framework-games/hmw" element={<HMWGame />} />
                <Route path="framework-games/impact-feasibility" element={<ImpactFeasibilityGame />} />
                <Route path="framework-games/speed-storming" element={<SpeedStormingGame />} />
                <Route path="framework-games/gallery-walk" element={<GalleryWalkGame />} />
                <Route path="framework-games/mind-map" element={<MindMapGame />} />
                <Route path="framework-games/ikigai" element={<IkigaiGame />} />
                <Route path="notification-demo" element={<NotificationDemoPage />} />
              </Route>
              
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AnimatePresence>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App; 