import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  TextField,
  IconButton,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  Drawer,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  QuestionAnswer as ChatIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { debounce } from 'lodash';
import AIChat from '../components/MemoChat/AIChat';

interface Memo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
}

const MemoPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { projectId, memoId } = useParams<{ projectId: string; memoId: string }>();
  const { user } = useAuthStore();

  const [memo, setMemo] = useState<Memo | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // メモの取得
  const fetchMemo = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`http://localhost:8000/v2/memos/${memoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setMemo(data);
      setTitle(data.title);
      setContent(data.content);
    } catch (error) {
      console.error('Error fetching memo:', error);
    }
  };

  // プロジェクトの取得
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
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && memoId) {
      fetchMemo();
      fetchProject();
    }
  }, [projectId, memoId]);

  // 自動保存機能
  const saveChanges = async (newTitle: string, newContent: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`http://localhost:8000/v2/memos/${memoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  // デバウンスされた自動保存
  const debouncedSave = useCallback(
    debounce((newTitle: string, newContent: string) => {
      saveChanges(newTitle, newContent);
    }, 1000),
    [memoId]
  );

  // タイトル変更時の処理
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debouncedSave(newTitle, content);
  };

  // 内容変更時の処理
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedSave(title, newContent);
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  if (!memo || !project) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>メモまたはプロジェクトが見つかりません</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper 
        elevation={1} 
        sx={{ 
          borderRadius: 0, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 1,
        }}
      >
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {/* ブレッドクラム */}
          <Breadcrumbs sx={{ mb: 1 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/dashboard')}
              sx={{ textDecoration: 'none' }}
            >
              ダッシュボード
            </Link>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate(`/projects/${projectId}`)}
              sx={{ textDecoration: 'none' }}
            >
              {project.theme}
            </Link>
            <Typography variant="body2" color="text.primary">
              {title || 'Untitled'}
            </Typography>
          </Breadcrumbs>

          {/* ツールバー */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <IconButton
                onClick={() => navigate(`/projects/${projectId}`)}
                sx={{ mr: 1 }}
              >
                <BackIcon />
              </IconButton>
              <Typography variant="h6" fontWeight="bold">
                メモ編集
              </Typography>
              {lastSaved && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  最終保存: {lastSaved.toLocaleTimeString()}
                </Typography>
              )}
            </Box>

            <IconButton
              onClick={() => setIsChatOpen(true)}
              color="primary"
              sx={{
                bgcolor: 'primary.light',
                '&:hover': { bgcolor: 'primary.main', color: 'white' },
              }}
            >
              <ChatIcon />
            </IconButton>
          </Box>
        </Container>
      </Paper>

      {/* メインエディター */}
      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* タイトル入力 */}
          <TextField
            fullWidth
            variant="outlined"
            placeholder="メモのタイトルを入力..."
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            sx={{
              mb: 2,
              '& .MuiOutlinedInput-root': {
                fontSize: '1.5rem',
                fontWeight: 'bold',
              },
            }}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />

          {/* 内容入力 */}
          <TextField
            fullWidth
            multiline
            variant="outlined"
            placeholder="ここにメモの内容を入力してください...

#見出し
- リスト項目
- リスト項目

**太字**や*斜体*も使用できます。"
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            sx={{
              flexGrow: 1,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                alignItems: 'flex-start',
              },
              '& .MuiInputBase-input': {
                height: '100% !important',
                overflow: 'auto !important',
                resize: 'none',
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                lineHeight: 1.6,
              },
            }}
            InputProps={{
              style: { borderRadius: 8 },
            }}
          />
        </Box>
      </Container>

      {/* AI相談ドロワー */}
      <Drawer
        anchor={isMobile ? 'bottom' : 'right'}
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        variant="temporary"
        sx={{
          '& .MuiDrawer-paper': {
            width: isMobile ? '100%' : 400,
            height: isMobile ? '80%' : '100%',
            maxWidth: '100%',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* チャットヘッダー */}
          <Box
            sx={{
              p: 2,
              borderBottom: `1px solid ${theme.palette.divider}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              AI相談
            </Typography>
            <IconButton onClick={() => setIsChatOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {/* AI相談コンポーネント */}
          <Box sx={{ flexGrow: 1 }}>
            <AIChat 
              pageId={`memo-${memoId}`}
              title={title || 'Untitled'}
              memoContent={content}
              loadHistoryFromDB={true}
            />
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default MemoPage; 