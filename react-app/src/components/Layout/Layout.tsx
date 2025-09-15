// react-app/src/components/Layout/Layout.tsx
import React, { useState, useMemo, memo, useCallback, useRef, useEffect } from 'react';
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
  Card,
  CardContent,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  TipsAndUpdates,
  Psychology,
  ChevronRight,
  ExpandMore,
  Explore,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import AIChat from '../MemoChat/AIChat';
import { AI_INITIAL_MESSAGE } from '../../constants/aiMessages';

const drawerWidth = 280;
const tabletDrawerWidth = 240;
const collapsedDrawerWidth = 64;
const chatSidebarWidthDefault = 400;
const chatSidebarWidthMin = 320;
const chatSidebarWidthMax = 720;

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

  const { user, logout } = useAuthStore();
  const {
    isChatOpen,
    isHydrated,
    toggleChat,
    chatPageId,
    currentMemoContent,
  } = useChatStore();

  // 現在のページに基づくチャットページIDを生成
  const getEffectiveChatPageId = useCallback(() => {
    if (chatPageId) return chatPageId;

    const projectMatch = location.pathname.match(/\/projects\/(\d+)/);
    if (projectMatch) {
      return `project-${projectMatch[1]}`;
    }
    return `general-${location.pathname.replace(/\//g, '-')}`;
  }, [chatPageId, location.pathname]);

  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null);
  const [chatWidth, setChatWidth] = useState<number>(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('chat-sidebar-width') : null;
    const n = saved ? parseInt(saved, 10) : chatSidebarWidthDefault;
    return isNaN(n) ? chatSidebarWidthDefault : Math.min(chatSidebarWidthMax, Math.max(chatSidebarWidthMin, n));
  });
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(chatWidth);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleSidebarToggle = () => setSidebarOpen(!sidebarOpen);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setUserMenuAnchor(null);
  };

  const handleUserMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget);
  };
  const handleUserMenuClose = () => setUserMenuAnchor(null);
  // リサイズ用ハンドラ
  const onResizeMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startWidthRef.current = chatWidth;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = startXRef.current - e.clientX;
      const next = Math.min(chatSidebarWidthMax, Math.max(chatSidebarWidthMin, startWidthRef.current + delta));
      setChatWidth(next);
    };
    const onMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      try { localStorage.setItem('chat-sidebar-width', String(chatWidth)); } catch {}
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [chatWidth]);

  // AI応答の送信処理
  const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
    // ユーザーIDをローカルストレージから取得
    let userId: string | null = null;
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        if (parsed.state?.user?.id) {
          userId = parsed.state.user.id;
        }
      } catch (e) {
        console.error('認証データの解析に失敗しました', e);
      }
    }

    if (!userId) {
      throw new Error('ユーザーIDが見つかりません。ログインしてください');
    }

    const contextContent = currentMemoContent || memoContent || '';
    const apiBaseUrl = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';

    const response = await fetch(`${apiBaseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userId}`,
      },
      credentials: 'include',
      body: JSON.stringify({
        message,
        memo_content: contextContent,
        page_id: getEffectiveChatPageId(),
      }),
    });

    if (!response.ok) {
      let errorDetail = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        errorDetail += ` - ${JSON.stringify(errorData)}`;
      } catch {
        try {
          const errorText = await response.text();
          errorDetail += ` - ${errorText}`;
        } catch {}
      }
      throw new Error(errorDetail);
    }

    const data = await response.json();
    return data.response;
  };

  interface NavItem {
    text: string;
    icon: React.ReactNode;
    path: string;
    action?: () => void;
  }

  const mainListItems: NavItem[] = useMemo(() => [
    { text: 'ダッシュボード', icon: <TipsAndUpdates />, path: '/dashboard' },
    { text: '探究テーマを見つける・探る', icon: <Explore />, path: '/framework-games/theme-deep-dive' },
    { text: '対話エージェント検証', icon: <Psychology />, path: '/conversation-agent-test' },
  ], []);

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
              あなたの学びのパートナー
            </Typography>
          </Box>
          <IconButton onClick={handleSidebarToggle} sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
            <MenuIcon />
          </IconButton>
        </Box>
      </Box>

      <List sx={{ flex: 1, px: 1 }}>
        {mainListItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                if (item.action) item.action(); else if (item.path !== '#') navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                },
                '&:hover': { background: 'rgba(5, 155, 255, 0.1)' },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} primaryTypographyProps={{ fontSize: '0.9rem', fontWeight: location.pathname === item.path ? 600 : 400 }} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* AIチャット開始カード */}
      <Box sx={{ p: 2 }}>
        <Card sx={{ bgcolor: (isHydrated && isChatOpen) ? 'primary.light' : 'rgba(5, 155, 255, 0.1)', borderRadius: 2, cursor: 'pointer', '&:hover': { bgcolor: 'rgba(5, 155, 255, 0.2)' } }} onClick={toggleChat}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Psychology color="primary" />
              <Typography variant="body2" fontWeight={600}>AIアシスタント</Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">探究学習をサポート</Typography>
          </CardContent>
        </Card>
      </Box>

      <Divider />

      {/* ユーザーエリア */}
      <Box sx={{ p: 2 }}>
        <Box onClick={handleUserMenuOpen} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, cursor: 'pointer', p: 1, borderRadius: 1, '&:hover': { bgcolor: 'rgba(5, 155, 255, 0.1)' } }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>{user?.username?.charAt(0).toUpperCase()}</Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={600}>{user?.username}</Typography>
            <Typography variant="caption" color="text.secondary">ログイン中</Typography>
          </Box>
          <ExpandMore sx={{ color: 'text.secondary' }} />
        </Box>
      </Box>
    </Box>
  );

  // 縮小状態のサイドバー
  const collapsedDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 1.5, background: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)', display: 'flex', justifyContent: 'center' }}>
        <IconButton onClick={handleSidebarToggle} sx={{ color: 'white', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}>
          <MenuIcon />
        </IconButton>
      </Box>

      <List sx={{ flex: 1, px: 0.5 }}>
        {mainListItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => { if (item.action) item.action(); else if (item.path !== '#') navigate(item.path); }}
              sx={{ borderRadius: 2, justifyContent: 'center', minHeight: 48, '&.Mui-selected': { background: 'linear-gradient(45deg, #059BFF, #006EB8)', color: 'white', '& .MuiListItemIcon-root': { color: 'white' } }, '&:hover': { background: 'rgba(5, 155, 255, 0.1)' } }}
            >
              <ListItemIcon sx={{ minWidth: 'auto', justifyContent: 'center' }}>{item.icon}</ListItemIcon>
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* AIチャットトグル（縮小版） */}
      <Box sx={{ p: 1 }}>
        <IconButton onClick={toggleChat} sx={{ width: '100%', height: 48, borderRadius: 2, bgcolor: (isHydrated && isChatOpen) ? 'primary.light' : 'rgba(5, 155, 255, 0.1)', color: 'primary.main', '&:hover': { bgcolor: 'rgba(5, 155, 255, 0.2)' } }}>
          <Psychology />
        </IconButton>
      </Box>

      <Divider />

      <Box sx={{ p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <IconButton onClick={handleUserMenuOpen} sx={{ width: '100%', height: 48, borderRadius: 1, color: 'primary.main', '&:hover': { bgcolor: 'rgba(5, 155, 255, 0.1)' } }}>
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
        <Box component="nav" sx={{ width: { xs: 0, sm: isTablet ? (sidebarOpen ? tabletDrawerWidth : collapsedDrawerWidth) : 0, md: sidebarOpen ? drawerWidth : collapsedDrawerWidth }, flexShrink: { sm: 0 }, transition: 'width 0.3s ease' }}>
          <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, border: 'none', boxShadow: '2px 0 10px rgba(0,0,0,0.1)' } }}>
            {fullDrawer}
          </Drawer>

          <Drawer variant="permanent" sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth, border: 'none', boxShadow: '2px 0 10px rgba(0,0,0,0.1)', transition: 'width 0.3s ease', overflowX: 'hidden' } }} open>
            {sidebarOpen ? fullDrawer : collapsedDrawer}
          </Drawer>
        </Box>

        {/* Main content */}
        <Box component="main" sx={{ flexGrow: 1, width: { xs: '100%', sm: (() => { const leftWidth = sidebarOpen ? (isTablet ? tabletDrawerWidth : drawerWidth) : collapsedDrawerWidth; const rightWidth = (isHydrated && isChatOpen) ? chatWidth : 0; const handleWidth = (!isMobile && isHydrated && isChatOpen) ? 6 : 0; return `calc(100% - ${leftWidth}px - ${rightWidth + handleWidth}px)`; })() }, height: '100vh', overflow: 'auto', transition: 'width 0.12s ease' }}>
          {/* モバイル用のメニューボタン */}
          <Box sx={{ display: { xs: 'block', sm: 'none' }, p: 1 }}>
            <IconButton color="primary" onClick={handleDrawerToggle} sx={{ mb: 1 }}>
              <MenuIcon />
            </IconButton>
          </Box>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }} style={{ height: '100%' }}>
            <Outlet />
          </motion.div>
        </Box>

        {/* Right Chat Sidebar */}
        <AnimatePresence>
          {isHydrated && isChatOpen && (
            <>
            {!isMobile && (
              <Box onMouseDown={onResizeMouseDown} sx={{ width: 6, height: '100vh', cursor: 'col-resize', backgroundColor: 'transparent', '&:hover': { backgroundColor: 'action.hover' } }} title="チャット幅をドラッグで調整" />
            )}
            <Box component={motion.div} initial={{ width: 0 }} animate={{ width: isMobile ? '100%' : chatWidth }} exit={{ width: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} sx={{ width: isMobile ? '100%' : chatWidth, height: '100vh', backgroundColor: 'background.paper', borderLeft: 1, borderColor: 'divider', boxShadow: '-2px 0 10px rgba(0,0,0,0.1)', position: isMobile ? 'fixed' : 'relative', right: isMobile ? 0 : 'auto', top: isMobile ? 0 : 'auto', zIndex: isMobile ? 1200 : 'auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="chat-sidebar">
              {/* Chat Header */}
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h6" fontWeight={600}>AIアシスタント</Typography>
                </Box>
                <IconButton onClick={toggleChat} size="small">
                  <ChevronRight />
                </IconButton>
              </Box>

              {/* Chat Content */}
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <AIChat
                  pageId={getEffectiveChatPageId()}
                  title="AIアシスタント"
                  persistentMode={true}
                  loadHistoryFromDB={true}
                  onMessageSend={handleAIMessage}
                  initialMessage={AI_INITIAL_MESSAGE}
                />
              </Box>
            </Box>
            </>
          )}
        </AnimatePresence>

        {/* ユーザーメニュー */}
        <Menu anchorEl={userMenuAnchor} open={Boolean(userMenuAnchor)} onClose={handleUserMenuClose} anchorOrigin={{ vertical: 'top', horizontal: 'center' }} transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
          <MenuItem onClick={handleLogout}>
            <ChevronRight sx={{ mr: 1 }} />
            ログアウト
          </MenuItem>
        </Menu>
      </Box>
    </LayoutContext.Provider>
  );
};

export default memo(Layout);

