// react-app/src/components/Layout/Layout.tsx
import React, { useState, useCallback, useEffect } from 'react';
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
  Button,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  TipsAndUpdates,
  Psychology,
  Chat as ChatIcon,
  ChevronLeft,
  ChevronRight,
  Logout,
  ExpandMore,
  Explore,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import { useTutorialStore } from '../../stores/tutorialStore';
import { Link } from 'react-router-dom';
import AIChat from '../MemoChat/AIChat';
import QuestSuggestion from './QuestSuggestion';
import QuestBoardPage from '../../pages/QuestBoardPage';

const drawerWidth = 280;
const tabletDrawerWidth = 240;
const collapsedDrawerWidth = 64;
const defaultChatSidebarWidth = 400;
const tabletChatSidebarWidth = 350;
const minChatSidebarWidth = 300;
const minMainContentWidth = 400; // メインコンテンツの最小幅

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
    isChatOpen, 
    toggleChat, 
    chatPageId, 
    currentMemoTitle, 
    currentMemoContent,
    currentProjectId 
  } = useChatStore();
  const { startTutorialManually } = useTutorialStore();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [chatSidebarWidth, setChatSidebarWidth] = useState(isTablet ? tabletChatSidebarWidth : defaultChatSidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

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

  // チャットサイドバーのリサイズ機能
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = window.innerWidth - e.clientX;
    
    // 現在の左サイドバーの幅を取得
    const currentLeftSidebarWidth = sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth;
    
    // 動的な最大幅を計算（メインコンテンツの最小幅を確保）
    const dynamicMaxWidth = window.innerWidth - currentLeftSidebarWidth - minMainContentWidth;
    
    const clampedWidth = Math.max(
      minChatSidebarWidth,
      Math.min(dynamicMaxWidth, newWidth)
    );
    
    setChatSidebarWidth(clampedWidth);
  }, [isResizing, sidebarOpen]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  // マウスイベントリスナーの管理
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleResize, handleResizeEnd]);

  // ウィンドウリサイズ時のチャット幅調整
  useEffect(() => {
    const handleWindowResize = () => {
      if (!isChatOpen) return;
      
      const currentLeftSidebarWidth = sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth;
      const dynamicMaxWidth = window.innerWidth - currentLeftSidebarWidth - minMainContentWidth;
      
      // チャット幅が新しい最大幅を超えている場合は調整
      if (chatSidebarWidth > dynamicMaxWidth) {
        setChatSidebarWidth(Math.max(minChatSidebarWidth, dynamicMaxWidth));
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isChatOpen, sidebarOpen, chatSidebarWidth]);

  // AI応答の処理
  const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
    try {
      // ユーザーIDを取得
      let userId = null;
      
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.state?.user?.id) {
            userId = parsed.state.user.id;
          }
        } catch (e) {
          console.error('認証データの解析に失敗:', e);
        }
      }

      if (!userId) {
        throw new Error('ユーザーIDが見つかりません。再ログインしてください。');
      }

      // 現在のメモコンテンツを使用
      const contextContent = currentMemoContent || memoContent;

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          message: message,
          memo_content: contextContent,
          page_id: chatPageId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI応答の取得に失敗しました:', error);
      throw error;
    }
  };

  interface MenuItem {
    text: string;
    icon: React.ReactNode;
    path: string;
    action?: () => void;
  }

  const mainListItems: MenuItem[] = [
    { text: 'ダッシュボード', icon: <TipsAndUpdates />, path: '/dashboard' },
    { text: '探究テーマを見つける・探す', icon: <Explore />, path: '/framework-games/theme-deep-dive' },
    { text: '探究クエスト掲示板!', icon: <Explore />, path: '/quests'}
  ];

  // 展開状態のサイドバー
  const fullDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, background: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
              探Qメイト
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', mt: 0.5 }}>
              探究学習支援アプリ
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
                  background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  background: 'rgba(5, 155, 255, 0.1)',
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

      {/* クエスト提案 */}
      <QuestSuggestion />

      <Divider />

      {/* AIチャット開始ボタン */}
      <Box sx={{ p: 2 }}>
        <Card 
          sx={{ 
            bgcolor: isChatOpen ? 'primary.light' : 'rgba(5, 155, 255, 0.1)',
            borderRadius: 2,
            cursor: 'pointer',
            '&:hover': {
              bgcolor: 'rgba(5, 155, 255, 0.2)',
            },
          }}
          onClick={toggleChat}
        >
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology color="primary" />
              <Typography variant="body2" fontWeight={600}>
                AIアシスタント
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              探究学習をサポート
            </Typography>
          </CardContent>
        </Card>
      </Box>

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
              bgcolor: 'rgba(5, 155, 255, 0.1)',
            },
          }}
          onClick={handleUserMenuOpen}
        >
          <Avatar sx={{ bgcolor: 'primary.main' }}>
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
        background: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)',
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
                  background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  background: 'rgba(5, 155, 255, 0.1)',
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

      {/* AIチャット開始ボタン（縮小版） */}
      <Box sx={{ p: 1 }}>
        <IconButton
          onClick={toggleChat}
          sx={{
            width: '100%',
            height: 48,
            borderRadius: 2,
            bgcolor: isChatOpen ? 'primary.light' : 'rgba(5, 155, 255, 0.1)',
            color: 'primary.main',
            '&:hover': {
              bgcolor: 'rgba(5, 155, 255, 0.2)',
            },
          }}
        >
          <Psychology />
        </IconButton>
      </Box>

      <Divider />
      
      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <IconButton
          onClick={handleUserMenuOpen}
          sx={{
            width: '100%',
            height: 48,
            borderRadius: 1,
            color: 'primary.main',
            '&:hover': {
              bgcolor: 'rgba(5, 155, 255, 0.1)',
            },
          }}
        >
          <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
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

        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            width: { 
              xs: '100%',
              sm: (() => {
                const leftWidth = sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth;
                const rightWidth = isChatOpen ? chatSidebarWidth : 0;
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

        {/* Right Chat Sidebar */}
        <AnimatePresence>
          {isChatOpen && (
            <Box
              component={motion.div}
              initial={{ width: 0 }}
              animate={{ width: chatSidebarWidth }}
              exit={{ width: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              sx={{
                width: chatSidebarWidth,
                minHeight: '100vh',
                backgroundColor: 'background.paper',
                borderLeft: 1,
                borderColor: 'divider',
                boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
                position: isMobile ? 'fixed' : 'relative',
                right: isMobile ? 0 : 'auto',
                top: isMobile ? 0 : 'auto',
                zIndex: isMobile ? 1200 : 'auto',
                overflow: 'hidden',
              }}
              className="chat-sidebar"
            >
              {/* リサイズハンドル */}
              <Box
                onMouseDown={handleResizeStart}
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: '8px',
                  height: '100%',
                  cursor: 'ew-resize',
                  backgroundColor: 'transparent',
                  borderRight: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                  },
                  zIndex: 1,
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '3px',
                    height: '40px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '2px',
                  }}
                />
              </Box>
              
              <Box sx={{ 
                height: '100vh', 
                display: 'flex', 
                flexDirection: 'column',
                pl: '8px', // リサイズハンドル分のパディング
              }}>
                {/* Chat Header */}
                <Box sx={{ 
                  p: 2, 
                  borderBottom: 1, 
                  borderColor: 'divider',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}>
                  <Box>
                    <Typography variant="h6" fontWeight={600}>
                      AIアシスタント
                    </Typography>
                    {currentMemoTitle && (
                      <Typography variant="body2" color="text.secondary">
                        現在のメモ: {currentMemoTitle}
                      </Typography>
                    )}
                  </Box>
                  <IconButton onClick={toggleChat} size="small">
                    <ChevronRight />
                  </IconButton>
                </Box>

                {/* Chat Content */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  {currentProjectId && chatPageId ? (
                    <AIChat
                      pageId={chatPageId}
                      title="AIアシスタント"
                      currentMemoContent={currentMemoContent}
                      currentMemoTitle={currentMemoTitle}
                      persistentMode={true}
                      loadHistoryFromDB={true}
                      onMessageSend={handleAIMessage}
                      initialMessage={`こんにちは！探究学習をサポートします。

${currentMemoTitle ? `現在「${currentMemoTitle}」を開いています。` : 'メモを開くと、その内容を参考にしながら'}以下のようなサポートができます：

• **内容の深掘り**: アイデアをさらに発展させる提案
• **構造化のアドバイス**: 情報をより分かりやすく整理する方法  
• **関連情報の提案**: 追加で調べると良い情報や資料
• **探究の方向性**: 学習をより深めるためのアプローチ

どのようなことでお困りですか？`}
                    />
                  ) : (
                    <Box sx={{ 
                      p: 3, 
                      textAlign: 'center',
                      color: 'text.secondary',
                      mt: 4,
                    }}>
                      <ChatIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                      <Typography variant="body1">
                        プロジェクトを選択してください
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        メモを開くとAIチャットが利用できます
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </AnimatePresence>

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

export default Layout;