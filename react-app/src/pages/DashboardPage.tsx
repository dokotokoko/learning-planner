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
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  AccessTime as TimeIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  FolderOpen as FolderIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import CreateProjectDialog from '../components/Project/CreateProjectDialog';
import EditProjectDialog from '../components/Project/EditProjectDialog';

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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ヘッダー */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            探究ダッシュボード
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {user?.username}さんの探究プロジェクト ({projects.length}件)
          </Typography>
        </Box>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsCreateDialogOpen(true)}
        >
          新しいプロジェクト
        </Button>
      </Box>

      {/* プロジェクトが0件の場合 */}
      {projects.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'grey.50',
              border: '2px dashed',
              borderColor: 'grey.300',
            }}
          >
            <FolderIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
            <Typography variant="h5" gutterBottom color="text.secondary">
              まだプロジェクトがありません
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              最初のプロジェクトを作成して、探究学習を始めましょう！
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              最初のプロジェクトを作成
            </Button>
          </Paper>
        </motion.div>
      )}

      {/* プロジェクト一覧 - リスト形式 */}
      {projects.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Paper sx={{ boxShadow: 1, borderRadius: 3, overflow: 'hidden' }}>
            <List sx={{ p: 0 }}>
              {projects.map((project, index) => (
                <React.Fragment key={project.id}>
                  <ListItem
                    sx={{
                      py: 2,
                      px: 3,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: 'action.hover',
                      },
                    }}
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <ListItemIcon sx={{ minWidth: 48 }}>
                      <AssignmentIcon color="primary" />
                    </ListItemIcon>
                    
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" fontWeight="bold">
                            {project.theme}
                          </Typography>
                          <Chip
                            icon={<TimeIcon />}
                            label={format(new Date(project.updated_at), 'yyyy/MM/dd HH:mm', { locale: ja })}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.75rem' }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          {project.question && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              <strong>問い:</strong> {project.question}
                            </Typography>
                          )}
                          {project.hypothesis && (
                            <Typography variant="body2" color="text.secondary">
                              <strong>仮説:</strong> {project.hypothesis}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, project)}
                        sx={{ mr: 1 }}
                      >
                        <MoreIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  
                  {index < projects.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </motion.div>
      )}

      {/* プロジェクト作成ダイアログ */}
      <CreateProjectDialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={handleCreateProject}
      />

      {/* プロジェクト編集ダイアログ */}
      <EditProjectDialog
        open={isEditDialogOpen}
        project={selectedProject}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedProject(null);
        }}
        onSubmit={handleEditProject}
      />

      {/* プロジェクトメニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          setIsEditDialogOpen(true);
          setMenuAnchor(null);
        }}>
          <EditIcon sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedProject) {
            handleDeleteProject(selectedProject.id);
          }
          setMenuAnchor(null);
          setSelectedProject(null);
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default DashboardPage; 