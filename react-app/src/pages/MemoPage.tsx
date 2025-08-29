import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
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
  WifiOff as OfflineIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useChatStore } from '../stores/chatStore';

interface Memo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  version?: number;  // 楽観的ロック用
}

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
}

// 保存リクエストの状態管理用
interface SaveRequest {
  title: string;
  content: string;
  requestId: string;
  seq: number;
}

// 保存ステータス
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

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
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(0);

  // MemoChat風の状態管理
  const [memoContent, setMemoContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const memoRef = useRef<HTMLDivElement>(null);
  
  // Single-flight保存管理用のRef
  const inflightRef = useRef<Promise<void> | null>(null);
  const pendingRef = useRef<SaveRequest | null>(null);
  const seqRef = useRef(0);
  const latestSeqRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastSavedHashRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const memoPlaceholder = `メモのタイトル

ここにメモの内容を自由に書いてください。

# 見出し
- リスト項目
- リスト項目

**太字**や*斜体*も使用できます。

思考の整理、アイデアのメモ、学習の記録など、
自由にお使いください。

1行目がメモのタイトルとして扱われます。`;

  // ハッシュ計算用のヘルパー関数
  const calculateHash = async (text: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // ランダムなrequestIdを生成
  const generateRequestId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // メモの取得
  const fetchMemo = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
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
      
      // バージョン情報を保存
      setCurrentVersion(data.version || 0);
      
      // 最後に保存したコンテンツを記録
      setLastSavedContent({ title: data.title, content: data.content });
      
      // ハッシュ値を計算して保存
      const contentHash = await calculateHash(`${data.title}\n${data.content}`);
      lastSavedHashRef.current = contentHash;
      
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
      const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
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

  // Single-flight保存処理
  const performSave = async (request: SaveRequest): Promise<void> => {
    // ハッシュチェック - 変更がなければ保存しない
    const currentHash = await calculateHash(`${request.title}\n${request.content}`);
    if (currentHash === lastSavedHashRef.current) {
      return;
    }

    const token = localStorage.getItem('auth-token');
    if (!token) {
      throw new Error('認証トークンが見つかりません');
    }

    const apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
    
    // 15秒タイムアウト設定
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const requestBody = {
        title: request.title || '',
        content: request.content || '',
        version: currentVersion, // 楽観的ロック用
        requestId: request.requestId,
        seq: request.seq,
      };

      const response = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'If-Match': currentVersion.toString(), // ETag代わりにバージョンを使用
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 409) {
          // 楽観的ロックエラー: 最新を取得してマージが必要
          console.warn('競合が発生しました。最新データを取得します');
          await fetchMemo();
          throw new Error('conflict');
        }
        throw new Error(`保存に失敗しました (${response.status})`);
      }

      const result = await response.json();
      
      // レスポンスのseqをチェック（古いレスポンスは無視）
      if (result.seq && result.seq < latestSeqRef.current) {
        console.log('古いレスポンスを無視');
        return;
      }
      
      // 保存成功
      setSaveStatus('saved');
      setLastSaved(new Date());
      setLastSavedContent({ title: request.title, content: request.content });
      setHasUnsavedChanges(false);
      setCurrentVersion(result.version || currentVersion + 1);
      lastSavedHashRef.current = currentHash;
      latestSeqRef.current = request.seq;
      
      // LocalStorageバックアップをクリア
      clearLocalStorageBackup();
      
      // リトライカウントをリセット
      retryCountRef.current = 0;
      
    } catch (error: any) {
      clearTimeout(timeoutId);
      throw error;
    }
  };

  // 保存キューの処理
  const processSaveQueue = async (): Promise<void> => {
    // 既に処理中の場合は何もしない
    if (inflightRef.current) {
      return;
    }

    // 保存待ちがない場合は終了
    if (!pendingRef.current) {
      return;
    }

    // オフラインの場合はスキップ
    if (!navigator.onLine) {
      setSaveStatus('offline');
      return;
    }

    const saveRequest = pendingRef.current;
    pendingRef.current = null;
    setSaveStatus('saving');

    // 保存処理を実行
    inflightRef.current = (async () => {
      const maxRetries = 2;
      const retryDelays = [1000, 2000]; // 指数バックオフ

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await performSave(saveRequest);
          return; // 成功
        } catch (error: any) {
          if (error.message === 'conflict') {
            // 競合の場合はリトライしない
            setSaveStatus('error');
            setSaveError('他のタブからの変更と競合しました');
            return;
          }

          if (attempt < maxRetries) {
            // リトライ
            console.log(`保存リトライ (${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          } else {
            // 最終的に失敗
            setSaveStatus('error');
            setSaveError(error.message);
            console.error('保存に失敗しました:', error);
          }
        }
      }
    })();

    await inflightRef.current;
    inflightRef.current = null;

    // 次の保存待ちがあれば処理
    if (pendingRef.current) {
      await processSaveQueue();
    }
  };

  // 保存リクエストをキューに追加（trailing save対応）
  const enqueueSave = useCallback((newTitle: string, newContent: string) => {
    const seq = ++seqRef.current;
    
    // 最新のスナップショットで上書き（trailing save）
    pendingRef.current = {
      title: newTitle,
      content: newContent,
      requestId: generateRequestId(),
      seq,
    };
    
    // 保存処理中でなければ即座に開始
    if (!inflightRef.current) {
      processSaveQueue();
    }
    // 保存処理中の場合は、完了後に自動的に処理される（trailing save）
  }, []);

  // デバウンス保存スケジューラー（イベント駆動）
  const scheduleSave = useCallback((content: string) => {
    if (!memoId) return;

    // タイトルと本文を分離
    const lines = content.split('\n');
    const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
    const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                            (lines.length === 1 && !lines[0].trim() ? '' : content);

    // 既存のタイマーをクリア
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // 2秒後に保存をスケジュール
    saveTimeoutRef.current = setTimeout(() => {
      enqueueSave(extractedTitle, extractedContent);
      saveTimeoutRef.current = null;
    }, 2000); // 2秒間入力がなければ保存
  }, [memoId, enqueueSave]);

  // 即座に保存する関数（ページ離脱時用）
  const saveImmediately = useCallback(() => {
    if (!memoId || !memoContent) return;
    
    // 全てのタイマーをクリア
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (localSaveTimeoutRef.current) {
      clearTimeout(localSaveTimeoutRef.current);
      localSaveTimeoutRef.current = null;
    }
    
    // memoContentからタイトルと本文を分離
    const lines = memoContent.split('\n');
    const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
    const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                            (lines.length === 1 && !lines[0].trim() ? '' : memoContent);
    
    // 即座にキューに追加
    enqueueSave(extractedTitle, extractedContent);
  }, [memoId, memoContent]);


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

  // LocalStorageバックアップ用のRef
  const localSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // メモ内容の変更処理（イベント駆動）
  const handleMemoChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setMemoContent(newContent);
    
    // 内容が実際に変更された場合のみ処理
    if (newContent !== memoContent) {
      setHasUnsavedChanges(true);
      
      // LocalStorageバックアップ（デバウンス）
      if (localSaveTimeoutRef.current) {
        clearTimeout(localSaveTimeoutRef.current);
      }
      localSaveTimeoutRef.current = setTimeout(() => {
        saveToLocalStorage(newContent);
        localSaveTimeoutRef.current = null;
      }, 1000);
      
      // memoContentからタイトルと本文を分離してchatStoreに送る
      const lines = newContent.split('\n');
      const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
      const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                              (lines.length === 1 && !lines[0].trim() ? '' : newContent);
      
      updateMemoContent(extractedTitle, extractedContent);
      
      // 自動保存をスケジュール（イベント駆動）
      scheduleSave(newContent);
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

  // オフライン検出
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSaveStatus('idle');
      // オンライン復帰時に保存待ちがあれば処理
      if (pendingRef.current) {
        processSaveQueue();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSaveStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // BroadcastChannelでタブ間同期
  useEffect(() => {
    if (!memoId) return;

    try {
      const channel = new BroadcastChannel(`memo-${memoId}`);
      broadcastChannelRef.current = channel;

      channel.onmessage = (event) => {
        if (event.data.type === 'editing') {
          // 他のタブが編集中
          if (event.data.tabId !== window.name) {
            console.warn('他のタブでこのメモが編集されています');
          }
        } else if (event.data.type === 'saved') {
          // 他のタブが保存した
          if (event.data.version > currentVersion) {
            setCurrentVersion(event.data.version);
            // 必要に応じて最新データを取得
            fetchMemo();
          }
        }
      };

      // 編集開始を通知
      if (!window.name) {
        window.name = `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }
      channel.postMessage({ type: 'editing', tabId: window.name });

      return () => {
        channel.close();
        broadcastChannelRef.current = null;
      };
    } catch (error) {
      // BroadcastChannelがサポートされていない環境
      console.warn('BroadcastChannel is not supported');
    }
  }, [memoId, currentVersion]);

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
                {saveStatus === 'offline' ? (
                  <Tooltip title="オフラインです">
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                      <OfflineIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        オフライン
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : saveStatus === 'saving' ? (
                  <Tooltip title="保存中...">
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'info.main' }}>
                      <SavingIcon sx={{ fontSize: 16, mr: 0.5, animation: 'pulse 1.5s ease-in-out infinite' }} />
                      <Typography variant="caption">
                        保存中...
                      </Typography>
                    </Box>
                  </Tooltip>
                ) : saveStatus === 'error' ? (
                  <Tooltip title={saveError || '保存エラー'}>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'error.main' }}>
                      <ErrorIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      <Typography variant="caption">
                        エラー
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

export default memo(MemoPage); 