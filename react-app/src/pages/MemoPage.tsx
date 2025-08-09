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
  CloudDone as SavedIcon,
  CloudQueue as SavingIcon,
  Error as ErrorIcon,
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
  const [lastSavedContent, setLastSavedContent] = useState<{ title: string; content: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // MemoChat風の状態管理
  const [memoContent, setMemoContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
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
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setMemo(data);
      setTitle(data.title);
      setContent(data.content);
      
      // 最後に保存したコンテンツを記録
      setLastSavedContent({ title: data.title, content: data.content });
      
      // LocalStorageからバックアップを確認
      const localBackup = loadFromLocalStorage();
      if (localBackup) {
        const serverContent = data.content || '';
        const serverTimestamp = new Date(data.updated_at || 0);
        
        try {
          const key = getLocalStorageKey();
          const saved = localStorage.getItem(key);
          if (saved) {
            const backup = JSON.parse(saved);
            const backupTimestamp = new Date(backup.timestamp);
            
            // LocalStorageの方が新しい場合は復元を提案
            if (backupTimestamp > serverTimestamp && localBackup !== serverContent) {
              const shouldRestore = window.confirm(
                '保存されていない変更が見つかりました。復元しますか？\n\n' +
                '「OK」: ローカルの変更を復元\n' +
                '「キャンセル」: サーバーの内容を使用'
              );
              
              if (shouldRestore) {
                setMemoContent(localBackup);
                const lines = localBackup.split('\n');
                const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
                const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : localBackup;
                updateMemoContent(extractedTitle, extractedContent);
                console.log('🔄 LocalStorageからメモを復元しました');
                return;
              }
            }
          }
        } catch (e) {
          console.warn('バックアップ復元エラー:', e);
        }
      }
    } catch (error) {
      console.error('Error fetching memo:', error);
    }
  };

  // プロジェクトの取得
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
    // 差分チェック：前回保存したコンテンツと同じ場合はスキップ
    if (lastSavedContent && 
        lastSavedContent.title === newTitle && 
        lastSavedContent.content === newContent) {
      console.log('⏭️ 変更なし - 保存をスキップ');
      return;
    }

    try {
      setIsSaving(true);
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
        setLastSavedContent({ title: newTitle, content: newContent });
        setHasUnsavedChanges(false);
        
        // 保存成功時にLocalStorageバックアップをクリア
        clearLocalStorageBackup();
        console.log('💾 メモを保存し、バックアップをクリアしました');
      }
    } catch (error) {
      console.error('Error saving memo:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // デバウンスされた自動保存（保存のみ、状態更新なし）
  const debouncedSave = useCallback(
    debounce((fullContent: string) => {
      // fullContentからタイトルと本文を分離
      const lines = fullContent.split('\n');
      const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
      const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                              (lines.length === 1 && !lines[0].trim() ? '' : fullContent);
      
      // 保存のみ実行（状態更新は手動保存時のみ）
      saveChanges(extractedTitle, extractedContent);
    }, 2000), // 保存間隔を2秒
    [memoId, lastSavedContent]
  );

  // 即座に保存する関数（ページ離脱時用）
  const saveImmediately = useCallback(async () => {
    if (!memoId) return;
    
    try {
      // memoContentからタイトルと本文を分離
      const lines = memoContent.split('\n');
      const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
      const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                              (lines.length === 1 && !lines[0].trim() ? '' : memoContent);
      
      await saveChanges(extractedTitle, extractedContent);
      console.log('💾 緊急保存完了');
    } catch (error) {
      console.error('緊急保存エラー:', error);
    }
  }, [memoId, memoContent, saveChanges]);


  // 動的タイトル取得（memoContentの1行目をそのまま使用）
  const getCurrentTitle = () => {
    if (!memoContent) return title || '';
    const lines = memoContent.split('\n');
    return lines.length > 0 ? lines[0] : '';
  };

  // LocalStorageキー
  const getLocalStorageKey = () => `memo_backup_${projectId}_${memoId}`;

  // LocalStorageにバックアップ保存
  const saveToLocalStorage = useCallback((content: string) => {
    if (!projectId || !memoId) return;
    try {
      const key = getLocalStorageKey();
      const backup = {
        content,
        timestamp: new Date().toISOString(),
        projectId,
        memoId
      };
      localStorage.setItem(key, JSON.stringify(backup));
    } catch (error) {
      console.warn('LocalStorage保存エラー:', error);
    }
  }, [projectId, memoId]);

  // LocalStorageからバックアップ復元
  const loadFromLocalStorage = useCallback(() => {
    if (!projectId || !memoId) return null;
    try {
      const key = getLocalStorageKey();
      const saved = localStorage.getItem(key);
      if (saved) {
        const backup = JSON.parse(saved);
        return backup.content;
      }
    } catch (error) {
      console.warn('LocalStorage読み込みエラー:', error);
    }
    return null;
  }, [projectId, memoId]);

  // LocalStorageのバックアップを削除
  const clearLocalStorageBackup = useCallback(() => {
    if (!projectId || !memoId) return;
    try {
      const key = getLocalStorageKey();
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorage削除エラー:', error);
    }
  }, [projectId, memoId]);

  // メモ内容の変更処理
  const handleMemoChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setMemoContent(newContent);
    
    // 内容が実際に変更された場合のみ処理
    if (newContent !== memoContent) {
      setHasUnsavedChanges(true);
      
      // LocalStorageにバックアップ保存
      saveToLocalStorage(newContent);
      
      // memoContentからタイトルと本文を分離してchatStoreに送る
      const lines = newContent.split('\n');
      const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
      const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                              (lines.length === 1 && !lines[0].trim() ? '' : newContent);
      
      updateMemoContent(extractedTitle, extractedContent);
      
      // デバウンスされた自動保存を呼び出し
      debouncedSave(newContent);
    }
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

  // ページ離脱時・ブラウザ終了時の保存処理
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // 変更がある場合は即座に保存を試行
      if (memoContent) {
        saveImmediately();
        // ブラウザに離脱の確認を表示
        event.preventDefault();
        //event.returnValue = 'メモの内容が保存されていない可能性があります。本当にページを離れますか？';
      }
    };

    const handleVisibilityChange = () => {
      // ページが非表示になった時（タブ切り替え、最小化など）に保存
      if (document.visibilityState === 'hidden' && memoContent) {
        saveImmediately();
      }
    };

    // イベントリスナーを追加
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // コンポーネントのアンマウント時にも保存
    return () => {
      if (memoContent) {
        saveImmediately();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [memoContent, saveImmediately]);

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
              {/* 保存状態インジケーター */}
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
                {isSaving ? (
                  <Tooltip title="保存中...">
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'info.main' }}>
                      <SavingIcon sx={{ fontSize: 16, mr: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <Typography variant="caption">
                        保存中...
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : hasUnsavedChanges ? (
                  <Tooltip title="未保存の変更があります（自動保存待機中）">
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main' }}>
                      <SavingIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        変更あり
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : lastSaved ? (
                  <Tooltip title={`最終保存: ${lastSaved.toLocaleString()}`}>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'success.main' }}>
                      <SavedIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        保存済み
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : null}
              </Box>
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