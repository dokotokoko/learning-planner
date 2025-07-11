import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  Divider,
  Fab,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  AccessTime as TimeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FolderOpen as FolderIcon,
  Assignment as AssignmentIcon,
  Psychology as PsychologyIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import CreateProjectDialog from '../components/Project/CreateProjectDialog';
import EditProjectDialog from '../components/Project/EditProjectDialog';
import AIChat from '../components/MemoChat/AIChat';

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
  created_at: string;
  updated_at: string;
  memo_count: number;
}

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { isChatOpen, toggleChat } = useChatStore();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // プロジェクト一覧の取得
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('認証トークンが見つかりません。再ログインが必要です。');
      }

      const response = await fetch('http://localhost:8000/v2/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`プロジェクトの取得に失敗しました (${response.status})`);
      }
      
      const data = await response.json();
      setProjects(data);
      
    } catch (error) {
      console.error('プロジェクト取得エラー:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの取得でエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchProjects();
  }, [user, navigate]);

  // プロジェクト作成の処理
  const handleCreateProject = async (projectData: {
    theme: string;
    question?: string;
    hypothesis?: string;
  }) => {
    try {
      const token = localStorage.getItem('auth-token');
      
      const response = await fetch('http://localhost:8000/v2/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('プロジェクト作成エラー:', errorText);
        throw new Error('プロジェクトの作成に失敗しました');
      }
      
      await fetchProjects();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating project:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの作成に失敗しました');
    }
  };

  // プロジェクト編集の処理
  const handleEditProject = async (projectId: number, projectData: {
    theme: string;
    question?: string;
    hypothesis?: string;
  }) => {
    try {
      const token = localStorage.getItem('auth-token');
      
      if (!token) {
        setError('認証トークンがありません。再ログインしてください。');
        return;
      }

      const response = await fetch(`http://localhost:8000/v2/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(projectData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('プロジェクト編集エラー:', errorText);
        
        if (response.status === 403) {
          throw new Error('アクセス権限がありません。再ログインしてください。');
        } else if (response.status === 404) {
          throw new Error('プロジェクトが見つかりません。');
        } else {
          throw new Error(`プロジェクトの更新に失敗しました (エラーコード: ${response.status})`);
        }
      }
      
      // プロジェクト一覧を再読み込み
      await fetchProjects();
      setIsEditDialogOpen(false);
      setSelectedProject(null);
      
    } catch (error) {
      console.error('プロジェクト編集でエラー:', error);
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        setError('サーバーに接続できません。バックエンドサーバーが起動しているか確認してください。');
      } else {
        setError(error instanceof Error ? error.message : 'プロジェクトの更新でエラーが発生しました');
      }
    }
  };

  // プロジェクト削除の処理
  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('このプロジェクトを削除しますか？関連するメモも全て削除されます。')) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`http://localhost:8000/v2/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('プロジェクトの削除に失敗しました');
      
      await fetchProjects();
      setMenuAnchor(null);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  // プロジェクトメニューハンドラー
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedProject(project);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    // selectedProject はここではクリアしない（ダイアログで使用するため）
  };

  // ローディング状態
  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  // エラー状態
  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">プロジェクトの読み込みに失敗しました</Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
        
        <Button variant="contained" onClick={fetchProjects} sx={{ mr: 2 }}>
          再試行
        </Button>
        
        <Button variant="outlined" onClick={() => navigate('/login')}>
          ログイン画面へ
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* タイトルとAIチャットボタン */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 4 
        }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            探究ダッシュボード
          </Typography>
          <Button
            variant="contained"
            startIcon={<PsychologyIcon />}
            onClick={toggleChat}
            sx={{
              background: 'linear-gradient(45deg, #059BFF, #006EB8)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #52BAFF, #00406B)',
              },
              borderRadius: 2,
              px: 3,
              py: 1.5,
            }}
          >
            AIアシスタント
          </Button>
        </Box>

        {/* 既存のコンテンツ（以下は変更なし） */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            探究プロジェクト
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateDialogOpen(true)}
            sx={{
              background: 'linear-gradient(45deg, #059BFF, #006EB8)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #52BAFF, #00406B)',
              },
            }}
          >
            新しいプロジェクト
          </Button>
        </Box>

        {/* プロジェクト一覧 */}
        <Box sx={{ mb: 4 }}>
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : projects.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                まだプロジェクトがありません
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                新しいプロジェクトを作成して、探究を始めましょう
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIsCreateDialogOpen(true)}
                sx={{
                  background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #52BAFF, #00406B)',
                  },
                }}
              >
                最初のプロジェクトを作成
              </Button>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <AnimatePresence>
                {projects.map((project) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                        },
                      }}
                      onClick={() => navigate(`/projects/${project.id}`)}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                              {project.theme}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 2 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, project)}
                            sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                          >
                            <MoreIcon />
                          </IconButton>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </Box>
          )}
        </Box>

        {/* AIチャット */}
        <AnimatePresence>
          {isChatOpen && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '400px',
                height: '100vh',
                zIndex: 1300,
                background: 'white',
                boxShadow: '-4px 0 20px rgba(0,0,0,0.15)',
              }}
            >
              <AIChat
                pageId="dashboard"
                title="探究ダッシュボード"
                onClose={toggleChat}
                persistentMode={true}
                enableSmartNotifications={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ダイアログ */}
        <CreateProjectDialog
          open={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onSubmit={handleCreateProject}
        />

        <EditProjectDialog
          open={isEditDialogOpen}
          project={selectedProject}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedProject(null);
          }}
          onSubmit={handleEditProject}
        />

        {/* コンテキストメニュー */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              if (selectedProject) {
                setIsEditDialogOpen(true);
              }
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>編集</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedProject) {
                handleDeleteProject(selectedProject.id);
              }
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>削除</ListItemText>
          </MenuItem>
        </Menu>
      </motion.div>
    </Container>
  );
};

export default DashboardPage; 