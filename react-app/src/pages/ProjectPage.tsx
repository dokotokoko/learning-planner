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
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as BackIcon,
  MoreVert as MoreIcon,
  Delete as DeleteIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

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

  const [project, setProject] = useState<Project | null>(null);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

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

        {/* 問いと仮説 */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
              <Typography variant="caption" color="primary.dark" fontWeight="bold">
                研究の問い
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {project.question || '※まだ設定されていません'}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Box sx={{ p: 2, bgcolor: 'secondary.light', borderRadius: 1 }}>
              <Typography variant="caption" color="secondary.dark" fontWeight="bold">
                仮説
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                {project.hypothesis || '※まだ設定されていません'}
              </Typography>
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
                <Grid item xs={12} sm={6} md={4} lg={3} key={memo.id}>
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
                            WebkitLineClamp: 4,
                            WebkitBoxOrient: 'vertical',
                            lineHeight: 1.4,
                            mb: 2,
                          }}
                        >
                          {getContentPreview(memo.content)}
                        </Typography>

                        {/* 更新日時 */}
                        <Box
                          display="flex"
                          alignItems="center"
                          sx={{ position: 'absolute', bottom: 16, left: 16 }}
                        >
                          <TimeIcon sx={{ fontSize: 14, color: 'text.secondary', mr: 0.5 }} />
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(memo.updated_at), 'M/d HH:mm', { locale: ja })}
                          </Typography>
                        </Box>
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
          {/* EditIconを削除 */}
          <Typography>編集</Typography>
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