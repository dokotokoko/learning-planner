import React, { useState, useEffect, memo, useMemo, useCallback } from 'react';
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
  useTheme,
  useMediaQuery,
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
import SimpleTutorial from '../components/Tutorial/SimpleTutorial';
import { simpleSteps } from '../components/Tutorial/DashboardTutorial';
import { createDashboardTutorial } from '../components/Tutorial/DashboardTutorial';

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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const { user, isNewUser } = useAuthStore();
  const { isChatOpen, toggleChat, clearCurrentMemo } = useChatStore();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  
  // SimpleTutorial用の状態管理
  const [showTutorial, setShowTutorial] = useState(false);
  
  // ユーザーが手動でチャットを操作したかどうかのフラグ
  const [hasUserToggledChat, setHasUserToggledChat] = useState(false);

  // ユーザーが手動でチャットをトグルする関数
  const handleUserToggleChat = () => {
    setHasUserToggledChat(true);
    toggleChat();
  };

  // ユーザーID取得の共通関数
  const getUserId = (): string | null => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        return parsed.state?.user?.id || null;
      } catch (e) {
        console.error('認証データの解析に失敗:', e);
        return null;
      }
    }
    return null;
  };

  // チュートリアル表示済みフラグの管理
  const getTutorialShownFlag = (): boolean => {
    const userId = getUserId();
    if (!userId) return false;
    
    const flag = localStorage.getItem(`tutorial-shown-${userId}`);
    return flag === 'true';
  };

  const setTutorialShownFlag = (): void => {
    const userId = getUserId();
    if (!userId) return;
    
    localStorage.setItem(`tutorial-shown-${userId}`, 'true');
  };

  // ダッシュボードページ初期化時の処理
  useEffect(() => {
    // メモ情報をクリアしてLayout.tsxのAIチャットを汎用モードにする
    clearCurrentMemo();
    
    // 初回ログイン時かつチュートリアル未表示の場合のみチュートリアルを開始
    if (isNewUser() && !getTutorialShownFlag()) {
      setTimeout(() => {
        setShowTutorial(true);
        setTutorialShownFlag(); // フラグを設定
      }, 1000);
    }
    
    // ログイン後はAIチャットを確実に開く（ユーザーが手動で操作していない場合のみ）
    if (user && !isChatOpen && !hasUserToggledChat) {
      setTimeout(() => toggleChat(), 500);
    }
  }, [user, isChatOpen, toggleChat, hasUserToggledChat, clearCurrentMemo]);

  // プロジェクト一覧の取得
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('認証トークンが見つかりません。再ログインが必要です。');
      }

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/users/${token}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
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
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      
      const response = await fetch(`${apiBaseUrl}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
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

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
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
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
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
    <>
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 2, sm: 4 },
          px: { xs: 2, sm: 3 }
        }} 
        data-tutorial="welcome-section"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >

        {/* タイトルとボタン群 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: 4 
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1.75rem', sm: '2.125rem' }
            }}
          >
            ダッシュボード
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: { xs: 1, sm: 2 },
            width: { xs: '100%', sm: 'auto' },
            justifyContent: { xs: 'flex-end', sm: 'flex-start' }
          }}>
            <Button
              variant="contained"
              startIcon={<PsychologyIcon />}
              onClick={handleUserToggleChat}
              data-tutorial="ai-chat-section"
              sx={{
                background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #52BAFF, #00406B)',
                },
                borderRadius: 2,
                px: { xs: 2, sm: 3 },
                py: 1.5,
                fontSize: { xs: '0.875rem', sm: '1rem' },
                minWidth: { xs: 'auto', sm: 'auto' }
              }}
            >
              <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>AIアシスタント</Box>
              <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>AI</Box>
            </Button>
          </Box>
        </Box>

        {/* 既存のコンテンツ（以下は変更なし） */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 0 },
          mb: 3 
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            探究プロジェクト
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setIsCreateDialogOpen(true)}
            data-tutorial="create-project-button"
            sx={{
              background: 'linear-gradient(45deg, #059BFF, #006EB8)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #52BAFF, #00406B)',
              },
              borderRadius: 2,
              px: { xs: 2, sm: 3 },
              py: 1.5,
              fontSize: { xs: '0.875rem', sm: '1rem' },
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            <Box sx={{ display: { xs: 'none', sm: 'inline' } }}>新しいプロジェクト</Box>
            <Box sx={{ display: { xs: 'inline', sm: 'none' } }}>プロジェクト作成</Box>
          </Button>
        </Box>

        {/* プロジェクト一覧 */}
        <Box sx={{ mb: 4 }} data-tutorial="project-list">
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : projects.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center', 
              py: { xs: 4, sm: 8 },
              px: { xs: 2, sm: 0 }
            }}>
              <DescriptionIcon sx={{ 
                fontSize: { xs: 48, sm: 64 }, 
                color: 'text.secondary', 
                mb: 2 
              }} />
              <Typography 
                variant="h6" 
                color="text.secondary" 
                gutterBottom
                sx={{ fontSize: { xs: '1.1rem', sm: '1.25rem' } }}
              >
                まだプロジェクトがありません
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                sx={{ 
                  mb: 3,
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  maxWidth: { xs: '280px', sm: 'none' },
                  mx: 'auto'
                }}
              >
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
                  borderRadius: 2,
                  px: { xs: 3, sm: 4 },
                  py: { xs: 1.5, sm: 2 },
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  width: { xs: '100%', sm: 'auto' },
                  maxWidth: { xs: '280px', sm: 'none' }
                }}
              >
                最初のプロジェクトを作成
              </Button>
            </Box>
          ) : (
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: { 
                xs: '1fr', 
                sm: 'repeat(2, 1fr)', 
                md: 'repeat(2, 1fr)',
                lg: 'repeat(3, 1fr)'
              },
              gap: { xs: 2, sm: 3 }
            }}>
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
                      onClick={() => navigate(`/app/projects/${project.id}`)}
                    >
                      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          gap: { xs: 1, sm: 2 }
                        }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 600, 
                                mb: 1,
                                fontSize: { xs: '1rem', sm: '1.25rem' },
                                lineHeight: 1.3,
                                wordBreak: 'break-word'
                              }}
                            >
                              {project.theme}
                            </Typography>
                            <Box sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: { xs: 1, sm: 2 }, 
                              mt: 2,
                              flexWrap: 'wrap'
                            }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <CalendarIcon 
                                  fontSize="small" 
                                  sx={{ 
                                    color: 'text.secondary',
                                    fontSize: { xs: '16px', sm: '20px' }
                                  }} 
                                />
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
                                >
                                  {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                          
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, project)}
                            sx={{ 
                              opacity: 0.7, 
                              '&:hover': { opacity: 1 },
                              p: { xs: 1, sm: 1.5 }
                            }}
                          >
                            <MoreIcon sx={{ fontSize: { xs: '20px', sm: '24px' } }} />
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
      
      {/* SimpleTutorial */}
      <SimpleTutorial
        steps={simpleSteps}
        isOpen={showTutorial}
        spotlightClicks={false} // チュートリアル中はハイライトされた要素のクリックを無効化
        onClose={() => {
          setShowTutorial(false);
          setTutorialShownFlag(); // チュートリアルを閉じた時もフラグを設定
        }}
        onComplete={() => {
          setShowTutorial(false);
          setTutorialShownFlag(); // チュートリアル完了時もフラグを設定
        }}
        onStepChange={(stepIndex) => {
          // AIアシスタントのステップ（index 5）の場合、チャットを開く
          if (stepIndex === 5 && !isChatOpen) {
            toggleChat(); // チュートリアル中は自動開閉なのでフラグは設定しない
          }
        }}
      />
    </>
  );
};

export default memo(DashboardPage); 