import React, { useState, useEffect, useCallback, useRef, memo, useMemo } from 'react';
import {
  Box,
  Container,
  IconButton,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';
import MemoEditor from '../components/MemoEditor';
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
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<number>(0);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Single-flight保存管理用のRef
  const inflightRef = useRef<Promise<void> | null>(null);
  const pendingRef = useRef<SaveRequest | null>(null);
  const seqRef = useRef(0);
  const latestSeqRef = useRef(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastSavedHashRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  // メモの初期コンテンツを計算（導出値）
  const initialMemoContent = useMemo(() => {
    if (!memo) return '';
    
    // デバッグ用ログ出力
    console.log('MemoPage: Loading existing memo');
    console.log('Title:', memo.title);
    console.log('Content:', memo.content);
    
    // DBのタイトルとコンテンツを結合して表示
    if (memo.title && memo.title.trim()) {
      return memo.content ? `${memo.title}\n${memo.content}` : memo.title;
    }
    return memo.content || '';
  }, [memo]);
  
  // 現在のメモコンテンツを保持（エディター内部で管理、ページ離脱時の保存用）
  const currentMemoContentRef = useRef<string>('');
  
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

  // LocalStorageキー
  const getLocalStorageKey = useCallback(() => `memo_backup_${projectId}_${memoId}`, [projectId, memoId]);

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
  }, [projectId, memoId, getLocalStorageKey]);

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
  }, [projectId, memoId, getLocalStorageKey]);

  // LocalStorageのバックアップを削除
  const clearLocalStorageBackup = useCallback(() => {
    if (!projectId || !memoId) return;
    try {
      const key = getLocalStorageKey();
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorage削除エラー:', error);
    }
  }, [projectId, memoId, getLocalStorageKey]);

  // メモデータをストアに同期（イベントハンドラやEffect内からのみ呼び出し）
  const syncMemoToStore = useCallback((memoData: Memo) => {
    if (!projectId || !memoId) return;
    
    // DBのタイトルとコンテンツを結合して表示用コンテンツを作成
    const combinedContent = memoData.title && memoData.title.trim() 
      ? (memoData.content ? `${memoData.title}\n${memoData.content}` : memoData.title)
      : (memoData.content || '');
    
    const currentTitle = memoData.title || '';
    
    // コンテンツを保持
    currentMemoContentRef.current = combinedContent;
    
    // ストアに同期（イベントハンドラ内なので安全）
    setCurrentMemo(projectId, memoId, currentTitle, combinedContent);
  }, [projectId, memoId, setCurrentMemo]);

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
      syncMemoToStore(data);
      
      // バージョン情報を保存
      setCurrentVersion(data.version || 0);
      
      // 最後に保存したハッシュを記録
      
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
                // 復元フラグを立てて再マウントを促す
                const restoredMemo = { ...data, content: localBackup };
                setMemo(restoredMemo);
                syncMemoToStore(restoredMemo);
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

  // データ初期化関数
  const initializeData = useCallback(async () => {
    if (projectId && memoId) {
      setIsLoading(true);
      
      // fetchMemoを内部で定義
      const fetchMemoLocal = async () => {
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
          // データ取得完了後にストアを更新（非同期処理内なので安全）
          syncMemoToStore(data);
          
          // バージョン情報を保存
          setCurrentVersion(data.version || 0);
          
          // 最後に保存したハッシュを記録
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
                    // 復元フラグを立てて再マウントを促す
                    const restoredMemo = { ...data, content: localBackup, title: '' };
                    setMemo(restoredMemo);
                    syncMemoToStore(restoredMemo);
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
      
      await Promise.all([fetchMemoLocal(), fetchProject()]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, memoId, syncMemoToStore, loadFromLocalStorage, getLocalStorageKey]);

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

  // 保存処理（エディターから呼ばれる）
  const handleSave = useCallback((content: string) => {
    if (!memoId) return;
    
    // 改行コードを正規化（Windows CRLF → Unix LF）
    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u2028/g, '\n')  // Line Separator
      .replace(/\u2029/g, '\n'); // Paragraph Separator
    
    // 最初の改行位置を手動で探す（split処理を使わない）
    const firstNewlineIndex = normalizedContent.indexOf('\n');
    
    let title = '';
    let bodyContent = '';
    
    if (firstNewlineIndex === -1) {
      // 改行がない場合（1行のみ）
      title = normalizedContent.trim();
      bodyContent = '';
    } else {
      // 改行がある場合
      title = normalizedContent.substring(0, firstNewlineIndex).trim();
      // 最初の改行の次の文字から最後まで（2行目以降すべて）
      bodyContent = normalizedContent.substring(firstNewlineIndex + 1);
    }
    
    // デバッグログ（詳細版）
    console.log('Save Debug (Alternative Split):', {
      originalContent: content,
      originalLength: content.length,
      normalizedContent: normalizedContent,
      normalizedLength: normalizedContent.length,
      firstNewlineIndex: firstNewlineIndex,
      title: title,
      titleLength: title.length,
      bodyContent: bodyContent,
      bodyContentLength: bodyContent.length,
      bodyContentDisplay: bodyContent.replace(/\n/g, '\\n'),
      // 文字コードレベルでの確認
      charCodes: Array.from(normalizedContent.slice(0, 50)).map(c => ({
        char: c,
        code: c.charCodeAt(0),
        hex: '0x' + c.charCodeAt(0).toString(16)
      }))
    });
    
    enqueueSave(title, bodyContent);
  }, [memoId, enqueueSave]);

  // 即座に保存する関数（ページ離脱時用）
  const saveImmediately = useCallback(() => {
    const content = currentMemoContentRef.current;
    if (!memoId || !content) return;
    
    // 改行コードを正規化（Windows CRLF → Unix LF）
    const normalizedContent = content
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u2028/g, '\n')  // Line Separator
      .replace(/\u2029/g, '\n'); // Paragraph Separator
    
    // 最初の改行位置を手動で探す（split処理を使わない）
    const firstNewlineIndex = normalizedContent.indexOf('\n');
    
    let title = '';
    let bodyContent = '';
    
    if (firstNewlineIndex === -1) {
      // 改行がない場合（1行のみ）
      title = normalizedContent.trim();
      bodyContent = '';
    } else {
      // 改行がある場合
      title = normalizedContent.substring(0, firstNewlineIndex).trim();
      // 最初の改行の次の文字から最後まで（2行目以降すべて）
      bodyContent = normalizedContent.substring(firstNewlineIndex + 1);
    }
    
    enqueueSave(title, bodyContent);
  }, [memoId, enqueueSave]);

  // メモ内容の変更処理（エディターから呼ばれるイベントハンドラ）
  const handleContentChange = useCallback((newContent: string) => {
    // 現在のコンテンツを保持
    currentMemoContentRef.current = newContent;
    setHasUnsavedChanges(true);
    
    // LocalStorageバックアップ
    saveToLocalStorage(newContent);
    
    // 1行目を自動的にタイトルとして抽出（表示用）
    const lines = newContent.split('\n');
    const extractedTitle = lines.length > 0 ? lines[0].trim() : '';
    
    // ストア更新（イベントハンドラ内なので安全）
    updateMemoContent(extractedTitle, newContent);
    if (projectId && memoId) {
      setCurrentMemo(projectId, memoId, extractedTitle, newContent);
    }
  }, [projectId, memoId, setCurrentMemo, updateMemoContent, saveToLocalStorage]);

  // 初期データの取得（URL変更時）
  useEffect(() => {
    initializeData();
  }, [initializeData]);

  // プロジェクトIDの設定
  useEffect(() => {
    if (projectId) {
      setCurrentProject(projectId);
    }
  }, [projectId, setCurrentProject]);
  
  // チャットの自動オープン（ユーザーがログイン済みの場合）
  useEffect(() => {
    if (user && !isChatOpen) {
      const timeoutId = setTimeout(() => setChatOpen(true), 500);
      return () => clearTimeout(timeoutId);
    }
  }, [user, isChatOpen, setChatOpen]);

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
            initializeData();
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
      if (hasUnsavedChanges && currentMemoContentRef.current) {
        saveImmediately();
        event.preventDefault();
      }
    };

    const handleVisibilityChange = () => {
      // ページが非表示になった時（タブ切り替え、最小化など）に保存
      if (document.visibilityState === 'hidden' && hasUnsavedChanges) {
        saveImmediately();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (hasUnsavedChanges) {
        saveImmediately();
      }
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [hasUnsavedChanges, saveImmediately]);

  // 初期ローディング時の処理
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
                  <Tooltip title="未保存の変更があります">
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
          {/* key再マウントでメモエディターを初期化 */}
          <MemoEditor
            key={`${projectId}:${memoId}:${memo?.updated_at}`}
            initialContent={initialMemoContent}
            onContentChange={handleContentChange}
            onSave={handleSave}
            placeholder={memoPlaceholder}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default memo(MemoPage); 