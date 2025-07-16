import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  TextField,
  IconButton,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';
import { debounce } from 'lodash';

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
  const { setCurrentMemo, updateMemoContent, setCurrentProject, isChatOpen, setChatOpen } = useChatStore();

  const [memo, setMemo] = useState<Memo | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // MemoChat風の状態管理
  const [memoContent, setMemoContent] = useState('');
  const memoRef = useRef<HTMLDivElement>(null);
  const memoPlaceholder = `メモのタイトル

ここにメモの内容を自由に書いてください。

# 見出し
- リスト項目
- リスト項目

**太字**や*斜体*も使用できます。

思考の整理、アイデアのメモ、学習の記録など、
自由にお使いください。

1行目がメモのタイトルとして扱われます。`;

  // メモの取得
  const fetchMemo = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/v2/memos/${memoId}`, {
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
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/v2/projects/${projectId}`, {
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

  // メモの初期化時のみmemoContentを設定
  useEffect(() => {
    if (memo && !memoContent) {
      const combinedContent = title ? `${title}\n\n${content}` : content;
      setMemoContent(combinedContent);
    }
  }, [memo, title, content, memoContent]);

  // グローバルチャットストアにメモ情報を更新
  useEffect(() => {
    if (projectId && memoId && memoContent) {
      const lines = memoContent.split('\n');
      const currentTitle = lines.length > 0 ? lines[0] : '';
      setCurrentMemo(projectId, memoId, currentTitle, memoContent);
    }
  }, [projectId, memoId, memoContent, setCurrentMemo]);

  // AIチャットをデフォルトで開く
  useEffect(() => {
    if (user && !isChatOpen) {
      setTimeout(() => setChatOpen(true), 500);
    }
  }, [user, isChatOpen, setChatOpen]);

  // 自動保存機能
  const saveChanges = async (newTitle: string, newContent: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/v2/memos/${memoId}`, {
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

  // デバウンスされた自動保存（保存のみ、状態更新なし）
  const debouncedSave = useCallback(
    debounce((newTitle: string, fullContent: string) => {
      // fullContentからタイトルと本文を分離
      const lines = fullContent.split('\n');
      const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
      const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                              (lines.length === 1 && !lines[0].trim() ? '' : fullContent);
      
      // 保存のみ実行（状態更新は手動保存時のみ）
      saveChanges(extractedTitle, extractedContent);
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

  // 動的タイトル取得（memoContentの1行目をそのまま使用）
  const getCurrentTitle = () => {
    if (!memoContent) return title || '';
    const lines = memoContent.split('\n');
    return lines.length > 0 ? lines[0] : '';
  };

  // メモ内容の変更処理
  const handleMemoChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setMemoContent(newContent);
    
    // memoContentからタイトルと本文を分離してchatStoreに送る
    const lines = newContent.split('\n');
    const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
    const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                            (lines.length === 1 && !lines[0].trim() ? '' : newContent);
    
    updateMemoContent(extractedTitle, extractedContent);
  };

  // キーボードショートカット
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      // 自動保存なので何もしない
    }
  };

  // プロジェクトIDをセット
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject]);

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
            <Typography 
              variant="body2" 
              color="text.primary"
            >
              {project.theme}
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
              {lastSaved && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  最終保存: {lastSaved.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* メインコンテンツ - シンプルなメモエディター */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Box sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
        }}>
          {/* メモエディター */}
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            p: 3,
          }}>
            <TextField
              multiline
              fullWidth
              minRows={isMobile ? 20 : 30}
              value={memoContent}
              onChange={handleMemoChange}
              onKeyDown={handleKeyDown}
              placeholder={memoPlaceholder}
              variant="standard"
              sx={{
                '& .MuiInputBase-root': {
                  padding: 0,
                },
                '& .MuiInput-underline:before': {
                  display: 'none',
                },
                '& .MuiInput-underline:after': {
                  display: 'none',
                },
              }}
              ref={memoRef}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default MemoPage; 