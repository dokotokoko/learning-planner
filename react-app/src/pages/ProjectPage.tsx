import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Fab,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Breadcrumbs,
  Link,
  TextField,
  ClickAwayListener,
  CircularProgress,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Psychology as PsychologyIcon,
  Chat as ChatIcon,
  Description as DescriptionIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
  created_at: string;
  updated_at: string;
}

interface Memo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const ProjectPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuthStore();
  const { isChatOpen, toggleChat, setCurrentProject } = useChatStore();

  const [project, setProject] = useState<Project | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

  // インライン編集の状態
  const [editingField, setEditingField] = useState<'question' | 'hypothesis' | null>(null);
  const [editingValue, setEditingValue] = useState('');


  // プロジェクト情報の取得
  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('プロジェクトの取得に失敗しました');
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  // メモ一覧の取得
  const fetchMemos = async () => {
    try {
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchMemos();
      // Layout.tsxのAIチャット用にプロジェクトIDを設定
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject]);

  // AIチャットをデフォルトで開く
  useEffect(() => {
    if (user && !isChatOpen) {
      setTimeout(() => toggleChat(), 500);
    }
  }, [user, isChatOpen, toggleChat]);

  // プロジェクト更新の処理
  const updateProject = async (field: 'question' | 'hypothesis', value: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const updateData = {
        theme: project!.theme,
        question: field === 'question' ? value : project!.question,
        hypothesis: field === 'hypothesis' ? value : project!.hypothesis,
      };

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) throw new Error('プロジェクトの更新に失敗しました');
      
      await fetchProject();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  };

  // インライン編集の開始
  const startEditing = (field: 'question' | 'hypothesis') => {
    setEditingField(field);
    setEditingValue(project?.[field] || '');
  };

  // インライン編集の保存
  const saveEdit = async () => {
    if (editingField && editingValue.trim() !== (project?.[editingField] || '')) {
      await updateProject(editingField, editingValue.trim());
    }
    setEditingField(null);
    setEditingValue('');
  };

  // インライン編集のキャンセル
  const cancelEdit = () => {
    setEditingField(null);
    setEditingValue('');
  };

  // 新規メモの作成（ワンクリック）
  const handleCreateMemo = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/projects/${projectId}/memos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: '',
          content: '',
        }),
      });

      if (!response.ok) throw new Error('メモの作成に失敗しました');
      
      const newMemo = await response.json();
      // 新規作成されたメモの編集画面に遷移
      navigate(`/app/projects/${projectId}/memos/${newMemo.id}`);
    } catch (error) {
      console.error('Error creating memo:', error);
    }
  };

  // メモ削除の処理
  const handleDeleteMemo = async (memoId: number) => {
    if (!confirm('このメモを削除しますか？')) return;

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
      
      await fetchMemos();
      setMenuAnchor(null);
      setSelectedMemo(null);
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  // メモカードのメニューハンドラー
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, memo: Memo) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setSelectedMemo(memo);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMemo(null);
  };

  const getContentPreview = (content: string): string => {
    // HTMLタグを除去してプレーンテキストを取得
    const cleanContent = content.replace(/<[^>]*>/g, '').trim();
    
    return cleanContent.length > 100 
      ? cleanContent.substring(0, 100) + '...'
      : cleanContent;
  };

  // AIチャットが開いているかどうかに基づいてGrid列数を動的に計算
  const getGridColumns = () => {
    if (isMobile) {
      return 1; // モバイルでは常に1列
    }
    
    if (isChatOpen) {
      // AIチャットが開いている時は少し列数を減らす
      return 2;
    } else {
      // AIチャットが閉じている時は通常の列数
      return 3;
    }
  };

  const getGridItemProps = () => {
    const columns = getGridColumns();
    if (isMobile) {
      return { xs: 12 };
    }
    
    if (columns === 2) {
      return { xs: 12, sm: 6, md: 6 };
    } else {
      return { xs: 12, sm: 6, md: 4 };
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  if (!project) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>プロジェクトが見つかりません</Typography>
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
            探究プロジェクト
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

        {/* プロジェクト情報 */}
        {project && (
          <Card sx={{ mb: 4, borderRadius: 3 }}>
            <CardContent sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                {project.theme}
              </Typography>

              {/* 問い */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  問い
                </Typography>
                {editingField === 'question' ? (
                  <ClickAwayListener onClickAway={saveEdit}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        multiline
                        rows={2}
                      />
                      <IconButton onClick={saveEdit} color="primary">
                        <CheckIcon />
                      </IconButton>
                      <IconButton onClick={cancelEdit}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </ClickAwayListener>
                ) : (
                  <Box
                    onClick={() => startEditing('question')}
                    sx={{
                      p: 2,
                      border: '1px dashed #ddd',
                      borderRadius: 1,
                      cursor: 'pointer',
                      minHeight: 60,
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <Typography color={project.question ? 'text.primary' : 'text.secondary'}>
                      {project.question || 'クリックして問いを設定...'}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* 仮説 */}
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  仮説
                </Typography>
                {editingField === 'hypothesis' ? (
                  <ClickAwayListener onClickAway={saveEdit}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <TextField
                        fullWidth
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') saveEdit();
                          if (e.key === 'Escape') cancelEdit();
                        }}
                        autoFocus
                        multiline
                        rows={2}
                      />
                      <IconButton onClick={saveEdit} color="primary">
                        <CheckIcon />
                      </IconButton>
                      <IconButton onClick={cancelEdit}>
                        <CloseIcon />
                      </IconButton>
                    </Box>
                  </ClickAwayListener>
                ) : (
                  <Box
                    onClick={() => startEditing('hypothesis')}
                    sx={{
                      p: 2,
                      border: '1px dashed #ddd',
                      borderRadius: 1,
                      cursor: 'pointer',
                      minHeight: 60,
                      display: 'flex',
                      alignItems: 'center',
                      '&:hover': {
                        backgroundColor: '#f5f5f5',
                      },
                    }}
                  >
                    <Typography color={project.hypothesis ? 'text.primary' : 'text.secondary'}>
                      {project.hypothesis || 'クリックして仮説を設定...'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* メモ一覧 */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            メモ
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateMemo}
            sx={{
              background: 'linear-gradient(45deg, #059BFF, #006EB8)',
              color: 'white',
              '&:hover': {
                background: 'linear-gradient(45deg, #52BAFF, #00406B)',
              },
            }}
          >
            新しいメモ
          </Button>
        </Box>

        <Grid container spacing={3}>
          <AnimatePresence>
            {memos.map((memo) => (
              <Grid item {...getGridItemProps()} key={memo.id}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                      },
                    }}
                    onClick={() => navigate(`/app/projects/${projectId}/memos/${memo.id}`)}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, flexGrow: 1, pr: 1 }}>
                          {memo.title}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, memo)}
                          sx={{ opacity: 0.7, '&:hover': { opacity: 1 } }}
                        >
                          <MoreIcon />
                        </IconButton>
                      </Box>
                      
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          lineHeight: 1.5,
                          minHeight: '3.5em',
                        }}
                      >
                        {getContentPreview(memo.content)}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 1 }}>
                        <DescriptionIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(memo.updated_at).toLocaleDateString('ja-JP')}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>

        {memos.length === 0 && !isLoading && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <DescriptionIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              まだメモがありません
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              新しいメモを作成して、探究の記録を始めましょう
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateMemo}
              sx={{
                background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #52BAFF, #00406B)',
                },
              }}
            >
              最初のメモを作成
            </Button>
          </Box>
        )}


        {/* メニュー */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem
            onClick={() => {
              if (selectedMemo) {
                navigate(`/app/projects/${projectId}/memos/${selectedMemo.id}`);
              }
              handleMenuClose();
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            編集
          </MenuItem>
          <MenuItem
            onClick={() => {
              if (selectedMemo) {
                handleDeleteMemo(selectedMemo.id);
              }
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
            削除
          </MenuItem>
        </Menu>

        {/* ローディング */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
      </motion.div>
    </Container>
  );
};

export default ProjectPage; 