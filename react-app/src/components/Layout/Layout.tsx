// react-app/src/components/Layout/Layout.tsx
import React, { useState, useCallback, useEffect, useMemo, memo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Avatar,
  useTheme,
  useMediaQuery,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Chat as ChatIcon,
  Logout,
  ExpandMore,
  Explore,
  Psychology,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { motion} from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import DashboardSidebar from './DashboardSidebar';
// import QuestSuggestion from './QuestSuggestion'; // 一時的に非表示
// import QuestBoardPage from '../../pages/QuestBoardPage'; // 一時的に非表示

const drawerWidth = 280;
const tabletDrawerWidth = 240;
const collapsedDrawerWidth = 64;
const defaultDashboardSidebarWidth = 350;
const minDashboardSidebarWidth = 300;
const minMainContentWidth = 600; // メインコンテンツ（中央のチャット）の最小幅

interface LayoutContextType {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
}

export const LayoutContext = React.createContext<LayoutContextType>({
  sidebarOpen: true,
  onSidebarToggle: () => {},
});

const Layout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const { user, logout } = useAuthStore();
  const { 
    chatPageId, 
  } = useChatStore();

  // 現在のページに基づくチャットページIDを生成
  const getEffectiveChatPageId = () => {
    if (chatPageId) return chatPageId;
    
    // プロジェクトページの場合
    const projectMatch = location.pathname.match(/\/projects\/(\d+)/);
    if (projectMatch) {
      return `project-${projectMatch[1]}`;
    }
    
    // ダッシュボードやその他のページの場合
    return `general-${location.pathname.replace(/\//g, '-')}`;
  };
  const { startTutorialManually } = useTutorialStore();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [dashboardSidebarOpen, setDashboardSidebarOpen] = useState(!isMobile); // モバイルではデフォルトで非表示
  const [dashboardSidebarWidth, setDashboardSidebarWidth] = useState(defaultDashboardSidebarWidth);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen(prev => !prev);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const handleDashboardSidebarToggle = useCallback(() => {
    setDashboardSidebarOpen(prev => !prev);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null);
  };

  // ウィンドウリサイズ時のサイドバー幅調整と画面サイズ変更時のサイドバー状態管理
  useEffect(() => {
    const handleWindowResize = () => {
      if (!dashboardSidebarOpen) return;
      
      const currentLeftSidebarWidth = sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth;
      const dynamicMaxWidth = window.innerWidth - currentLeftSidebarWidth - minMainContentWidth;
      
      // ダッシュボード幅が新しい最大幅を超えている場合は調整
      if (dashboardSidebarWidth > dynamicMaxWidth) {
        setDashboardSidebarWidth(Math.max(minDashboardSidebarWidth, dynamicMaxWidth));
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [dashboardSidebarOpen, sidebarOpen, dashboardSidebarWidth]);

  // 画面サイズが変わった時のダッシュボードサイドバー状態管理
  // モバイル/デスクトップ切り替え時の処理（初回レンダリング時は除く）
  const [hasInitialized, setHasInitialized] = useState(false);
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      return;
    }
    // モバイルからデスクトップに変わった場合、ダッシュボードサイドバーを開く
    if (!isMobile) {
      setDashboardSidebarOpen(true);
    }
    // デスクトップからモバイルに変わった場合、ダッシュボードサイドバーを閉じる
    else {
      setDashboardSidebarOpen(false);
    }
  }, [isMobile, hasInitialized]);


  interface MenuItem {
    text: string;
    icon: React.ReactNode;
    path: string;
    action?: () => void;
  }

  const mainListItems: MenuItem[] = useMemo(() => [
    { text: 'AIチャット', icon: <ChatIcon />, path: '/chat' },
    //{ text: '探究テーマを見つける・探す', icon: <Explore />, path: '/framework-games/theme-deep-dive' },
    { text: 'ダッシュボード', icon: <DashboardIcon />, path: '#', action: handleDashboardSidebarToggle },
    //{ text: '対話エージェント検証', icon: <Psychology />, path: '/conversation-agent-test' },
    // { text: '探究クエスト掲示板!', icon: <Explore />, path: '/quests'} // 一時的に非表示
  ], [handleDashboardSidebarToggle]);

  // 展開状態のサイドバー
  const fullDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, background: 'linear-gradient(135deg, #FF7A00 0%, #FF6B35 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              探Qメイト
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
              あなたの学びのパートナー
            </Typography>
          </Box>
          <IconButton
            onClick={handleSidebarToggle}
            sx={{
              color: 'white',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Box>

      <List sx={{ flex: 1, px: 1 }} data-tutorial="navigation-menu">
        {mainListItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (item.path !== '#') {
                navigate(item.path);
                }
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  background: 'linear-gradient(45deg, #FF7A00, #FF6B35)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  background: 'rgba(255, 122, 0, 0.1)',
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{
                  fontSize: '0.9rem',
                  fontWeight: location.pathname === item.path ? 600 : 400,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* クエスト提案 - 一時的に非表示 */}
      {/* <QuestSuggestion /> */}

      <Divider />

      <Divider />
      
      <Box sx={{ p: 2 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 2, 
            mb: 2,
            cursor: 'pointer',
            p: 1,
            borderRadius: 1,
            '&:hover': {
              bgcolor: 'rgba(255, 122, 0, 0.1)',
            },
          }}
          onClick={handleUserMenuOpen}
        >
          <Avatar sx={{ bgcolor: '#FF7A00' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>
              {user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ログイン中
            </Typography>
          </Box>
          <ExpandMore sx={{ color: 'text.secondary' }} />
        </Box>
      </Box>
    </Box>
  );

  // 縮小状態のサイドバー
  const collapsedDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 1.5, 
        background: 'linear-gradient(135deg, #FF7A00 0%, #FF6B35 100%)',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <IconButton
          onClick={handleSidebarToggle}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
          }}
        >
          <MenuIcon />
        </IconButton>
      </Box>

      <List sx={{ flex: 1, px: 0.5 }}>
        {mainListItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                if (item.action) {
                  item.action();
                } else if (item.path !== '#') {
                  navigate(item.path);
                }
              }}
              sx={{
                borderRadius: 2,
                justifyContent: 'center',
                minHeight: 48,
                '&.Mui-selected': {
                  background: 'linear-gradient(45deg, #FF7A00, #FF6B35)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  background: 'rgba(255, 122, 0, 0.1)',
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 'auto', justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      <Divider />
      
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <IconButton
          onClick={handleUserMenuOpen}
          sx={{
            width: '100%',
            height: 48,
            borderRadius: 1,
            color: '#FF7A00',
            '&:hover': {
              bgcolor: 'rgba(255, 122, 0, 0.1)',
            },
          }}
        >
          <Avatar sx={{ bgcolor: '#FF7A00', width: 32, height: 32 }}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
      </Box>
    </Box>
  );

  return (
    <LayoutContext.Provider value={{ sidebarOpen, onSidebarToggle: handleSidebarToggle }}>
      <Box sx={{ display: 'flex', minHeight: '100vh' }}>
        {/* Drawer */}
        <Box
          component="nav"
          sx={{ 
            width: { 
              xs: 0,
              sm: isTablet ? (sidebarOpen ? tabletDrawerWidth : collapsedDrawerWidth) : 0,
              md: sidebarOpen ? drawerWidth : collapsedDrawerWidth
            },
            flexShrink: { sm: 0 },
            transition: 'width 0.3s ease',
          }}
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: drawerWidth,
                border: 'none',
                boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
              },
            }}
          >
            {fullDrawer}
          </Drawer>
          
          <Drawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
              '& .MuiDrawer-paper': { 
                boxSizing: 'border-box', 
                width: sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth,
                border: 'none',
                boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
                transition: 'width 0.3s ease',
                overflowX: 'hidden',
              },
            }}
            open
          >
            {sidebarOpen ? fullDrawer : collapsedDrawer}
          </Drawer>
        </Box>

        {/* Main content - 中央のチャットエリア */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { 
              xs: '100%',
              sm: (() => {
                const leftWidth = sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth;
                const rightWidth = dashboardSidebarOpen ? dashboardSidebarWidth : 0;
                return `calc(100% - ${leftWidth}px - ${rightWidth}px)`;
              })()
            },
            minHeight: '100vh',
            transition: 'width 0.3s ease',
          }}
        >
          {/* モバイル用のメニューボタン */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, p: 1 }}>
            <IconButton
              color="primary"
              onClick={handleDrawerToggle}
              sx={{ mb: 1 }}
            >
              <MenuIcon />
            </IconButton>
          </Box>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%' }}
          >
            <Outlet />
          </motion.div>
        </Box>

        {/* Right Dashboard Sidebar */}
        <DashboardSidebar
          isOpen={dashboardSidebarOpen}
          onToggle={handleDashboardSidebarToggle}
          width={isMobile ? window.innerWidth * 0.85 : dashboardSidebarWidth}
          isMobile={isMobile}
        />

        {/* ユーザーメニュー */}
        <Menu
          anchorEl={userMenuAnchor}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
        >
          <MenuItem onClick={handleLogout}>
            <Logout sx={{ mr: 1 }} />
            ログアウト
          </MenuItem>
        </Menu>
      </Box>
    </LayoutContext.Provider>
  );
};

export default memo(Layout);