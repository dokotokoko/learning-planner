import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Chip,
  Divider,
  useTheme,
  useMediaQuery,
  Tooltip,
  Zoom,
  Fade,
} from '@mui/material';
import {
  Send as SendIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  SmartToy as AIIcon,
  Person as UserIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MemoChatProps {
  pageId: string;
  memoTitle: string;
  memoPlaceholder: string;
  chatPlaceholder: string;
  initialMessage?: string;
  onMemoChange?: (content: string) => void;
  onMessageSend?: (message: string, memoContent: string) => Promise<string>;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  onSave?: (content: string) => Promise<void>;
}

const MemoChat: React.FC<MemoChatProps> = ({
  pageId,
  memoTitle,
  memoPlaceholder,
  chatPlaceholder,
  initialMessage,
  onMemoChange,
  onMessageSend,
  sidebarOpen = true,
  onSidebarToggle,
  onSave,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [memoContent, setMemoContent] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(true);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedContent, setLastSavedContent] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const memoRef = useRef<HTMLDivElement>(null);

  // 初期メッセージの設定
  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        content: initialMessage,
        timestamp: new Date(),
      }]);
    }
  }, [initialMessage]);

  // キーボードショートカット (Ctrl+S / Cmd+S) の設定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (hasUnsavedChanges && onSave) {
          handleMemoSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges, memoContent]);

  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '保存されていない変更があります。本当にページを離れますか？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // チャット自動スクロール
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // メモ内容変更時の処理
  const handleMemoChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const content = event.target.value;
    setMemoContent(content);
    onMemoChange?.(content);
    
    // 未保存フラグを設定
    if (content !== lastSavedContent) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  };

  // メモクリア
  const handleMemoClear = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('保存されていない変更があります。本当にクリアしますか？');
      if (!confirmed) return;
    }
    setMemoContent('');
    onMemoChange?.('');
    setSaveError(null);
    setHasUnsavedChanges(false);
  };

  // 手動保存
  const handleMemoSave = async () => {
    if (!onSave || !hasUnsavedChanges) return;
    
    setIsSaving(true);
    setSaveError(null);
    
    try {
      await onSave(memoContent);
      setLastSavedContent(memoContent);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Save failed:', error);
      setSaveError('保存に失敗しました');
    } finally {
      setIsSaving(false);
    }
  };

  // メッセージ送信
  const handleMessageSend = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      // AIからの応答を取得
      const response = await onMessageSend?.(currentMessage, memoContent) || 
        "申し訳ございませんが、現在AIサービスが利用できません。";

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // チャット履歴クリア
  const handleChatClear = () => {
    setMessages(initialMessage ? [{
      id: Date.now().toString(),
      role: 'assistant',
      content: initialMessage,
      timestamp: new Date(),
    }] : []);
  };

  // Enter送信（Shift+Enterで改行）
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleMessageSend();
    }
  };

  // メッセージコピー機能
  const handleCopyMessage = async (message: Message) => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  // サイドバー幅を考慮したコンテナの計算
  const drawerWidth = 280;
  const collapsedDrawerWidth = 64;
  
  // sidebarOpenがfalseの場合は固定幅レイアウトを使用
  const containerStyles = sidebarOpen === false ? {
    position: 'relative' as const,
    width: '100%',
    height: '100%',
    backgroundColor: 'background.default',
  } : {
    position: 'fixed' as const,
    top: 64, // AppBar height
    left: isMobile ? 0 : (sidebarOpen ? drawerWidth : collapsedDrawerWidth),
    right: 0,
    bottom: 0,
    width: isMobile 
      ? '100%' 
      : `calc(100% - ${sidebarOpen ? drawerWidth : collapsedDrawerWidth}px)`,
    transition: 'left 0.3s ease, width 0.3s ease',
    backgroundColor: 'background.default',
  };

  // デスクトップレイアウト
  if (!isMobile) {
    return (
      <Box sx={containerStyles}>
        <PanelGroup direction="horizontal" style={{ height: '100%' }}>
          {/* メモパネル */}
          <Panel defaultSize={45} minSize={25} maxSize={70}>
            <Box sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'background.paper',
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 3,
                backgroundColor: 'background.default',
              }}>
                <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
                  {memoTitle}
                </Typography>
                {isSaving && (
                  <Typography variant="caption" sx={{ mr: 2, color: 'text.secondary' }}>
                    保存中...
                  </Typography>
                )}
                {!isSaving && lastSavedContent === memoContent && memoContent !== '' && (
                  <Typography variant="caption" sx={{ mr: 2, color: 'success.main' }}>
                    保存済み
                  </Typography>
                )}
                {saveError && (
                  <Typography variant="caption" sx={{ mr: 2, color: 'error.main' }}>
                    {saveError}
                  </Typography>
                )}
                <Tooltip title="メモをクリア" arrow>
                  <IconButton onClick={handleMemoClear} size="small" sx={{ mr: 1 }}>
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={hasUnsavedChanges ? "メモを保存 (Ctrl+S)" : "変更なし"} arrow>
                  <IconButton 
                    onClick={handleMemoSave} 
                    size="small" 
                    color={hasUnsavedChanges ? "primary" : "default"}
                    disabled={!hasUnsavedChanges || !onSave}
                  >
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              <TextField
                multiline
                fullWidth
                value={memoContent}
                onChange={handleMemoChange}
                placeholder={memoPlaceholder}
                variant="standard"
                sx={{
                  flex: 1,
                  p: 3,
                  '& .MuiInputBase-root': {
                    height: '100%',
                    padding: 0,
                    '& textarea': {
                      height: '100% !important',
                    },
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
          </Panel>

          {/* リサイズハンドル */}
          <PanelResizeHandle style={{
            width: '8px',
            backgroundColor: theme.palette.divider,
            cursor: 'col-resize',
            position: 'relative',
          }}>
            <Box sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '4px',
              height: '40px',
              backgroundColor: 'background.paper',
              borderRadius: '2px',
            }} />
          </PanelResizeHandle>

          {/* チャットパネル */}
          <Panel defaultSize={55} minSize={30}>
            <Box sx={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: 'background.default',
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 3,
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    AIアシスタント
                  </Typography>
                </Box>
                <Tooltip title="チャット履歴をクリア" arrow>
                  <IconButton onClick={handleChatClear} size="small">
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {/* メッセージ表示エリア */}
              <Box sx={{ 
                flex: 1,
                overflow: 'auto',
                px: 3,
                py: 2,
                display: 'flex',
                flexDirection: 'column',
                gap: 3,
              }}>
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                          alignItems: 'flex-start',
                          gap: 2,
                        }}
                      >
                        <Chip
                          icon={message.role === 'user' ? <UserIcon /> : <AIIcon />}
                          label={message.role === 'user' ? 'あなた' : 'AI'}
                          size="small"
                          color={message.role === 'user' ? 'primary' : 'default'}
                          sx={{ mt: 1 }}
                        />
                        <Box
                          sx={{
                            p: 2,
                            maxWidth: '75%',
                            backgroundColor: message.role === 'user' 
                              ? 'primary.light'
                              : 'background.paper',
                            color: message.role === 'user'
                              ? 'primary.contrastText'
                              : 'text.primary',
                            borderRadius: 2,
                            position: 'relative',
                            boxShadow: 'none',
                            '&:hover .message-actions': {
                              opacity: 1,
                            },
                          }}
                        >
                          <Typography 
                            variant="body1" 
                            sx={{ 
                              whiteSpace: 'pre-wrap',
                              wordBreak: 'break-word',
                              lineHeight: 1.7,
                            }}
                          >
                            {message.content}
                          </Typography>
                          <Box 
                            className="message-actions"
                            sx={{ 
                              position: 'absolute',
                              top: -20,
                              right: 0,
                              opacity: 0,
                              transition: 'opacity 0.2s ease',
                            }}
                          >
                            <Tooltip 
                              title={copiedMessageId === message.id ? "コピーしました" : "メッセージをコピー"} 
                              arrow
                              TransitionComponent={Zoom}
                            >
                              <IconButton
                                size="small"
                                onClick={() => handleCopyMessage(message)}
                                color={copiedMessageId === message.id ? "success" : "default"}
                              >
                                {copiedMessageId === message.id ? <CheckIcon /> : <CopyIcon />}
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {isLoading && <TypingIndicator />}
                <div ref={chatEndRef} />
              </Box>

              {/* メッセージ入力エリア */}
              <Box sx={{ p: 3, backgroundColor: 'background.paper' }}>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField
                    fullWidth
                    multiline
                    maxRows={4}
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={chatPlaceholder}
                    disabled={isLoading}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 3,
                      },
                    }}
                  />
                  <Tooltip title="メッセージを送信 (Enter)" arrow>
                    <span>
                      <IconButton
                        color="primary"
                        onClick={handleMessageSend}
                        disabled={!currentMessage.trim() || isLoading}
                        sx={{
                          height: '100%',
                          width: 56,
                          transition: 'all 0.2s ease',
                          '&:not(:disabled):hover': {
                            transform: 'scale(1.1)',
                            backgroundColor: 'primary.main',
                            color: 'primary.contrastText',
                          },
                        }}
                      >
                        <SendIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          </Panel>
        </PanelGroup>
      </Box>
    );
  }

  // モバイルレイアウト
  return (
    <Box sx={{ 
      height: 'calc(100vh - 64px)',
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: 'background.default',
      mt: '64px', // AppBar height
    }}>
      {/* メモエリア */}
      <Box sx={{ backgroundColor: 'background.paper' }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          p: 3,
        }}>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 600 }}>
            {memoTitle}
          </Typography>
          {isSaving && (
            <Typography variant="caption" sx={{ mr: 2, color: 'text.secondary' }}>
              保存中...
            </Typography>
          )}
          {!isSaving && lastSavedContent === memoContent && memoContent !== '' && (
            <Typography variant="caption" sx={{ mr: 2, color: 'success.main' }}>
              保存済み
            </Typography>
          )}
          {saveError && (
            <Typography variant="caption" sx={{ mr: 2, color: 'error.main' }}>
              {saveError}
            </Typography>
          )}
          <IconButton 
            onClick={() => setIsChatExpanded(!isChatExpanded)}
            size="small"
            sx={{ mr: 1 }}
          >
            {isChatExpanded ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
          <Tooltip title="メモをクリア" arrow>
            <IconButton onClick={handleMemoClear} size="small" sx={{ mr: 1 }}>
              <ClearIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title={hasUnsavedChanges ? "メモを保存 (Ctrl+S)" : "変更なし"} arrow>
            <IconButton 
              onClick={handleMemoSave} 
              size="small" 
              color={hasUnsavedChanges ? "primary" : "default"}
              disabled={!hasUnsavedChanges || !onSave}
            >
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Box>
        <Fade in={!isChatExpanded}>
          <TextField
            multiline
            minRows={4}
            maxRows={8}
            fullWidth
            value={memoContent}
            onChange={handleMemoChange}
            placeholder={memoPlaceholder}
            variant="standard"
            sx={{
              display: isChatExpanded ? 'none' : 'block',
              px: 3,
              pb: 3,
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
        </Fade>
      </Box>

      {/* チャットエリア */}
      <Box sx={{ 
        flex: isChatExpanded ? 1 : 'none',
        display: 'flex',
        flexDirection: 'column',
        height: isChatExpanded ? 'calc(100% - 72px)' : 'auto',
      }}>
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center',
          p: 3,
          backgroundColor: 'background.paper',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              AIアシスタント
            </Typography>
          </Box>
          <Tooltip title="チャット履歴をクリア" arrow>
            <IconButton onClick={handleChatClear} size="small">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        {/* メッセージ表示エリア */}
        <Box sx={{ 
          flex: 1,
          overflow: 'auto',
          px: 3,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}>
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: message.role === 'user' ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 2,
                  }}
                >
                  <Chip
                    icon={message.role === 'user' ? <UserIcon /> : <AIIcon />}
                    label={message.role === 'user' ? 'あなた' : 'AI'}
                    size="small"
                    color={message.role === 'user' ? 'primary' : 'default'}
                    sx={{ mt: 1 }}
                  />
                  <Box
                    sx={{
                      p: 2,
                      maxWidth: '75%',
                      backgroundColor: message.role === 'user' 
                        ? 'primary.light'
                        : 'background.paper',
                      color: message.role === 'user'
                        ? 'primary.contrastText'
                        : 'text.primary',
                      borderRadius: 2,
                      position: 'relative',
                      boxShadow: 'none',
                      '&:hover .message-actions': {
                        opacity: 1,
                      },
                    }}
                  >
                    <Typography 
                      variant="body1" 
                      sx={{ 
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        lineHeight: 1.7,
                      }}
                    >
                      {message.content}
                    </Typography>
                    <Box 
                      className="message-actions"
                      sx={{ 
                        position: 'absolute',
                        top: -20,
                        right: 0,
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      <Tooltip 
                        title={copiedMessageId === message.id ? "コピーしました" : "メッセージをコピー"} 
                        arrow
                        TransitionComponent={Zoom}
                      >
                        <IconButton
                          size="small"
                          onClick={() => handleCopyMessage(message)}
                          color={copiedMessageId === message.id ? "success" : "default"}
                        >
                          {copiedMessageId === message.id ? <CheckIcon /> : <CopyIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && <TypingIndicator />}
          <div ref={chatEndRef} />
        </Box>

        {/* メッセージ入力エリア */}
        <Box sx={{ p: 3, backgroundColor: 'background.paper' }}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={chatPlaceholder}
              disabled={isLoading}
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 3,
                },
              }}
            />
            <Tooltip title="メッセージを送信 (Enter)" arrow>
              <span>
                <IconButton
                  color="primary"
                  onClick={handleMessageSend}
                  disabled={!currentMessage.trim() || isLoading}
                  sx={{
                    height: '100%',
                    width: 56,
                    transition: 'all 0.2s ease',
                    '&:not(:disabled):hover': {
                      transform: 'scale(1.1)',
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                    },
                  }}
                >
                  <SendIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

// タイピングインジケーター
const TypingIndicator: React.FC = () => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Chip
        icon={<AIIcon />}
        label="AI"
        size="small"
        sx={{ mb: 1 }}
      />
      <Box
        sx={{
          p: 2,
          maxWidth: '80%',
          backgroundColor: 'background.paper',
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', gap: 1 }}>
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8 }}
              animate={{ scale: [0.8, 1.2, 0.8] }}
              transition={{
                duration: 1,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: theme.palette.primary.main,
                  opacity: 0.6,
                }}
              />
            </motion.div>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default MemoChat; 