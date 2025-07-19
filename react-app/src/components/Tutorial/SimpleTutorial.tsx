import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Backdrop,
  Fade,
  useTheme,
} from '@mui/material';
import { Close as CloseIcon, NavigateNext, NavigateBefore } from '@mui/icons-material';

interface SimpleTutorialStep {
  target: string;
  title: string;
  content: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  arrow?: boolean;
}

interface SimpleTutorialProps {
  steps: SimpleTutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onStepChange?: (stepIndex: number) => void;
}

const SimpleTutorial: React.FC<SimpleTutorialProps> = ({
  steps,
  isOpen,
  onClose,
  onComplete,
  onStepChange,
}) => {
  const theme = useTheme();
  const [currentStep, setCurrentStep] = useState(0);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // 現在のステップ情報
  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  // ターゲット要素の位置を計算
  const calculatePosition = () => {
    if (!step?.target) return;

    const targetElement = document.querySelector(step.target);
    if (!targetElement) {
      console.warn(`Tutorial target not found: ${step.target}`);
      return;
    }

    const rect = targetElement.getBoundingClientRect();
    setTargetRect(rect);

    // スクロールしてターゲットを表示
    targetElement.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'center',
    });

    // ツールチップの位置を計算
    const placement = step.placement || 'bottom';
    let x = 0;
    let y = 0;

    switch (placement) {
      case 'top':
        x = rect.left + rect.width / 2;
        y = rect.top - 10;
        break;
      case 'bottom':
        x = rect.left + rect.width / 2;
        y = rect.bottom + 10;
        break;
      case 'left':
        x = rect.left - 10;
        y = rect.top + rect.height / 2;
        break;
      case 'right':
        x = rect.right + 10;
        y = rect.top + rect.height / 2;
        break;
      case 'center':
        x = window.innerWidth / 2;
        y = window.innerHeight / 2;
        break;
    }

    setTooltipPosition({ x, y });
  };

  // ステップ変更時に位置を再計算
  useEffect(() => {
    if (isOpen && step) {
      // 少し待ってからポジション計算（DOM更新を待つ）
      const timer = setTimeout(calculatePosition, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isOpen, step]);

  // ステップ変更時のコールバック
  useEffect(() => {
    if (isOpen && onStepChange) {
      onStepChange(currentStep);
    }
  }, [currentStep, isOpen, onStepChange]);

  // ウィンドウリサイズ時に位置を再計算
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) calculatePosition();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, currentStep]);

  // 次のステップ
  const handleNext = () => {
    if (isLastStep) {
      onComplete();
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  // 前のステップ
  const handlePrev = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // チュートリアル終了
  const handleClose = () => {
    setCurrentStep(0);
    onClose();
  };

  // キーボードナビゲーション
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          handleClose();
          break;
        case 'ArrowRight':
        case 'Enter':
          handleNext();
          break;
        case 'ArrowLeft':
          if (!isFirstStep) handlePrev();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, currentStep, isFirstStep, isLastStep]);

  if (!isOpen || !step) return null;

  // ツールチップのスタイル計算
  const getTooltipStyle = () => {
    const placement = step.placement || 'bottom';
    let transform = '';

    switch (placement) {
      case 'top':
        transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        transform = 'translate(-50%, 0%)';
        break;
      case 'left':
        transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        transform = 'translate(0%, -50%)';
        break;
      case 'center':
        transform = 'translate(-50%, -50%)';
        break;
    }

    return {
      position: 'fixed' as const,
      left: tooltipPosition.x,
      top: tooltipPosition.y,
      transform,
      zIndex: 2147483647,
      maxWidth: '400px',
      width: 'auto',
    };
  };

  return (
    <>
      {/* ハイライト（ターゲット要素を強調） */}
      {targetRect && step.placement !== 'center' && (
        <>
          {/* 上部のオーバーレイ */}
          <Box
            sx={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: targetRect.top - 4,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 2147483646,
            }}
            onClick={handleClose}
          />
          
          {/* 左側のオーバーレイ */}
          <Box
            sx={{
              position: 'fixed',
              top: targetRect.top - 4,
              left: 0,
              width: targetRect.left - 4,
              height: targetRect.height + 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 2147483646,
            }}
            onClick={handleClose}
          />
          
          {/* 右側のオーバーレイ */}
          <Box
            sx={{
              position: 'fixed',
              top: targetRect.top - 4,
              left: targetRect.left + targetRect.width + 4,
              right: 0,
              height: targetRect.height + 8,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 2147483646,
            }}
            onClick={handleClose}
          />
          
          {/* 下部のオーバーレイ */}
          <Box
            sx={{
              position: 'fixed',
              top: targetRect.top + targetRect.height + 4,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              zIndex: 2147483646,
            }}
            onClick={handleClose}
          />
          
          {/* 青い枠線 */}
          <Box
            sx={{
              position: 'fixed',
              left: targetRect.left - 4,
              top: targetRect.top - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8,
              border: `3px solid ${theme.palette.primary.main}`,
              borderRadius: '8px',
              zIndex: 2147483647,
              pointerEvents: 'none',
              boxShadow: '0 0 20px rgba(5, 155, 255, 0.5)',
              animation: 'pulse 2s infinite',
              '@keyframes pulse': {
                '0%': { transform: 'scale(1)', opacity: 1 },
                '50%': { transform: 'scale(1.05)', opacity: 0.8 },
                '100%': { transform: 'scale(1)', opacity: 1 },
              },
            }}
          />
        </>
      )}
      
      {/* センター配置の場合の通常のオーバーレイ */}
      {(!targetRect || step.placement === 'center') && (
        <Backdrop
          open={isOpen}
          sx={{
            zIndex: 2147483646,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
          }}
          onClick={handleClose}
        />
      )}

      {/* ツールチップ */}
      <Fade in={isOpen} timeout={300}>
        <Paper
          ref={tooltipRef}
          elevation={8}
          sx={{
            ...getTooltipStyle(),
            p: 3,
            backgroundColor: theme.palette.background.paper,
            border: `1px solid ${theme.palette.divider}`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
              {step.title}
            </Typography>
            <IconButton size="small" onClick={handleClose}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {/* コンテンツ */}
          <Typography variant="body1" sx={{ mb: 3, lineHeight: 1.6 }}>
            {step.content}
          </Typography>

          {/* プログレスインジケーター */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            {steps.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: index === currentStep 
                    ? theme.palette.primary.main 
                    : theme.palette.grey[300],
                  mx: 0.5,
                }}
              />
            ))}
          </Box>

          {/* ナビゲーションボタン */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Button
              onClick={handlePrev}
              disabled={isFirstStep}
              startIcon={<NavigateBefore />}
              variant="outlined"
              size="small"
            >
              戻る
            </Button>

            <Typography variant="body2" color="text.secondary">
              {currentStep + 1} / {steps.length}
            </Typography>

            <Button
              onClick={handleNext}
              endIcon={!isLastStep ? <NavigateNext /> : undefined}
              variant="contained"
              size="small"
            >
              {isLastStep ? '完了' : '次へ'}
            </Button>
          </Box>
        </Paper>
      </Fade>
    </>
  );
};

export default SimpleTutorial; 