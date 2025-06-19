import React, { useState, useRef, useEffect } from 'react';
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
} from '@mui/material';
import {
  Close as CloseIcon,
  QuestionAnswer as ChatIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';



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
  aiButtonText?: string;
  isAIOpen?: boolean;
  onAIOpenChange?: (isOpen: boolean) => void;
  showFabButton?: boolean;
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
  aiButtonText = "AIアシスタント",
  isAIOpen: externalIsAIOpen,
  onAIOpenChange,
  showFabButton = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [internalIsAIOpen, setInternalIsAIOpen] = useState(false);
  const isAIOpen = externalIsAIOpen !== undefined ? externalIsAIOpen : internalIsAIOpen;
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const workspaceRef = useRef<HTMLDivElement>(null);

  // AIチャットを開く
  const handleOpenAI = () => {
    if (onAIOpenChange) {
      onAIOpenChange(true);
    } else {
      setInternalIsAIOpen(true);
    }
    setHasNewMessage(false);
  };

  // AIチャットを閉じる
  const handleCloseAI = () => {
    if (onAIOpenChange) {
      onAIOpenChange(false);
    } else {
      setInternalIsAIOpen(false);
    }
  };



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
        {/* メモ帳ヘッダー */}
        <Box sx={{ 
          p: 2, 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: 'background.paper',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Typography variant="h6" fontWeight={600}>
            📝 メモ帳
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* メモ入力エリア */}
        <Box sx={{ 
          flex: 1, 
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
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
          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                size="small"
                startIcon={<SaveIcon />}
                onClick={handleSaveMemo}
                disabled={!memoContent.trim()}
              >
                保存
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<ClearIcon />}
                onClick={handleClearMemo}
              >
                クリア
              </Button>
            </Stack>
            <Chip
              label={`${memoContent.length} 文字`}
              size="small"
              variant="outlined"
            />
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
      {/* ヘッダー */}
      <Box sx={{ 
        borderBottom: 1, 
        borderColor: 'divider',
        p: 3,
        backgroundColor: 'background.paper',
      }}>
        <Typography variant="h5" fontWeight={600} gutterBottom>
          {title}
        </Typography>
        {description && (
          <Typography variant="body2" color="text.secondary">
            {description}
          </Typography>
        )}
      </Box>

      {/* メインコンテンツエリア */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {/* AIチャットが閉じている場合 - フルスクリーンワークスペース */}
        {!isAIOpen && (
          <Box sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column' }}>
            {/* ツールバー */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                onClick={onSave}
                size="small"
              >
                保存
              </Button>
              <Button
                variant="outlined"
                startIcon={<ClearIcon />}
                onClick={handleClear}
                size="small"
              >
                クリア
              </Button>
              <Box sx={{ flex: 1 }} />
              <Chip
                label={`${value.length} 文字`}
                size="small"
                variant="outlined"
              />
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

        {/* AIチャットが開いている場合 - 分割パネル */}
        {isAIOpen && (
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
                    variant="outlined"
                    startIcon={<SaveIcon />}
                    onClick={onSave}
                    size="small"
                  >
                    保存
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<ClearIcon />}
                    onClick={handleClear}
                    size="small"
                  >
                    クリア
                  </Button>
                  <Box sx={{ flex: 1 }} />
                  <Chip
                    label={`${value.length} 文字`}
                    size="small"
                    variant="outlined"
                  />
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
                  width: isMobile ? '100%' : '4px',
                  height: isMobile ? '4px' : '100%',
                  backgroundColor: '#e0e0e0',
                  cursor: isMobile ? 'row-resize' : 'col-resize',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.main,
                  },
                }}
              />
            </PanelResizeHandle>

            {/* メモ帳パネル */}
            <Panel defaultSize={40} minSize={20} maxSize={70}>
              <MemoPanel onClose={handleCloseAI} />
            </Panel>
          </PanelGroup>
        )}
      </Box>

      {/* AIアシスタント開閉ボタン（AIチャットが閉じているときのみ表示） */}
      {showFabButton && !isAIOpen && (
        <Fab
          color="primary"
          onClick={handleOpenAI}
          sx={{
            position: 'fixed',
            bottom: 24,
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