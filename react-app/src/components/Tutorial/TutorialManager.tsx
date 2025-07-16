import React, { useEffect, useCallback, useRef } from 'react';
import * as ReactJoyride from 'react-joyride';
const { default: Joyride, STATUS, EVENTS, ACTIONS } = ReactJoyride;
type Step = ReactJoyride.Step;
type CallBackProps = ReactJoyride.CallBackProps;
import { useTutorialStore, DEFAULT_TUTORIAL_STYLE } from '../../stores/tutorialStore';
import { Box, useTheme } from '@mui/material';

interface TutorialManagerProps {
  children?: React.ReactNode;
}

const TutorialManager: React.FC<TutorialManagerProps> = ({ children }) => {
  const theme = useTheme();
  const joyrideRef = useRef<any>(null);
  const {
    isRunning,
    currentTutorialId,
    currentStepIndex,
    availableTutorials,
    stopTutorial,
    completeTutorial,
    nextStep,
    previousStep,
    setCurrentStepIndex,
    getTutorialSteps,
  } = useTutorialStore();

  // 強制的に位置を修正する関数
  const forcePositionFix = useCallback(() => {
    const tooltip = document.querySelector('[data-test-id="tooltip"]') as HTMLElement;
    const overlay = document.querySelector('[data-test-id="overlay"]') as HTMLElement;
    
    if (tooltip) {
      // z-indexを最高レベルに設定
      tooltip.style.zIndex = '2147483647';
      tooltip.style.position = 'fixed';
      
      // transformの問題を回避
      const parentWithTransform = tooltip.closest('[style*="transform"]') as HTMLElement;
      if (parentWithTransform && parentWithTransform !== tooltip) {
        tooltip.style.transform = 'none';
        tooltip.style.position = 'fixed';
      }
    }
    
    if (overlay) {
      overlay.style.zIndex = '2147483646';
    }
  }, []);

  // MUIコンポーネントとの競合を回避する関数
  const fixMUIConflicts = useCallback(() => {
    // MUIのAppBar、Drawer等のz-indexを一時的に下げる
    const muiComponents = document.querySelectorAll('.MuiAppBar-root, .MuiDrawer-root, .MuiDialog-root');
    muiComponents.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.zIndex = '1000';
    });
  }, []);

  // チュートリアル終了時にMUIのz-indexを復元
  const restoreMUIZIndex = useCallback(() => {
    const muiComponents = document.querySelectorAll('.MuiAppBar-root, .MuiDrawer-root, .MuiDialog-root');
    muiComponents.forEach((element: Element) => {
      const htmlElement = element as HTMLElement;
      htmlElement.style.zIndex = '';
    });
  }, []);

  // 現在のチュートリアル設定を取得
  const currentTutorial = availableTutorials.find(t => t.id === currentTutorialId);
  const steps: Step[] = currentTutorial ? currentTutorial.steps.map(step => ({
    target: step.target,
    content: (
      <Box>
        {step.title && (
          <Box component="h3" sx={{ 
            mt: 0, 
            mb: 2, 
            fontSize: '1.2rem',
            fontWeight: 600,
            color: 'primary.main'
          }}>
            {step.title}
          </Box>
        )}
        <Box sx={{ fontSize: '1rem', lineHeight: 1.6 }}>
          {step.content}
        </Box>
      </Box>
    ),
    placement: step.placement || 'bottom',
    disableBeacon: step.disableBeacon || false,
    spotlightPadding: step.spotlightPadding || 20,
    styles: {
      ...DEFAULT_TUTORIAL_STYLE,
      ...step.styles,
      options: {
        ...DEFAULT_TUTORIAL_STYLE.options,
        backgroundColor: theme.palette.background.paper,
        primaryColor: theme.palette.primary.main,
        textColor: theme.palette.text.primary,
        overlayColor: theme.palette.mode === 'dark' 
          ? 'rgba(0, 0, 0, 0.7)' 
          : 'rgba(0, 0, 0, 0.4)',
        ...step.styles?.options,
      },
    },
  })) : [];

  // Joyrideのコールバック処理
  const handleJoyrideCallback = useCallback((data: CallBackProps) => {
    const { status, type, action, index, step } = data;
    
    // デバッグ情報を詳細に出力
    console.log('Joyride callback:', { status, type, action, index });
    
    // ステップ開始時にDOM要素の存在とplacementを確認
    if (type === 'step:before' && step) {
      const targetElement = document.querySelector(step.target as string);
      console.log('Tutorial step debug:', {
        target: step.target,
        placement: step.placement,
        elementFound: !!targetElement,
        elementRect: targetElement?.getBoundingClientRect(),
        step: step
      });
      
      // MUIとの競合を修正
      fixMUIConflicts();
      
      // DOM要素が見つかった場合、少し待ってから位置を強制更新
      if (targetElement) {
        setTimeout(() => {
          // 要素にスクロールしてからReact Joyrideの位置を再計算
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          });
          
          // 位置修正を強制実行
          setTimeout(() => {
            forcePositionFix();
          }, 200);
        }, 50);
      }
    }

    // ステップ表示後に位置を再度修正
    if (type === 'step:after') {
      setTimeout(() => {
        forcePositionFix();
      }, 100);
    }

    // チュートリアル完了時の処理
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      restoreMUIZIndex(); // MUIのz-indexを復元
      if (currentTutorialId) {
        completeTutorial(currentTutorialId);
      }
      stopTutorial();
    }

    // エラーまたは停止時の処理
    if (status === STATUS.ERROR) {
      console.error('Joyride error:', data);
      restoreMUIZIndex(); // MUIのz-indexを復元
      stopTutorial();
    }

    // ユーザーがチュートリアルを閉じた場合
    if (action === ACTIONS.CLOSE) {
      restoreMUIZIndex(); // MUIのz-indexを復元
      stopTutorial();
    }

    // ステップスキップ時の処理
    if (action === ACTIONS.SKIP) {
      restoreMUIZIndex(); // MUIのz-indexを復元
      if (currentTutorialId) {
        completeTutorial(currentTutorialId);
      }
      stopTutorial();
    }

    // Joyrideの内部ステップとストアを同期
    if (action === ACTIONS.NEXT || action === ACTIONS.PREV || type === EVENTS.STEP_AFTER) {
      // index は Joyride の現在のステップインデックス
      if (typeof index === 'number') {
        setCurrentStepIndex(index);
      }
    }
  }, [currentTutorialId, completeTutorial, stopTutorial, nextStep, previousStep, setCurrentStepIndex, fixMUIConflicts, restoreMUIZIndex, forcePositionFix]);

  // チュートリアル開始時の初期化
  useEffect(() => {
    if (isRunning && currentTutorialId) {
      fixMUIConflicts();
    }
    
    return () => {
      // クリーンアップ時にMUIのz-indexを復元
      restoreMUIZIndex();
    };
  }, [isRunning, currentTutorialId, fixMUIConflicts, restoreMUIZIndex]);

  // チュートリアルのオプション設定
  const tutorialOptions = {
    continuous: true,
    showProgress: true,
    showSkipButton: true,
    spotlightClicks: false,
    disableOverlay: false,
    spotlightPadding: 20,
    ...currentTutorial?.options,
  };

  return (
    <>
      {children}
      {isRunning && currentTutorialId && steps.length > 0 && (
        <Joyride
          ref={joyrideRef}
          steps={steps}
          run={isRunning}
          callback={handleJoyrideCallback}
          continuous={tutorialOptions.continuous}
          showProgress={tutorialOptions.showProgress}
          showSkipButton={tutorialOptions.showSkipButton}
          spotlightClicks={tutorialOptions.spotlightClicks}
          disableOverlay={tutorialOptions.disableOverlay}
          scrollToFirstStep={true}
          disableScrolling={false}
          disableScrollParentFix={true}
          hideCloseButton={false}
          floaterProps={{
            disableAnimation: true,
            hideArrow: false,
            options: {
              preventOverflow: {
                boundariesElement: 'viewport'
              }
            }
          }}
          getHelpers={(helpers) => {
            // 位置計算を強制的にリセット
            if (helpers) {
              setTimeout(() => {
                helpers.reset(true);
                setTimeout(() => forcePositionFix(), 100);
              }, 100);
            }
          }}
          debug={(import.meta as any).env.MODE === 'development'}
          locale={{
            back: '戻る',
            close: '閉じる',
            last: '完了',
            next: '次へ',
            skip: 'スキップ',
          }}
          styles={{
            options: {
              primaryColor: theme.palette.primary.main,
              backgroundColor: theme.palette.background.paper,
              textColor: theme.palette.text.primary,
              overlayColor: theme.palette.mode === 'dark' 
                ? 'rgba(0, 0, 0, 0.7)' 
                : 'rgba(0, 0, 0, 0.4)',
              arrowColor: theme.palette.background.paper,
              width: 400,
              zIndex: 2147483647, // 最高のz-index
            },
            tooltip: {
              fontSize: '16px',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: theme.shadows[8],
              fontFamily: theme.typography.fontFamily,
              zIndex: 2147483647,
              position: 'fixed' as const,
            },
            tooltipContainer: {
              textAlign: 'left',
            },
            tooltipTitle: {
              color: theme.palette.primary.main,
              fontSize: '1.2rem',
              fontWeight: 600,
              marginBottom: '12px',
            },
            tooltipContent: {
              color: theme.palette.text.primary,
              lineHeight: 1.6,
            },
            buttonNext: {
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              outline: 'none',
            },
            buttonBack: {
              color: theme.palette.text.secondary,
              backgroundColor: 'transparent',
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              outline: 'none',
              marginRight: '8px',
            },
            buttonSkip: {
              color: theme.palette.text.secondary,
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none',
              textDecoration: 'underline',
            },
            beacon: {
              animation: 'pulse 2s infinite',
              backgroundColor: theme.palette.primary.main,
              border: `2px solid ${theme.palette.primary.light}`,
              borderRadius: '50%',
              boxShadow: `0 0 0 6px ${theme.palette.primary.main}25`,
              cursor: 'pointer',
              height: 36,
              width: 36,
              position: 'absolute',
              zIndex: 2147483646,
            },
            beaconInner: {
              animation: 'pulse 2s infinite',
              backgroundColor: theme.palette.primary.main,
              borderRadius: '50%',
              display: 'block',
              height: '50%',
              left: '50%',
              position: 'absolute',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '50%',
            },
            spotlight: {
              borderRadius: '8px',
            },
            overlay: {
              mixBlendMode: 'hard-light',
              zIndex: 2147483646,
            },
          }}
        />
      )}
    </>
  );
};

export default TutorialManager; 