import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  List,
  ListItem,
  Avatar,
  Stack,
  CircularProgress,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as AIIcon,
  Person as PersonIcon,
  Close as CloseIcon,
  NoteAdd as MemoIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  pageId: string;
  title: string;
  initialMessage?: string;
  initialAIResponse?: string;
  memoContent?: string;
  onMessageSend?: (message: string, memoContent: string) => Promise<string>;
  onClose?: () => void;
  autoStart?: boolean; // 自動開始フラグ
  onOpenMemo?: () => void; // メモ帳を開く（Step2用）
  showMemoButton?: boolean; // メモ帳ボタンを表示するか
}

const AIChat: React.FC<AIChatProps> = ({
  pageId,
  title,
  initialMessage,
  initialAIResponse,
  memoContent = '',
  onMessageSend,
  onClose,
  autoStart = false,
  onOpenMemo,
  showMemoButton = false,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 初期メッセージと初期応答の設定
  useEffect(() => {
    const loadInitialMessages = async () => {
      if (messages.length > 0) return; // 既にメッセージがある場合はスキップ
      
      const initialMessages: Message[] = [];
      
      // 初期メッセージ（AI からの挨拶）
      if (initialMessage) {
        initialMessages.push({
          id: `initial-${Date.now()}`,
          role: 'assistant',
          content: initialMessage,
          timestamp: new Date(),
        });
      }
      
      // Step2以降の場合、LocalStorageから初期AI応答を取得
      if ((pageId === 'step-2' || pageId === 'step-3' || pageId === 'step-4') && autoStart) {
        const stepNumber = pageId.replace('step-', '');
        const savedInitialResponse = localStorage.getItem(`step${stepNumber}-initial-ai-response`);
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
      
      if (initialMessages.length > 0) {
        setMessages(initialMessages);
      }
    };
    
    loadInitialMessages();
  }, [initialMessage, initialAIResponse, messages.length, pageId, autoStart]);

  // メッセージリストの最下部にスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // メッセージ送信処理
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      let aiResponse = '';
      
      if (onMessageSend) {
        aiResponse = await onMessageSend(userMessage.content, memoContent);
      } else {
        await new Promise(resolve => setTimeout(resolve, 1000));
        aiResponse = `「${userMessage.content}」について理解しました。さらに詳しく教えてください。`;
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI応答エラー:', error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: '申し訳ございません。応答の生成中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
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

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
        justifyContent: 'flex-end',
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showMemoButton && onOpenMemo && (
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
      <Box sx={{ 
        flex: 1, 
        overflow: 'auto',
        p: 1,
      }}>
        <List sx={{ py: 0 }}>
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
                      {message.role === 'assistant' ? 'AI アシスタント' : 'あなた'} • {formatTime(message.timestamp)}
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
    </Box>
  );
};

export default AIChat; 