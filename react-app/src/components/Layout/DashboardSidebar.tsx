import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  CircularProgress,
  Alert,
  Skeleton,
  Menu,
  MenuItem,
  Breadcrumbs,
  Link,
  TextField,
  Paper,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreIcon,
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ChevronLeft,
  ArrowBack,
  Save as SaveIcon,
  Cancel as CancelIcon,
  NoteAdd as NoteAddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import CreateProjectDialog from '../Project/CreateProjectDialog';
import EditProjectDialog from '../Project/EditProjectDialog';
import MemoEditor from '../MemoEditor';

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
  created_at: string;
  updated_at: string;
  memo_count: number;
}

interface Memo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  project_id?: number;
}

interface DashboardSidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  width: number;
  isMobile?: boolean;
}

type ViewMode = 'projects' | 'project-detail' | 'memo-detail' | 'memo-create';

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ isOpen, onToggle, width, isMobile = false }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { setCurrentMemo, updateMemoContent, setCurrentProject } = useChatStore();
  
  // 表示モードと選択状態
  const [viewMode, setViewMode] = useState<ViewMode>('projects');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  
  // データ
  const [projects, setProjects] = useState<Project[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // ダイアログ状態
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<Project | null>(null);
  const [memoMenuAnchor, setMemoMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuMemo, setMenuMemo] = useState<Memo | null>(null);
  
  // メモ編集状態
  const [memoContent, setMemoContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // プロジェクト一覧の取得
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      if (!token) {
        throw new Error('認証トークンが見つかりません。');
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

  // メモ一覧の取得
  const fetchMemos = async (projectId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/projects/${projectId}/memos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setMemos(data);
    } catch (error) {
      console.error('Error fetching memos:', error);
      setError(error instanceof Error ? error.message : 'メモの取得でエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // メモの取得
  const fetchMemo = async (projectId: number, memoId: number) => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setSelectedMemo(data);
      const content = data.title ? `${data.title}\n\n${data.content}` : data.content;
      setMemoContent(content);
      
      // チャットストアにメモ情報を設定
      setCurrentMemo(data.title, data.content);
    } catch (error) {
      console.error('Error fetching memo:', error);
      setError(error instanceof Error ? error.message : 'メモの取得でエラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  // メモの保存
  const saveMemo = async () => {
    if (!selectedProject || (!selectedMemo && viewMode !== 'memo-create')) return;
    
    try {
      setIsSaving(true);
      const lines = memoContent.split('\n');
      const title = lines[0] || '無題のメモ';
      const content = lines.slice(2).join('\n');
      
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      
      if (viewMode === 'memo-create') {
        // 新規作成
        const response = await fetch(`${apiBaseUrl}/projects/${selectedProject.id}/memos`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ title, content }),
        });

        if (!response.ok) throw new Error('メモの作成に失敗しました');
        
        const newMemo = await response.json();
        setSelectedMemo(newMemo);
        setViewMode('memo-detail');
        await fetchMemos(selectedProject.id);
      } else if (selectedMemo) {
        // 更新
        const response = await fetch(`${apiBaseUrl}/memos/${selectedMemo.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          credentials: 'include',
          body: JSON.stringify({ title, content, project_id: selectedProject.id }),
        });

        if (!response.ok) throw new Error('メモの更新に失敗しました');
        
        const updatedMemo = await response.json();
        setSelectedMemo(updatedMemo);
        await fetchMemos(selectedProject.id);
      }
      
      // チャットストアにメモ情報を更新
      updateMemoContent(content);
    } catch (error) {
      console.error('Error saving memo:', error);
      setError(error instanceof Error ? error.message : 'メモの保存でエラーが発生しました');
    } finally {
      setIsSaving(false);
    }
  };

  // メモの削除
  const deleteMemo = async (memoId: number) => {
    if (!selectedProject || !confirm('このメモを削除しますか？')) return;
    
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('メモの削除に失敗しました');
      
      await fetchMemos(selectedProject.id);
      if (selectedMemo?.id === memoId) {
        setViewMode('project-detail');
        setSelectedMemo(null);
        setMemoContent('');
      }
    } catch (error) {
      console.error('Error deleting memo:', error);
      setError(error instanceof Error ? error.message : 'メモの削除でエラーが発生しました');
    }
  };

  useEffect(() => {
    if (user && isOpen && viewMode === 'projects') {
      fetchProjects();
    }
  }, [user, isOpen, viewMode]);

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
        throw new Error('プロジェクトの更新に失敗しました');
      }
      
      await fetchProjects();
      setIsEditDialogOpen(false);
      setMenuProject(null);
    } catch (error) {
      console.error('Error editing project:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの更新に失敗しました');
    }
  };

  // プロジェクト削除の処理
  const handleDeleteProject = async (projectId: number) => {
    if (!confirm('このプロジェクトを削除しますか？')) return;

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
      setMenuProject(null);
      if (selectedProject?.id === projectId) {
        setViewMode('projects');
        setSelectedProject(null);
      }
    } catch (error) {
      console.error('Error deleting project:', error);
      setError(error instanceof Error ? error.message : 'プロジェクトの削除に失敗しました');
    }
  };

  // プロジェクトクリックハンドラー
  const handleProjectClick = async (project: Project) => {
    setSelectedProject(project);
    setViewMode('project-detail');
    setCurrentProject(project.id.toString());
    await fetchMemos(project.id);
  };

  // メモクリックハンドラー
  const handleMemoClick = async (memo: Memo) => {
    if (selectedProject) {
      setViewMode('memo-detail');
      await fetchMemo(selectedProject.id, memo.id);
    }
  };

  // 新規メモ作成ハンドラー
  const handleCreateMemo = () => {
    setViewMode('memo-create');
    setSelectedMemo(null);
    setMemoContent('新しいメモ\n※改行して1行開ける\nここに内容を書いてください。');
  };

  // 戻るボタンハンドラー
  const handleBack = () => {
    if (viewMode === 'memo-detail' || viewMode === 'memo-create') {
      setViewMode('project-detail');
      setSelectedMemo(null);
      setMemoContent('');
    } else if (viewMode === 'project-detail') {
      setViewMode('projects');
      setSelectedProject(null);
      setMemos([]);
    }
  };

  // メニューハンドラー
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: Project) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setMenuProject(project);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleMemoMenuOpen = (event: React.MouseEvent<HTMLElement>, memo: Memo) => {
    event.stopPropagation();
    setMemoMenuAnchor(event.currentTarget);
    setMenuMemo(memo);
  };

  const handleMemoMenuClose = () => {
    setMemoMenuAnchor(null);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <Box
            component={motion.div}
            initial={{ width: 0 }}
            animate={{ width }}
            exit={{ width: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            sx={{
              width,
              height: '100vh',
              backgroundColor: 'background.paper',
              borderLeft: 1,
              borderColor: 'divider',
              boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              position: isMobile ? 'fixed' : 'relative',
              right: isMobile ? 0 : 'auto',
              top: isMobile ? 0 : 'auto',
              zIndex: isMobile ? 1200 : 'auto',
            }}
          >
            {/* Header */}
            <Box sx={{ 
              p: 2, 
              borderBottom: 1, 
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {viewMode !== 'projects' && (
                  <IconButton onClick={handleBack} size="small">
                    <ArrowBack />
                  </IconButton>
                )}
                <Typography variant="h6" fontWeight={600}>
                  {viewMode === 'projects' ? 'ダッシュボード' : 
                   viewMode === 'project-detail' ? selectedProject?.theme :
                   viewMode === 'memo-create' ? '新しいメモ' :
                   selectedMemo?.title}
                </Typography>
              </Box>
              <IconButton onClick={onToggle} size="small">
                <ChevronLeft />
              </IconButton>
            </Box>

            {/* Breadcrumbs */}
            {viewMode !== 'projects' && (
              <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
                <Breadcrumbs separator="›" aria-label="breadcrumb">
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => {
                      setViewMode('projects');
                      setSelectedProject(null);
                    }}
                    sx={{ cursor: 'pointer' }}
                  >
                    プロジェクト
                  </Link>
                  {selectedProject && (
                    <Link
                      component="button"
                      variant="body2"
                      onClick={() => viewMode !== 'project-detail' && setViewMode('project-detail')}
                      sx={{ cursor: viewMode === 'project-detail' ? 'default' : 'pointer' }}
                    >
                      {selectedProject.theme}
                    </Link>
                  )}
                  {(viewMode === 'memo-detail' || viewMode === 'memo-create') && (
                    <Typography variant="body2" color="text.primary">
                      {viewMode === 'memo-create' ? '新しいメモ' : selectedMemo?.title}
                    </Typography>
                  )}
                </Breadcrumbs>
              </Box>
            )}

            {/* Content */}
            <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              {isLoading ? (
                <Box>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 1, borderRadius: 1 }} />
                  ))}
                </Box>
              ) : error ? (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              ) : viewMode === 'projects' ? (
                <>
                  {/* プロジェクト一覧 */}
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => setIsCreateDialogOpen(true)}
                    sx={{
                      mb: 2,
                      background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                      '&:hover': {
                        background: 'linear-gradient(45deg, #52BAFF, #00406B)',
                      },
                    }}
                  >
                    新しいプロジェクト
                  </Button>

                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    探究プロジェクト
                  </Typography>

                  {projects.length === 0 ? (
                    <Card sx={{ textAlign: 'center', py: 3 }}>
                      <DescriptionIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        プロジェクトがありません
                      </Typography>
                    </Card>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {projects.map((project) => (
                        <ListItem
                          key={project.id}
                          disablePadding
                          sx={{ mb: 1 }}
                        >
                          <Card sx={{ width: '100%' }}>
                            <ListItemButton
                              onClick={() => handleProjectClick(project)}
                              sx={{ p: 1.5 }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body1" fontWeight={500} noWrap>
                                  {project.theme}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                  <CalendarIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                  <Typography variant="caption" color="text.secondary">
                                    {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                                  </Typography>
                                  {project.memo_count > 0 && (
                                    <Chip 
                                      label={`${project.memo_count} メモ`} 
                                      size="small" 
                                      sx={{ ml: 1 }}
                                    />
                                  )}
                                </Box>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMenuOpen(e, project)}
                                sx={{ ml: 1 }}
                              >
                                <MoreIcon fontSize="small" />
                              </IconButton>
                            </ListItemButton>
                          </Card>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              ) : viewMode === 'project-detail' ? (
                <>
                  {/* プロジェクト詳細とメモ一覧 */}
                  {selectedProject && (
                    <Box sx={{ mb: 2 }}>
                      {selectedProject.question && (
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            探究の問い
                          </Typography>
                          <Typography variant="body2">
                            {selectedProject.question}
                          </Typography>
                        </Box>
                      )}
                      {selectedProject.hypothesis && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            仮説
                          </Typography>
                          <Typography variant="body2">
                            {selectedProject.hypothesis}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<NoteAddIcon />}
                    onClick={handleCreateMemo}
                    sx={{ mb: 2 }}
                  >
                    新しいメモを作成
                  </Button>

                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1 }}>
                    メモ一覧
                  </Typography>

                  {memos.length === 0 ? (
                    <Card sx={{ textAlign: 'center', py: 3 }}>
                      <DescriptionIcon sx={{ fontSize: 36, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        メモがありません
                      </Typography>
                    </Card>
                  ) : (
                    <List sx={{ p: 0 }}>
                      {memos.map((memo) => (
                        <ListItem
                          key={memo.id}
                          disablePadding
                          sx={{ mb: 1 }}
                        >
                          <Card sx={{ width: '100%' }}>
                            <ListItemButton
                              onClick={() => handleMemoClick(memo)}
                              sx={{ p: 1.5 }}
                            >
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="body2" fontWeight={500} noWrap>
                                  {memo.title}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(memo.updated_at).toLocaleDateString('ja-JP')}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => handleMemoMenuOpen(e, memo)}
                                sx={{ ml: 1 }}
                              >
                                <MoreIcon fontSize="small" />
                              </IconButton>
                            </ListItemButton>
                          </Card>
                        </ListItem>
                      ))}
                    </List>
                  )}
                </>
              ) : (viewMode === 'memo-detail' || viewMode === 'memo-create') ? (
                <>
                  {/* メモ詳細/編集 */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                  </Box>

                  <Paper sx={{ p: 2, height: 'calc(100vh - 280px)' }}>
                    <MemoEditor
                      initialContent={memoContent}
                      onContentChange={(content) => {
                        setMemoContent(content);
                        const lines = content.split('\n');
                        const title = lines[0] || '';
                        const bodyContent = lines.slice(2).join('\n');
                        updateMemoContent(bodyContent);
                      }}
                      onSave={async (content) => {
                        // 自動保存実行
                        setMemoContent(content);
                        await saveMemo();
                      }}
                      placeholder="メモを入力してください..."
                    />
                  </Paper>
                </>
              ) : null}
            </Box>
          </Box>
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
        project={menuProject}
        onClose={() => {
          setIsEditDialogOpen(false);
          setMenuProject(null);
        }}
        onSubmit={handleEditProject}
      />

      {/* プロジェクトメニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (menuProject) {
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
            if (menuProject) {
              handleDeleteProject(menuProject.id);
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

      {/* メモメニュー */}
      <Menu
        anchorEl={memoMenuAnchor}
        open={Boolean(memoMenuAnchor)}
        onClose={handleMemoMenuClose}
      >
        <MenuItem
          onClick={() => {
            if (menuMemo) {
              deleteMemo(menuMemo.id);
            }
            handleMemoMenuClose();
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>削除</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
};

export default memo(DashboardSidebar);