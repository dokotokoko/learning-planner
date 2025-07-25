import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  CircularProgress,
  Backdrop,
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
  forceRefreshChat?: boolean; // チャットを強制リフレッシュ
  isInitializingAI?: boolean; // AI初期化中のローディング状態
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
  forceRefreshChat = false,
  isInitializingAI = false,
  // ナビゲーション関連
  onNext,
  onPrevious,
  showPrevious = false,
  showNext = false,
  nextButtonText = '次へ',
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  
  const [internalIsAIOpen, setInternalIsAIOpen] = useState(false);
  const isAIOpen = externalIsAIOpen !== undefined ? externalIsAIOpen : internalIsAIOpen;
  const [hasNewMessage, setHasNewMessage] = useState(false);
  
  const workspaceRef = useRef<HTMLDivElement>(null);
  
  // AIChatコンポーネントのインスタンスを保持するためのキー（固定化してメモ帳状態の影響を除去）
  const aiChatKey = `${pageId}-stable`;

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

  // Step2での自動AI開始（メモ帳状態に影響されないよう最小限の依存関係）
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

    // メモの保存（ユーザー固有）
    const handleSaveMemo = () => {
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
        localStorage.setItem(`user-${userId}-memo-${pageId}`, memoContent);
        setMemoSaved(true);
        setTimeout(() => setMemoSaved(false), 2000);
      }
    };

    // メモのクリア（ユーザー固有）
    const handleClearMemo = () => {
      setMemoContent('');
      
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
        localStorage.removeItem(`user-${userId}-memo-${pageId}`);
      }
    };

    // 初期ロード（ユーザー固有）
    useEffect(() => {
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
        const savedMemo = localStorage.getItem(`user-${userId}-memo-${pageId}`);
        if (savedMemo) {
          setMemoContent(savedMemo);
        }
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
              // Step2の場合：AI対話開始を促すメッセージまたはAI初期化中
              <Box sx={{ 
                height: '100%', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                p: 3,
                position: 'relative'
              }}>
                {isInitializingAI ? (
                  // AI初期化中のローディング表示
                  <Box sx={{ textAlign: 'center', maxWidth: 600 }}>
                    <CircularProgress size={60} sx={{ mb: 3 }} />
                    <Typography variant="h5" gutterBottom>
                      AIアシスタントを準備中...
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                      あなたの探究テーマについて考察するため、AIアシスタントが初期設定を行っています。
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      しばらくお待ちください...
                    </Typography>
                  </Box>
                ) : (
                  // 通常のAI対話開始を促すメッセージ
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
                )}
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
                    <Panel 
                      defaultSize={isMobile ? 50 : isTablet ? 55 : 60} 
                      minSize={isMobile ? 30 : isTablet ? 40 : 40} 
                      maxSize={isMobile ? 70 : isTablet ? 75 : 80}
                    >
                                          <AIChat
                      key={aiChatKey}
                      pageId={pageId}
                      title={aiButtonText}
                      initialMessage={initialMessage}
                      initialAIResponse={initialAIResponse}
                      memoContent={value}
                      onMessageSend={onMessageSend}
                      onClose={handleCloseAI}
                      autoStart={autoStartAI}
                      showMemoButton={true}
                      hideMemoButton={true}
                      forceRefresh={forceRefreshChat}
                      isInitializing={isInitializingAI}
                      persistentMode={true}
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
                    <Panel 
                      defaultSize={isMobile ? 50 : isTablet ? 45 : 40} 
                      minSize={isMobile ? 30 : isTablet ? 25 : 20} 
                      maxSize={isMobile ? 70 : isTablet ? 60 : 60}
                    >
                      <MemoPanel onClose={() => onMemoOpenChange?.(false)} />
                    </Panel>
                  </PanelGroup>
                ) : (
                  // メモ帳が閉じている場合：AIチャットのみフルスクリーン
                  <Box sx={{ height: '100%', position: 'relative' }}>
                    <AIChat
                      key={aiChatKey}
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
                      hideMemoButton={false}
                      forceRefresh={forceRefreshChat}
                      isInitializing={isInitializingAI}
                      persistentMode={true}
                    />
                  </Box>
                )}
                </Box>

                {/* Step5専用: テーマの進化を表示 */}
                {currentStep === 5 && (
                  <Box sx={{ mb: 3, p: 3, backgroundColor: 'background.default', borderRadius: 1 }}>
                    <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                      🌱 テーマの進化の軌跡
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      {(() => {
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

                        if (!userId) return <Typography variant="body2" color="text.secondary">テーマ情報を読み込めませんでした</Typography>;

                        const step1Theme = localStorage.getItem(`user-${userId}-step-1-theme`) || '';
                        const step2Theme = localStorage.getItem(`user-${userId}-step-2-theme`) || '';
                        const step3Theme = localStorage.getItem(`user-${userId}-step-3-theme`) || '';
                        const step4Theme = localStorage.getItem(`user-${userId}-step-4-theme`) || '';

                        const themes = [
                          { step: 1, emoji: '🌱', title: 'Step1（最初の興味）', theme: step1Theme },
                          { step: 2, emoji: '🌿', title: 'Step2（深めた理解）', theme: step2Theme },
                          { step: 3, emoji: '🌳', title: 'Step3（自分事の問い）', theme: step3Theme },
                          { step: 4, emoji: '🌟', title: 'Step4（社会との繋がり）', theme: step4Theme }
                        ];

                        return themes.map((item, index) => (
                          <Box key={item.step} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                            <Typography variant="h6" sx={{ minWidth: 24, textAlign: 'center' }}>
                              {item.emoji}
                            </Typography>
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                {item.title}
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {item.theme || '未設定'}
                              </Typography>
                            </Box>
                          </Box>
                        ));
                      })()}
                    </Box>
                  </Box>
                )}

                {/* テーマ入力エリア（Step2-4） */}
                {currentStep >= 2 && currentStep <= 4 && (
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
                <Panel 
                  defaultSize={isMobile ? 50 : isTablet ? 55 : 60} 
                  minSize={isMobile ? 30 : isTablet ? 35 : 30} 
                  maxSize={isMobile ? 70 : isTablet ? 75 : 80}
                >
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
                <Panel 
                  defaultSize={isMobile ? 50 : isTablet ? 45 : 40} 
                  minSize={isMobile ? 30 : isTablet ? 25 : 20} 
                  maxSize={isMobile ? 70 : isTablet ? 65 : 70}
                >
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
            bottom: { xs: 80, sm: 100, md: 80 }, // タブレットでの調整
            right: { xs: 16, sm: 32, md: 24 }, // タブレットでの間隔調整
            zIndex: 1000,
            width: { xs: 56, sm: 64, md: 56 }, // タブレットでのタッチターゲット
            height: { xs: 56, sm: 64, md: 56 },
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