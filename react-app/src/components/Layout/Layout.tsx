// react-app/src/components/Layout/Layout.tsx
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
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
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Home,
  TipsAndUpdates,
  QuestionAnswer,
  Logout,
  DarkMode,
  LightMode,
  AccountCircle,
  Note as MemoIcon,
  Psychology,
  AccountTree,
  EmojiEvents,
  EmojiEvents,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Link } from 'react-router-dom';

const drawerWidth = 280;
const collapsedDrawerWidth = 64;

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
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode } = useThemeStore();
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
    navigate('/login');
  };

  const mainListItems = [
    { text: 'ホーム', icon: <Home />, path: '/home' },
    { text: 'ダッシュボード', icon: <TipsAndUpdates />, path: '/dashboard' },
    { text: 'マルチメモ', icon: <MemoIcon />, path: '/memos' },
    { text: 'クエスト掲示板', icon: <EmojiEvents />, path: '/quests' },
  ];

  // 展開状態のサイドバー
  const fullDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
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

      <List sx={{ flex: 1, px: 1 }}>
        {mainListItems.map((item) => (
          <ListItem key={item.text} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path);
                if (isMobile) setMobileOpen(false);
              }}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.1)',
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
      
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {user?.username}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ログイン中
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  // 縮小状態のサイドバー
  const collapsedDrawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ 
        p: 1.5, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
              onClick={() => navigate(item.path)}
              sx={{
                borderRadius: 2,
                justifyContent: 'center',
                minHeight: 48,
                '&.Mui-selected': {
                  background: 'linear-gradient(45deg, #667eea, #764ba2)',
                  color: 'white',
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
                '&:hover': {
                  background: 'rgba(102, 126, 234, 0.1)',
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
      
      <Box sx={{ p: 1, display: 'flex', justifyContent: 'center' }}>
        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
          {user?.username?.charAt(0).toUpperCase()}
        </Avatar>
      </Box>
    </Box>
  );

  return (
    <LayoutContext.Provider value={{ sidebarOpen, onSidebarToggle: handleSidebarToggle }}>
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* AppBar */}
      <AppBar
        position="fixed"
        sx={{
            width: { 
              xs: '100%',
              md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : `calc(100% - ${collapsedDrawerWidth}px)`
            },
            ml: { 
              xs: 0,
              md: sidebarOpen ? `${drawerWidth}px` : `${collapsedDrawerWidth}px`
            },
            transition: 'width 0.3s ease, margin-left 0.3s ease',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'text.primary',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {mainListItems.find(item => item.path === location.pathname)?.text || 'ホーム'}
          </Typography>

          <IconButton color="inherit" onClick={toggleDarkMode}>
            {isDarkMode ? <LightMode /> : <DarkMode />}
          </IconButton>
          
          <IconButton color="inherit" onClick={handleProfileMenuOpen}>
            <AccountCircle />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
          sx={{ 
            width: { 
              xs: 0,
              md: sidebarOpen ? drawerWidth : collapsedDrawerWidth
            },
            flexShrink: { md: 0 },
            transition: 'width 0.3s ease',
          }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
            },
          }}
        >
            {fullDrawer}
        </Drawer>
        
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
                width: sidebarOpen ? drawerWidth : collapsedDrawerWidth,
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
              md: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : `calc(100% - ${collapsedDrawerWidth}px)`
            },
          minHeight: '100vh',
          pt: '64px', // AppBar height
            transition: 'width 0.3s ease',
        }}
      >
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

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          ログアウト
        </MenuItem>
      </Menu>
    </Box>
    </LayoutContext.Provider>
  );
};

export default Layout;