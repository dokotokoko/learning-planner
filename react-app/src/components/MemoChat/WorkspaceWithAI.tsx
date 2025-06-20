import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Fab,
  Badge,
  Chip,
  Stack,
  Alert,
  Paper,
} from '@mui/material';
import {
  Close as CloseIcon,
  QuestionAnswer as ChatIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import AIChat from './AIChat';



interface WorkspaceWithAIProps {
  pageId: string;
  title: string;
  description?: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  onMessageSend?: (message: string, workContent: string) => Promise<string>;
  initialMessage?: string;
  initialAIResponse?: string;
  aiButtonText?: string;
  isAIOpen?: boolean;
  onAIOpenChange?: (isOpen: boolean) => void;
  showFabButton?: boolean;
  useAIChat?: boolean; // AIChatコンポーネントを使用するかどうか
  autoStartAI?: boolean; // AI対話を自動開始するかどうか
  isMemoOpen?: boolean; // メモ帳の表示状態（Step2用）
  onMemoOpenChange?: (isOpen: boolean) => void; // メモ帳の表示状態変更（Step2用）
  currentStep?: number; // 現在のステップ
  stepTheme?: string; // ステップのテーマ
  onStepThemeChange?: (theme: string) => void; // ステップのテーマ変更
  // ナビゲーション関連
  onNext?: () => void;
  onPrevious?: () => void;
  showPrevious?: boolean;
  showNext?: boolean;
  nextButtonText?: string;
}

const WorkspaceWithAI: React.FC<WorkspaceWithAIProps> = ({
  pageId,
  title,
  description,
  placeholder,
  value,
  onChange,
  onSave,
  onMessageSend,
  initialMessage,
  initialAIResponse,
  aiButtonText = "AIアシスタント",
  isAIOpen: externalIsAIOpen,
  onAIOpenChange,
  showFabButton = true,
  useAIChat = false,
  autoStartAI = false,
  isMemoOpen = false,
  onMemoOpenChange,
  currentStep = 1,
  stepTheme = '',
  onStepThemeChange,
  // ナビゲーション関連
  onNext,
  onPrevious,
  showPrevious = false,
  showNext = false,
  nextButtonText = '次へ',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [internalIsAIOpen, setInternalIsAIOpen] = useState(false);
  const isAIOpen = externalIsAIOpen !== undefined ? externalIsAIOpen : internalIsAIOpen;
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const workspaceRef = useRef<HTMLDivElement>(null);

  // AIチャットを開く
  const handleOpenAI = useCallback(() => {
    if (onAIOpenChange) {
      onAIOpenChange(true);
    } else {
      setInternalIsAIOpen(true);
    }
    setHasNewMessage(false);
  }, [onAIOpenChange]);

  // AIチャットを閉じる
  const handleCloseAI = useCallback(() => {
    if (onAIOpenChange) {
      onAIOpenChange(false);
    } else {
      setInternalIsAIOpen(false);
    }
  }, [onAIOpenChange]);

  // Step2での自動AI開始
  useEffect(() => {
    if (autoStartAI && useAIChat && !isAIOpen) {
      handleOpenAI();
    }
  }, [autoStartAI, useAIChat, isAIOpen, handleOpenAI]);



  // ワークスペース領域のクリア
  const handleClear = () => {
    onChange('');
    workspaceRef.current?.focus();
  };



  // メモ帳パネルコンポーネント
  const MemoPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const [memoContent, setMemoContent] = useState('');
    const [memoSaved, setMemoSaved] = useState(false);

    // メモの保存
    const handleSaveMemo = () => {
      localStorage.setItem(`memo-${pageId}`, memoContent);
      setMemoSaved(true);
      setTimeout(() => setMemoSaved(false), 2000);
    };

    // メモのクリア
    const handleClearMemo = () => {
      setMemoContent('');
      localStorage.removeItem(`memo-${pageId}`);
    };

    // 初期ロード
    useEffect(() => {
      const savedMemo = localStorage.getItem(`memo-${pageId}`);
      if (savedMemo) {
        setMemoContent(savedMemo);
      }
    }, [pageId]);

        return (
      <Box sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: 'background.default',
      }}>
        {/* メモ入力エリア */}
        <Box sx={{ 
          flex: 1, 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          position: 'relative',
        }}>
          {/* 閉じるボタン */}
          <IconButton 
            onClick={onClose} 
            size="small"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
              backgroundColor: 'background.paper',
              '&:hover': {
                backgroundColor: 'action.hover',
              },
            }}
          >
            <CloseIcon />
          </IconButton>

          <TextField
            multiline
            fullWidth
            rows={isMobile ? 8 : 12}
            value={memoContent}
            onChange={(e) => setMemoContent(e.target.value)}
            placeholder={`思考の整理や一時的なメモを自由に書いてください...

例：
• 思いついたアイデア
• 調べたいこと
• 重要なポイント
• 質問したいこと`}
            variant="outlined"
            sx={{
              flex: 1,
              '& .MuiOutlinedInput-root': {
                height: '100%',
                alignItems: 'flex-start',
                '& textarea': {
                  height: '100% !important',
                  overflow: 'auto !important',
                },
              },
            }}
          />

          {/* メモツールバー */}
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="text"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSaveMemo}
                disabled={!memoContent.trim()}
              >
                保存
              </Button>
              <Button
                variant="text"
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearMemo}
              >
                クリア
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              {memoContent.length} 文字
            </Typography>
          </Stack>

          {memoSaved && (
            <Alert severity="success" sx={{ mt: 1 }}>
              メモが保存されました！
            </Alert>
          )}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* メインコンテンツエリア */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {/* AIチャットが閉じている場合 */}
        {!isAIOpen && (
          <>
            {useAIChat ? (
              // Step2の場合：AI対話開始を促すメッセージ
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 3
              }}>
                <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
                  <Typography variant="h5" gutterBottom>
                    AIとの対話を開始しましょう
                  </Typography>
                  <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 3 }}>
                    右下のボタンからAIとの対話を開始して、探究テーマを深く考察していきましょう。
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    startIcon={<ChatIcon />}
                    onClick={handleOpenAI}
                    sx={{ minWidth: 200 }}
                  >
                    対話を開始する
                  </Button>
                </Box>
              </Box>
            ) : (
              // Step3,4の場合：フルスクリーンワークスペース
              <Box sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
                {/* ツールバー */}
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Button
                    variant="text"
                    startIcon={<SaveIcon />}
                    onClick={onSave}
                    size="small"
                  >
                    保存
                  </Button>
                  <Button
                    variant="text"
                    startIcon={<ClearIcon />}
                    onClick={handleClear}
                    size="small"
                  >
                    クリア
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Typography variant="caption" color="text.secondary">
                    {value.length} 文字
                  </Typography>
                </Stack>

                {/* テキストエリア */}
                <TextField
                  ref={workspaceRef}
                  multiline
                  fullWidth
                  rows={isMobile ? 10 : 20}
                  value={value}
                  onChange={(e) => onChange(e.target.value)}
                  placeholder={placeholder}
                  variant="outlined"
                  sx={{
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      height: '100%',
                      alignItems: 'flex-start',
                      '& textarea': {
                        height: '100% !important',
                        overflow: 'auto !important',
                      },
                    },
                  }}
                />
              </Box>
            )}
          </>
        )}

        {/* AIチャットが開いている場合 - 分割パネル */}
        {isAIOpen && (
          <>
            {useAIChat ? (
              // Step2以降の場合：AIチャット + オプションメモ帳 + テーマ入力
              <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                {/* AIチャット + メモ帳エリア */}
                <Box sx={{ flex: 1 }}>
                  {isMemoOpen ? (
                    // メモ帳が開いている場合：分割レイアウト
                    <PanelGroup 
                      direction={isMobile ? "vertical" : "horizontal"} 
                      style={{ height: '100%' }}
                    >
                      {/* AIチャットパネル */}
                      <Panel defaultSize={60} minSize={40} maxSize={80}>
                        <AIChat
                          pageId={pageId}
                          title={aiButtonText}
                          initialMessage={initialMessage}
                          initialAIResponse={initialAIResponse}
                          memoContent={value}
                          onMessageSend={onMessageSend}
                          onClose={handleCloseAI}
                          autoStart={autoStartAI}
                          showMemoButton={false}
                        />
                      </Panel>

                      {/* リサイズハンドル */}
                      <PanelResizeHandle>
                        <Box
                          sx={{
                            width: isMobile ? '100%' : '1px',
                            height: isMobile ? '1px' : '100%',
                            backgroundColor: 'divider',
                            cursor: isMobile ? 'row-resize' : 'col-resize',
                          }}
                        />
                      </PanelResizeHandle>

                      {/* メモ帳パネル */}
                      <Panel defaultSize={40} minSize={20} maxSize={60}>
                        <MemoPanel onClose={() => onMemoOpenChange?.(false)} />
                      </Panel>
                    </PanelGroup>
                  ) : (
                    // メモ帳が閉じている場合：AIチャットのみフルスクリーン
                    <AIChat
                      pageId={pageId}
                      title={aiButtonText}
                      initialMessage={initialMessage}
                      initialAIResponse={initialAIResponse}
                      memoContent={value}
                      onMessageSend={onMessageSend}
                      onClose={handleCloseAI}
                      autoStart={autoStartAI}
                      onOpenMemo={() => onMemoOpenChange?.(true)}
                      showMemoButton={true}
                    />
                  )}
                </Box>

                {/* テーマ入力エリア（Step2以降） */}
                {currentStep >= 2 && (
                  <Box 
                    sx={{ 
                      p: 3, 
                      m: 2, 
                      backgroundColor: 'background.default'
                    }}
                  >
                    <Typography variant="subtitle1" gutterBottom>
                      {currentStep === 2 && 'Step2で深めた探究テーマ'}
                      {currentStep === 3 && 'Step3で考えた自分事の探究テーマ'}
                      {currentStep === 4 && 'Step4で考えた社会と繋がる探究テーマ'}
                    </Typography>
                    <TextField
                      fullWidth
                      value={stepTheme}
                      onChange={(e) => onStepThemeChange?.(e.target.value)}
                      placeholder={
                        currentStep === 2 ? "Step2での対話を通じて深めた探究テーマを入力してください" :
                        currentStep === 3 ? "自分事として捉えた探究テーマを入力してください" :
                        "社会と繋がる最終的な探究テーマを入力してください"
                      }
                      variant="outlined"
                      size="small"
                      sx={{ mb: 1 }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                      このテーマは次のステップでAIとの対話に使用されます
                    </Typography>
                    
                    {/* ナビゲーションボタン */}
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      {showPrevious && (
                        <Button
                          variant="outlined"
                          onClick={onPrevious}
                          sx={{ minWidth: 100 }}
                        >
                          前へ
                        </Button>
                      )}
                      
                      {showNext && (
                        <Button
                          variant="contained"
                          onClick={onNext}
                          sx={{ minWidth: 100 }}
                        >
                          {nextButtonText}
                        </Button>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            ) : (
              // Step3,4の場合：ワークスペース + メモ帳
              <PanelGroup 
                direction={isMobile ? "vertical" : "horizontal"} 
                style={{ height: '100%' }}
              >
                {/* ワークスペースパネル */}
                <Panel defaultSize={60} minSize={30} maxSize={80}>
                  <Box sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
                    {/* ツールバー */}
                    <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                      <Button
                        variant="text"
                        startIcon={<SaveIcon />}
                        onClick={onSave}
                        size="small"
                      >
                        保存
                      </Button>
                      <Button
                        variant="text"
                        startIcon={<ClearIcon />}
                        onClick={handleClear}
                        size="small"
                      >
                        クリア
                      </Button>
                      <Box sx={{ flex: 1 }} />
                      <Typography variant="caption" color="text.secondary">
                        {value.length} 文字
                      </Typography>
                    </Stack>

                    {/* テキストエリア */}
                    <TextField
                      multiline
                      fullWidth
                      value={value}
                      onChange={(e) => onChange(e.target.value)}
                      placeholder={placeholder}
                      variant="outlined"
                      sx={{
                        flex: 1,
                        '& .MuiOutlinedInput-root': {
                          height: '100%',
                          alignItems: 'flex-start',
                          '& textarea': {
                            height: '100% !important',
                            overflow: 'auto !important',
                          },
                        },
                      }}
                    />
                  </Box>
                </Panel>

                {/* リサイズハンドル */}
                <PanelResizeHandle>
                  <Box
                    sx={{
                      width: isMobile ? '100%' : '1px',
                      height: isMobile ? '1px' : '100%',
                      backgroundColor: 'divider',
                      cursor: isMobile ? 'row-resize' : 'col-resize',
                    }}
                  />
                </PanelResizeHandle>

                {/* メモ帳パネル */}
                <Panel defaultSize={40} minSize={20} maxSize={70}>
                  <MemoPanel onClose={handleCloseAI} />
                </Panel>
              </PanelGroup>
            )}
          </>
        )}
      </Box>

      {/* AIアシスタント/メモ帳開閉ボタン（Step3,4でチャットが閉じているときのみ表示） */}
      {showFabButton && !isAIOpen && !useAIChat && (
        <Fab
          color="primary"
          onClick={handleOpenAI}
          sx={{
            position: 'fixed',
            bottom: 80, // ナビゲーションボタンと重ならないよう調整
            right: 24,
            zIndex: 1000,
          }}
        >
          <Badge color="error" variant="dot" invisible={!hasNewMessage}>
            <ChatIcon />
          </Badge>
        </Fab>
      )}
    </Box>
  );
};

export default WorkspaceWithAI; 