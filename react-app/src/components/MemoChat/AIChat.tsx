import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  List,
  ListItem,
  Avatar,
  Stack,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  NoteAdd as MemoIcon,
  History as HistoryIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import ChatHistory from './ChatHistory';
import SmartNotificationManager, { SmartNotificationManagerRef } from '../SmartNotificationManager';
import { useChatStore } from '../../stores/chatStore';
import { AI_INITIAL_MESSAGE } from '../../constants/aiMessages';
import { useAIChatMessages } from '../../hooks/useAIChatMessages';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date | string | undefined | null;
}

interface AIChatProps {
  pageId: string;
  title: string;
  initialMessage?: string;
  initialAIResponse?: string;
  memoContent?: string; // 使用しないが、既存コンポーネントとの互換性のため残す
  currentMemoContent?: string; // 現在のメモコンテンツ（動的更新用）
  currentMemoTitle?: string; // 現在のメモタイトル（動的更新用）
  onMessageSend?: (message: string, memoContent: string) => Promise<string>;
  onClose?: () => void;
  autoStart?: boolean; // 自動開始フラグ
  onOpenMemo?: () => void; // メモ帳を開く（Step2用）
  showMemoButton?: boolean; // メモ帳ボタンを表示するか
  hideMemoButton?: boolean; // メモ帳ボタンを隠すか（メモ帳が開いているときなど）
  forceRefresh?: boolean; // 強制的にメッセージをクリアして再初期化
  loadHistoryFromDB?: boolean; // データベースから履歴を読み込むか
  isInitializing?: boolean; // 初期化中かどうか（外部から制御）
  enableSmartNotifications?: boolean; // スマート通知機能を有効にするか
  onActivityRecord?: (message: string, sender: 'user' | 'ai') => void; // 学習活動記録
  persistentMode?: boolean; // 継続モード（メモ切り替えでリセットしない）
}

const AIChat: React.FC<AIChatProps> = ({
  pageId,
  initialMessage,
  initialAIResponse,
  memoContent = '',
  currentMemoContent = '',
  currentMemoTitle = '',
  onMessageSend,
  onClose,
  autoStart = false,
  onOpenMemo,
  showMemoButton = false,
  hideMemoButton = false,
  forceRefresh = false,
  loadHistoryFromDB = true,
  isInitializing = false,
  enableSmartNotifications = true,
  onActivityRecord,
  persistentMode = false,
}) => {
  // 統一されたメッセージ管理フックを使用
  const { messages, addMessage, setMessages, clearMessages } = useAIChatMessages(pageId);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // 通知システムのref
  const notificationManagerRef = useRef<SmartNotificationManagerRef>(null);

  // 初期化管理用のref（pageIdのみで管理、autoStartは除外）
  const initializationKeyRef = useRef(pageId);
  
  // タイマー管理用
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  // デフォルトの初期メッセージを返す関数
  const getDefaultInitialMessage = (): string => {
    return AI_INITIAL_MESSAGE;
  };

  // スクロール位置の監視
  const checkScrollPosition = () => {
    const container = messageListRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    
    // スクロール位置が90%以上の場合は最下部近くと判定
    setShouldAutoScroll(scrollPercentage > 0.9);
  };

  // スクロールイベントハンドラ（イベント駆動）
  const scrollTimeoutRef = useRef<number>();

  const setupScrollHandling = useCallback(() => {
    const container = messageListRef.current;
    if (!container) return null;

    const handleScroll = () => {
      setIsUserScrolling(true);
      checkScrollPosition();
      
      // スクロール停止後、少し待ってからユーザースクロールフラグをリセット
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      scrollTimeoutRef.current = window.setTimeout(() => {
        setIsUserScrolling(false);
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // メッセージクリア関数（イベント駆動）
  const clearMessagesIfNeeded = useCallback(() => {
    if (forceRefresh || (!persistentMode && initializationKeyRef.current !== pageId)) {
      clearMessages();
      setHistoryLoaded(false);
      setShouldAutoScroll(true);
      setIsUserScrolling(false);
      initializationKeyRef.current = pageId;
      return true; // クリアが実行されたことを示す
    }
    return false;
  }, [forceRefresh, pageId, persistentMode, clearMessages]);

  // ストア同期関数（カスタムフックで管理されるため不要）
  const syncMessagesFromStore = useCallback(() => {
    // カスタムフックが自動的に同期するため、ここでは何もしない
  }, []);

  // タイマー管理ヘルパー
  const setManagedTimeout = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timersRef.current.delete(timer);
      callback();
    }, delay);
    timersRef.current.add(timer);
    return timer;
  }, []);

  // 対話履歴読み込み関数（イベント駆動）
  const loadChatHistory = useCallback(async () => {
    if (!loadHistoryFromDB || historyLoaded) return;

    try {
      // ユーザーIDを取得
      let userId = null;
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.state?.user?.id) {
            userId = parsed.state.user.id;
          }
        } catch (e) {
          console.error('認証データの解析に失敗:', e);
        }
      }
      if (!userId) return;

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      // グローバルチャット履歴を取得（pageIdに関係なく独立）
      const historyUrl = pageId.includes('dashboard') 
        ? `${apiBaseUrl}/chat/history?page=dashboard` 
        : `${apiBaseUrl}/chat/history`; // pageパラメータを除去
      const response = await fetch(historyUrl, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const history = await response.json();
        const historyMessages: Message[] = history.map((item: any) => ({
          id: item.id.toString(),
          role: item.sender === 'user' ? 'user' : 'assistant',
          content: item.message,
          timestamp: item.created_at ? new Date(item.created_at) : new Date(),
        }));

        // ダッシュボードの場合は空の履歴（バックエンドで制御済み）
        if (pageId.includes('dashboard')) {
          // ダッシュボードは初期メッセージのみ表示
          const initialMessage: Message = {
            id: `initial-${Date.now()}`,
            role: 'assistant',
            content: getDefaultInitialMessage(),
            timestamp: new Date(),
          };
          setMessages([initialMessage]);
        } else {
          // その他のページは全てグローバル履歴を表示
          setMessages(historyMessages);
        }
        
        setHistoryLoaded(true);
        
        // 履歴読み込み後に最下部にスクロール
        setManagedTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
        }, 100);
      }
    } catch (error) {
      console.error('対話履歴の読み込みエラー:', error);
      setHistoryLoaded(true); // エラーでも処理を続行
    }
  }, [pageId, loadHistoryFromDB, historyLoaded]);

  // 初期メッセージ設定関数（イベント駆動）
  const loadInitialMessages = useCallback(async () => {
    // 履歴読み込みが有効で、ダッシュボード系のページの場合は履歴読み込み処理に任せる
    if (loadHistoryFromDB && (pageId.includes('dashboard') || pageId.includes('general-'))) {
      return;
    }
    
    // 既にメッセージがある場合はスキップ
    if (messages.length > 0) return;
    
    // 履歴読み込み中の場合はスキップ
    if (loadHistoryFromDB && !historyLoaded) return;
    
    const initialMessages: Message[] = [];
    
    // Step2以降の場合、LocalStorageから初期AI応答を取得（ユーザー固有）
    if ((pageId === 'step-2' || pageId === 'step-3' || pageId === 'step-4') && autoStart) {
      const stepNumber = pageId.replace('step-', '');
      
      // ユーザーIDを取得
      let userId = null;
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.state?.user?.id) {
            userId = parsed.state.user.id;
          }
        } catch (e) {
          console.error('認証データの解析に失敗:', e);
        }
      }

      if (userId) {
        const savedInitialResponse = localStorage.getItem(`user-${userId}-step${stepNumber}-initial-ai-response`);
        if (savedInitialResponse) {
          initialMessages.push({
            id: `initial-response-${Date.now()}`,
            role: 'assistant',
            content: savedInitialResponse,
            timestamp: new Date(),
          });
        } else if (initialAIResponse) {
          // LocalStorageにない場合は、propsから設定
          initialMessages.push({
            id: `initial-response-${Date.now()}`,
            role: 'assistant',
            content: initialAIResponse,
            timestamp: new Date(),
          });
        }
      }
    } else {
      // デフォルトの初期メッセージを表示
      initialMessages.push({
        id: `initial-${Date.now()}`,
        role: 'assistant',
        content: getDefaultInitialMessage(),
        timestamp: new Date(),
      });
    }
    
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
      // 初期化完了を記録
      initializationKeyRef.current = pageId;
    }
  }, [initialMessage, initialAIResponse, pageId, loadHistoryFromDB, historyLoaded, messages.length, autoStart]);

  // 自動スクロール処理（イベント駆動）
  const previousMessageCountRef = useRef(0);
  
  const scrollToBottomIfNeeded = useCallback(() => {
    // メッセージが新しく追加された場合かつ、ユーザーがスクロール中でない、かつ自動スクロールが有効な場合のみ実行
    if (messages.length > previousMessageCountRef.current && !isUserScrolling && shouldAutoScroll) {
      setManagedTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    previousMessageCountRef.current = messages.length;
  }, [messages, isUserScrolling, shouldAutoScroll, setManagedTimeout]);



  // メッセージ送信処理（二重送信防止付き）
  const isSendingRef = useRef(false);
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isSendingRef.current) return;
    
    // 二重送信防止フラグ
    isSendingRef.current = true;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    // 統一されたフックでメッセージ追加
    addMessage(userMessage);
    setInputValue('');
    setIsLoading(true);
    
    // 学習活動記録
    if (onActivityRecord) {
      onActivityRecord(userMessage.content, 'user');
    }
    // 通知システムにも記録
    notificationManagerRef.current?.recordActivity(userMessage.content, 'user');
    
    // メッセージ送信時は条件付きで最下部にスクロール
    scrollToBottomIfNeeded();

    try {
      let aiResponse = '';
      
      if (onMessageSend) {
        // 継続モードの場合は現在のメモコンテンツを使用、そうでなければ従来通り
        const contextContent = persistentMode ? currentMemoContent : memoContent;
        aiResponse = await onMessageSend(userMessage.content, contextContent);
      } else {
        // データベース対応のチャットAPIを使用
        // ユーザーIDを取得
        let userId = null;
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          try {
            const parsed = JSON.parse(authData);
            if (parsed.state?.user?.id) {
              userId = parsed.state.user.id;
            }
          } catch (e) {
            console.error('認証データの解析に失敗:', e);
          }
        }
        if (userId) {
          const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
          const response = await fetch(`${apiBaseUrl}/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${userId}`,
            },
            credentials: 'include',
            body: JSON.stringify({
              message: userMessage.content,
              // pageIdを送信しない（グローバルチャットのため）
              context: persistentMode ? `現在のメモ: ${currentMemoTitle}\n\n${currentMemoContent}` : undefined,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            aiResponse = result.response;
          } else {
            throw new Error('API応答エラー');
          }
        } else {
          // フォールバック処理
          await new Promise(resolve => setTimeout(resolve, 1000));
          aiResponse = `「${userMessage.content}」について理解しました。さらに詳しく教えてください。`;
        }
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),  
      };

      // 統一されたフックでAI応答を追加
      addMessage(assistantMessage);
      
      // 学習活動記録（AI応答）
      if (onActivityRecord) {
        onActivityRecord(assistantMessage.content, 'ai');
      }
      // 通知システムにも記録
      notificationManagerRef.current?.recordActivity(assistantMessage.content, 'ai');
      
      // AI応答完了時も条件付きで最下部にスクロール
      setManagedTimeout(() => scrollToBottomIfNeeded(), 200);
    } catch (error) {
      console.error('AI応答エラー:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '申し訳ございません。応答の生成中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };
      // 統一されたフックでエラーメッセージを追加
      addMessage(errorMessage);
      
      // エラーメッセージ表示時も条件付きで最下部にスクロール
      setManagedTimeout(() => scrollToBottomIfNeeded(), 200);
    } finally {
      setIsLoading(false);
      isSendingRef.current = false; // 二重送信防止フラグをリセット
      inputRef.current?.focus();
    }
  };

  // Enterキーでメッセージ送信
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: Date | string | undefined | null) => {
    try {
      // timestampがnullまたはundefinedの場合は現在時刻を使用
      if (!timestamp) {
        return new Date().toLocaleTimeString('ja-JP', {
          hour: '2-digit',
          minute: '2-digit',
        });
      }

      // 文字列の場合はDateオブジェクトに変換
      let date: Date;
      if (typeof timestamp === 'string') {
        date = new Date(timestamp);
      } else if (timestamp instanceof Date) {
        date = timestamp;
      } else {
        // その他の型の場合は現在時刻を使用
        date = new Date();
      }
      
      // 無効な日付の場合は現在時刻を使用
      if (isNaN(date.getTime())) {
        date = new Date();
      }
      
      return date.toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      console.error('formatTime error:', error, 'timestamp:', timestamp);
      // エラーが発生した場合は現在時刻を返す
      return new Date().toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // 履歴セッション選択時の処理
  const handleSessionSelect = (session: any) => {
    const historyMessages: Message[] = session.messages.map((item: any) => ({
      id: item.id.toString(),
      role: item.sender === 'user' ? 'user' : 'assistant',
      content: item.message,
      timestamp: item.created_at ? new Date(item.created_at) : new Date(),
    }));
    
    setMessages(historyMessages);
    setIsHistoryOpen(false);
    setShouldAutoScroll(true);
    
    // 最下部にスクロール
    setManagedTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // 新しいチャット開始
  const handleNewChat = () => {
    clearMessages();
    setIsHistoryOpen(false);
    setShouldAutoScroll(true);
    
    // 初期メッセージがある場合は設定、なければデフォルトメッセージを使用
    const messageContent = initialMessage || getDefaultInitialMessage();
    const initialMsg: Message = {
      id: `initial-${Date.now()}`,
      role: 'assistant',
      content: messageContent,
      timestamp: new Date(),
    };
    addMessage(initialMsg);
  };

  // 初期化とクリーンアップ
  useEffect(() => {
    const wasCleared = clearMessagesIfNeeded();
    if (!wasCleared) {
      syncMessagesFromStore();
      if (!historyLoaded && loadHistoryFromDB) {
        loadChatHistory();
      } else if (!loadHistoryFromDB || historyLoaded) {
        loadInitialMessages();
      }
    }
  }, [pageId, forceRefresh, clearMessagesIfNeeded, syncMessagesFromStore, loadChatHistory, loadInitialMessages, loadHistoryFromDB, historyLoaded]);

  // スクロール処理の設定
  useEffect(() => {
    const cleanup = setupScrollHandling();
    return cleanup;
  }, [setupScrollHandling]);
  
  // メッセージ変更時のスクロール
  useEffect(() => {
    if (messages.length > previousMessageCountRef.current) {
      scrollToBottomIfNeeded();
      previousMessageCountRef.current = messages.length;
    }
  }, [messages, scrollToBottomIfNeeded]);
  
  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      // 全タイマーのクリア
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
      
      // 非同期処理のキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'background.default',
    }}>
      {/* ヘッダー */}
      <Box sx={{ 
        p: 1, 
        backgroundColor: 'background.default',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            onClick={() => setIsHistoryOpen(true)} 
            size="small" 
            title="対話履歴を表示"
            sx={{ color: 'primary.main' }}
          >
            <HistoryIcon />
          </IconButton>
          <IconButton 
            onClick={handleNewChat} 
            size="small" 
            title="新しいチャットを開始"
            sx={{ color: 'primary.main' }}
          >
            <AddIcon />
          </IconButton>
          {persistentMode && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showMemoButton && !hideMemoButton && onOpenMemo && (
            <IconButton onClick={onOpenMemo} size="small" title="メモ帳を開く">
              <MemoIcon />
            </IconButton>
          )}
          {onClose && (
            <IconButton onClick={onClose} size="small">
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* メッセージリスト */}
      <Box 
        ref={messageListRef}
        sx={{ 
          flex: 1, 
          overflow: 'auto',
          p: 1,
        }}
      >
        <List sx={{ py: 0 }}>
          {/* 初期化中の特別なローディング表示 */}
          {isInitializing && messages.length === 0 && (
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              minHeight: '300px',
              p: 3
            }}>
              <CircularProgress size={40} sx={{ mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                ・・・・・
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                あなたの探究テーマを前に進めるための一歩を、<br/>
                AIが一緒に考えています。
              </Typography>
            </Box>
          )}
          
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ListItem
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 2,
                    py: 2,
                    px: 1,
                  }}
                >
                  <Avatar
                    sx={{
                      bgcolor: message.role === 'assistant' ? 'primary.main' : 'secondary.main',
                      width: 36,
                      height: 36,
                    }}
                  >
                    {message.role === 'assistant' ? <AIIcon /> : <PersonIcon />}
                  </Avatar>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5 }}
                    >
                      {message.role === 'assistant' ? 'AI アシスタント' : 'あなた'} • {(() => {
                        try {
                          return formatTime(message.timestamp);
                        } catch (error) {
                          console.error('Timestamp formatting error:', error, 'message:', message);
                          return '時刻不明';
                        }
                      })()}
                    </Typography>
                    
                    <Box
                      sx={{
                        p: 2,
                        backgroundColor: message.role === 'assistant' 
                          ? 'background.paper' 
                          : 'primary.light',
                        color: message.role === 'assistant' 
                          ? 'text.primary' 
                          : 'primary.contrastText',
                        borderRadius: 2,
                      }}
                    >
                      <Typography 
                        variant="body1" 
                        sx={{ 
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.6,
                        }}
                      >
                        {message.content}
                      </Typography>
                    </Box>
                  </Box>
                </ListItem>
                
                {message !== messages[messages.length - 1] && (
                  <Box sx={{ height: 16 }} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {/* ローディング表示 */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ListItem sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main', width: 36, height: 36 }}>
                  <AIIcon />
                </Avatar>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} />
                  <Typography variant="body2" color="text.secondary">
                    AI が考えています...
                  </Typography>
                </Box>
              </ListItem>
            </motion.div>
          )}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* 入力エリア */}
      <Box sx={{ 
        p: 2, 
        backgroundColor: 'background.default',
      }}>
        <Stack direction="row" spacing={1} alignItems="flex-end">
          <TextField
            ref={inputRef}
            multiline
            maxRows={3}
            fullWidth
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="メッセージを入力してください..."
            variant="outlined"
            disabled={isLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
          <Button
            variant="contained"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            sx={{ 
              minWidth: 'auto',
              px: 2,
              py: 1.5,
              borderRadius: 2,
            }}
          >
            <SendIcon />
          </Button>
        </Stack>
      </Box>

      {/* チャット履歴パネル */}
      <AnimatePresence>
        {isHistoryOpen && (
          <ChatHistory
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            onSessionSelect={handleSessionSelect}
            currentPageId={pageId}
          />
        )}
      </AnimatePresence>

      {/* スマート通知システム */}
      {enableSmartNotifications && (
        <SmartNotificationManager 
          ref={notificationManagerRef}
          pageId={pageId}
        />
      )}
    </Box>
  );
};

export default AIChat;