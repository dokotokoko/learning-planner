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
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Check as CheckIcon,
  Close as CloseIcon,
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
  const { isChatOpen } = useChatStore();

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
      const response = await fetch(`http://localhost:8000/v2/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      const response = await fetch(`http://localhost:8000/v2/projects/${projectId}/memos`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
    }
  }, [projectId]);

  // プロジェクト更新の処理
  const updateProject = async (field: 'question' | 'hypothesis', value: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const updateData = {
        theme: project!.theme,
        question: field === 'question' ? value : project!.question,
        hypothesis: field === 'hypothesis' ? value : project!.hypothesis,
      };

      const response = await fetch(`http://localhost:8000/v2/projects/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const response = await fetch(`http://localhost:8000/v2/projects/${projectId}/memos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: '',
          content: '',
        }),
      });

      if (!response.ok) throw new Error('メモの作成に失敗しました');
      
      const newMemo = await response.json();
      // 新規作成されたメモの編集画面に遷移
      navigate(`/projects/${projectId}/memos/${newMemo.id}`);
    } catch (error) {
      console.error('Error creating memo:', error);
    }
  };

  // メモ削除の処理
  const handleDeleteMemo = async (memoId: number) => {
    if (!confirm('このメモを削除しますか？')) return;

    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`http://localhost:8000/v2/memos/${memoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      return { xs: 12 }; // モバイルでは常に1列
    }
    
    if (isChatOpen) {
      // AIチャットが開いている時は少し列数を減らす
      return { xs: 12, sm: 6, md: 6, lg: 4 };
    } else {
      // AIチャットが閉じている時は通常の列数
      return { xs: 12, sm: 6, md: 4, lg: 3 };
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
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ブレッドクラム */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component="button"
          variant="body2"
          onClick={() => navigate('/dashboard')}
          sx={{ textDecoration: 'none' }}
        >
          ダッシュボード
        </Link>
        <Typography variant="body2" color="text.primary">
          {project.theme}
        </Typography>
      </Breadcrumbs>

      {/* プロジェクトヘッダー */}
      <Box sx={{ mb: 4 }}>
        <Box display="flex" alignItems="center" mb={2}>
          <IconButton
            onClick={() => navigate('/dashboard')}
            sx={{ mr: 1 }}
          >
            <BackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">
            {project.theme}
          </Typography>
        </Box>

        {/* 問いと仮説 - インライン編集対応 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="caption" color="primary.dark" fontWeight="bold">
                研究の問い
              </Typography>
              {editingField === 'question' ? (
                <ClickAwayListener onClickAway={saveEdit}>
                  <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="研究の問いを入力..."
                      autoFocus
                      multiline
                      maxRows={3}
                    />
                    <IconButton size="small" onClick={saveEdit} color="primary">
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={cancelEdit}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ClickAwayListener>
              ) : (
                <Box
                  onClick={() => startEditing('question')}
                  sx={{
                    mt: 0.5,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {project.question || '※クリックして問いを設定'}
                  </Typography>
                  <EditIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                </Box>
              )}
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
              <Typography variant="caption" color="secondary.dark" fontWeight="bold">
                仮説
              </Typography>
              {editingField === 'hypothesis' ? (
                <ClickAwayListener onClickAway={saveEdit}>
                  <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      fullWidth
                      size="small"
                      value={editingValue}
                      onChange={(e) => setEditingValue(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      placeholder="仮説を入力..."
                      autoFocus
                      multiline
                      maxRows={3}
                    />
                    <IconButton size="small" onClick={saveEdit} color="primary">
                      <CheckIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={cancelEdit}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </ClickAwayListener>
              ) : (
                <Box
                  onClick={() => startEditing('hypothesis')}
                  sx={{
                    mt: 0.5,
                    cursor: 'pointer',
                    p: 1,
                    borderRadius: 1,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {project.hypothesis || '※クリックして仮説を設定'}
                  </Typography>
                  <EditIcon sx={{ fontSize: 16, opacity: 0.7 }} />
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>

        {/* アクションボタン */}
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateMemo}
          >
            新しいメモ
          </Button>
          <Typography variant="body2" color="text.secondary">
            {memos.length}個のメモ
          </Typography>
        </Box>
      </Box>

      {/* メモ一覧（Scrapboxライク） */}
      <Box>
        {memos.length === 0 ? (
          <Box
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            py={8}
          >
            <Typography variant="h6" color="text.secondary" gutterBottom>
              まだメモがありません
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              最初のメモを作成してアイデアを記録しましょう
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleCreateMemo}
            >
              最初のメモを作成
            </Button>
          </Box>
        ) : (
          <Grid container spacing={2}>
            <AnimatePresence>
              {memos.map((memo) => (
                <Grid item {...getGridColumns()} key={memo.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card
                      sx={{
                        height: 200,
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          boxShadow: theme.shadows[8],
                        },
                      }}
                      onClick={() => navigate(`/projects/${projectId}/memos/${memo.id}`)}
                    >
                      <CardContent sx={{ flexGrow: 1, position: 'relative' }}>
                        {/* メニューボタン */}
                        <IconButton
                          size="small"
                          onClick={(e) => handleMenuOpen(e, memo)}
                          sx={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            opacity: 0.7,
                            '&:hover': { opacity: 1 },
                          }}
                        >
                          <MoreIcon />
                        </IconButton>

                        {/* タイトル */}
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{
                            mb: 2,
                            pr: 4, // メニューボタンのスペース確保
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            minHeight: 48,
                          }}
                        >
                          {memo.title || 'Untitled'}
                        </Typography>

                        {/* 内容プレビュー */}
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 6,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.4,
                          }}
                        >
                          {getContentPreview(memo.content)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              ))}
            </AnimatePresence>
          </Grid>
        )}
      </Box>

      {/* FAB（モバイル用） */}
      {isMobile && (
        <Fab
          color="primary"
          aria-label="add memo"
          onClick={handleCreateMemo}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
        >
          <AddIcon />
        </Fab>
      )}

      {/* メモメニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          onClick={() => {
            if (selectedMemo) {
              navigate(`/projects/${projectId}/memos/${selectedMemo.id}`);
            }
            handleMenuClose();
          }}
        >
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          編集
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedMemo) {
              handleDeleteMemo(selectedMemo.id);
            }
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          削除
        </MenuItem>
      </Menu>
    </Container>
  );
};

export default ProjectPage; 