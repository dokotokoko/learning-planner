import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TutorialStep {
  target: string;
  content: string;
  title?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  disableBeacon?: boolean;
  disableOverlayClose?: boolean;
  spotlightPadding?: number;
  styles?: {
    options?: any;
    tooltip?: any;
    beacon?: any;
  };
}

export interface TutorialConfig {
  id: string;
  name: string;
  steps: TutorialStep[];
  options?: {
    continuous?: boolean;
    showProgress?: boolean;
    showSkipButton?: boolean;
    spotlightClicks?: boolean;
    spotlightPadding?: number;
    disableOverlay?: boolean;
  };
}

interface TutorialState {
  // チュートリアルの実行状態
  isRunning: boolean;
  currentTutorialId: string | null;
  currentStepIndex: number;
  
  // ユーザーの進行状況
  completedTutorials: string[];
  hasSeenIntro: boolean;
  skipTutorials: boolean; // ユーザーがスキップを選択した場合
  
  // チュートリアルの管理
  availableTutorials: TutorialConfig[];
  
  // アクション
  startTutorial: (tutorialId: string) => void;
  startTutorialManually: (tutorialId: string) => void;
  stopTutorial: () => void;
  nextStep: () => void;
  previousStep: () => void;
  setCurrentStepIndex: (index: number) => void;
  completeTutorial: (tutorialId: string) => void;
  skipAllTutorials: () => void;
  resetTutorials: () => void;
  
  // チュートリアル設定管理
  registerTutorial: (config: TutorialConfig) => void;
  getTutorialSteps: (tutorialId: string) => TutorialStep[];
  shouldShowTutorial: (tutorialId: string) => boolean;
  
  // 初回ユーザー向け
  markIntroSeen: () => void;
  shouldShowIntro: () => boolean;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      // 初期状態
      isRunning: false,
      currentTutorialId: null,
      currentStepIndex: 0,
      completedTutorials: [],
      hasSeenIntro: false,
      skipTutorials: false,
      availableTutorials: [],

      // チュートリアル実行
      startTutorial: (tutorialId: string) => {
        const tutorials = get().availableTutorials;
        const tutorial = tutorials.find(t => t.id === tutorialId);
        
        if (tutorial && get().shouldShowTutorial(tutorialId)) {
          set({
            isRunning: true,
            currentTutorialId: tutorialId,
            currentStepIndex: 0,
          });
        }
      },

      stopTutorial: () => {
        set({
          isRunning: false,
          currentTutorialId: null,
          currentStepIndex: 0,
        });
      },

      // 手動でチュートリアルを開始（完了状態に関係なく実行）
      startTutorialManually: (tutorialId: string) => {
        const tutorials = get().availableTutorials;
        const tutorial = tutorials.find(t => t.id === tutorialId);
        
        if (tutorial) {
          set({
            isRunning: true,
            currentTutorialId: tutorialId,
            currentStepIndex: 0,
          });
        } else {
          console.warn(`Tutorial with id '${tutorialId}' not found`);
        }
      },

      nextStep: () => {
        const { currentTutorialId, currentStepIndex, availableTutorials } = get();
        if (!currentTutorialId) return;
        
        const tutorial = availableTutorials.find(t => t.id === currentTutorialId);
        if (tutorial && currentStepIndex < tutorial.steps.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        }
      },

      previousStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      completeTutorial: (tutorialId: string) => {
        const completedTutorials = get().completedTutorials;
        if (!completedTutorials.includes(tutorialId)) {
          set({
            completedTutorials: [...completedTutorials, tutorialId],
            isRunning: false,
            currentTutorialId: null,
            currentStepIndex: 0,
          });
        }
      },

      skipAllTutorials: () => {
        set({
          skipTutorials: true,
          isRunning: false,
          currentTutorialId: null,
          currentStepIndex: 0,
        });
      },

      resetTutorials: () => {
        set({
          completedTutorials: [],
          hasSeenIntro: false,
          skipTutorials: false,
          isRunning: false,
          currentTutorialId: null,
          currentStepIndex: 0,
        });
      },

      // チュートリアル設定管理
      registerTutorial: (config: TutorialConfig) => {
        const { availableTutorials } = get();
        const existingIndex = availableTutorials.findIndex(t => t.id === config.id);
        
        if (existingIndex >= 0) {
          // 既存のチュートリアルを更新
          const newTutorials = [...availableTutorials];
          newTutorials[existingIndex] = config;
          set({ availableTutorials: newTutorials });
        } else {
          // 新しいチュートリアルを追加
          set({ availableTutorials: [...availableTutorials, config] });
        }
      },

      getTutorialSteps: (tutorialId: string) => {
        const tutorial = get().availableTutorials.find(t => t.id === tutorialId);
        return tutorial ? tutorial.steps : [];
      },

      shouldShowTutorial: (tutorialId: string) => {
        const { completedTutorials, skipTutorials } = get();
        return !skipTutorials && !completedTutorials.includes(tutorialId);
      },

      // 初回ユーザー向け
      markIntroSeen: () => {
        set({ hasSeenIntro: true });
      },

      shouldShowIntro: () => {
        const { hasSeenIntro, skipTutorials } = get();
        return !hasSeenIntro && !skipTutorials;
      },

      setCurrentStepIndex: (index: number) => {
        set({ currentStepIndex: index });
      },
    }),
    {
      name: 'tutorial-storage',
      partialize: (state) => ({
        completedTutorials: state.completedTutorials,
        hasSeenIntro: state.hasSeenIntro,
        skipTutorials: state.skipTutorials,
      }),
    }
  )
);

// デフォルトのチュートリアル設定を定義
export const DEFAULT_TUTORIAL_STYLE = {
  options: {
    arrowColor: '#fff',
    backgroundColor: '#fff',
    overlayColor: 'rgba(0, 0, 0, 0.4)',
    primaryColor: '#73bbff',
    textColor: '#333',
    width: 400,
    zIndex: 10000,
  },
  tooltip: {
    fontSize: '16px',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
  },
  beacon: {
    size: 36,
  },
};

// 便利なヘルパー関数
export const createTutorialStep = (
  target: string,
  content: string,
  title?: string,
  options?: Partial<TutorialStep>
): TutorialStep => ({
  target,
  content,
  title,
  placement: 'bottom',
  disableBeacon: false,
  disableOverlayClose: false,
  spotlightPadding: 10,
  styles: DEFAULT_TUTORIAL_STYLE,
  ...options,
}); 