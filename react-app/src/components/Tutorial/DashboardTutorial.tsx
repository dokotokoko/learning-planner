import React, { useEffect } from 'react';
import { useTutorialStore, TutorialConfig, createTutorialStep } from '../../stores/tutorialStore';

// ダッシュボードチュートリアルの設定
export const DASHBOARD_TUTORIAL_ID = 'dashboard';

export const createDashboardTutorial = (): TutorialConfig => ({
  id: DASHBOARD_TUTORIAL_ID,
  name: 'ダッシュボード入門',
  options: {
    continuous: true,
    showProgress: true,
    showSkipButton: true,
    spotlightClicks: false,
    disableOverlay: false,
    spotlightPadding: 10,
  },
  steps: [
    createTutorialStep(
      'body',
      '🎉 探Qメイトへようこそ！\n\nAIを活用した探究学習支援ツールです。このチュートリアルで基本的な使い方をご案内します。',
      'ようこそ探Qメイトへ！',
      {
        placement: 'center',
        disableBeacon: true,
        spotlightPadding: 0,
        styles: {
          options: {
            zIndex: 10000,
          }
        }
      }
    ),
    createTutorialStep(
      '[data-tutorial="welcome-section"]',
      'こちらがメインダッシュボードです。ここから探究プロジェクトを管理できます。',
      'ダッシュボード概要',
      {
        placement: 'top',
        spotlightPadding: 20,
        styles: {
          options: {
            zIndex: 10000,
          },
          tooltip: {
            transform: 'translateX(-20%)', // 左寄りに調整（top-start風）
          }
        }
      }
    ),
    createTutorialStep(
      '[data-tutorial="create-project-button"]',
      '新しい探究プロジェクトを始めるには、このボタンをクリックしてください。\n\n🔍 テーマ設定から始まり、4つのステップで探究を進めていきます。',
      '新しいプロジェクトを作成',
      {
        placement: 'left',
        spotlightPadding: 20,
        styles: {
          options: {
            zIndex: 10000,
          },
          tooltip: {
            transform: 'translateX(-10px)', // 位置を微調整
          }
        }
      }
    ),
    createTutorialStep(
      '[data-tutorial="project-list"]',
      'こちらに作成したプロジェクトが表示されます。\n\n📝 プロジェクトをクリックして詳細を確認したり、メモを追加できます。',
       'プロジェクト一覧',
      {
        placement: 'center',
        spotlightPadding: 20,
        styles: {
          options: {
            zIndex: 10000,
          }
        }
      }
    ),
    createTutorialStep(
      '[data-tutorial="navigation-menu"]',
      '左側のメニューから様々な機能にアクセスできます。\n\n📚 メモ管理\n🎯 フレームワークゲーム\n🎮 クエストボード\n\nなど、学習をサポートする機能が揃っています。',
      'ナビゲーションメニュー',
      {
        placement: 'left',
        spotlightPadding: 15,
        styles: {
          options: {
            zIndex: 10000,
          }
        }
      }
    ),
    createTutorialStep(
      '[data-tutorial="ai-chat-section"]',
      'AIアシスタントがあなたの探究学習をサポートします。\n\n💬 疑問があればいつでも相談\n📝 メモと連携した対話\n🎯 学習の方向性をアドバイス',
      'AIアシスタント',
      {
        placement: 'right',
        spotlightPadding: 15,
        styles: {
          options: {
            zIndex: 10000,
          }
        }
      }
    ),
    createTutorialStep(
      'body',
      '🚀 準備完了です！\n\n早速新しいプロジェクトを作成して、探究学習を始めてみましょう。\n\nわからないことがあれば、いつでもAIアシスタントに相談してくださいね！',
      'チュートリアル完了',
      {
        placement: 'center',
        disableBeacon: true,
        spotlightPadding: 0,
        styles: {
          options: {
            zIndex: 10000,
          }
        }
      }
    ),
  ],
});

// SimpleTutorial用のステップ定義（代替案）
export const simpleSteps = [
  {
    target: '[data-tutorial="welcome-section"]',
    title: 'ようこそ！',
    content: 'これは学習アシスタントのダッシュボードです。ここからすべての学習活動を管理できます。',
    placement: 'center' as const,
  },
  {
    target: '[data-tutorial="welcome-section"]',
    title: 'ダッシュボード概要',
    content: 'ダッシュボードでは、プロジェクトの作成、管理、AIアシスタントとのチャットができます。',
    placement: 'bottom' as const,
  },
  {
    target: '[data-tutorial="create-project-button"]',
    title: '新しいプロジェクト',
    content: 'このボタンをクリックして新しい学習プロジェクトを作成しましょう。',
    placement: 'left' as const,
  },
  {
    target: '[data-tutorial="project-list"]',
    title: 'プロジェクト一覧',
    content: 'ここにあなたの学習プロジェクトが表示されます。クリックして詳細を確認できます。',
    placement: 'top' as const,
  },
  {
    target: '[data-tutorial="navigation-menu"]',
    title: 'ナビゲーション',
    content: 'サイドバーから他のページにアクセスできます。メモ、フレームワークゲームなどが利用可能です。',
    placement: 'right' as const,
  },
  {
    target: '[data-tutorial="ai-chat-section"]',
    title: 'AIアシスタント',
    content: 'AIアシスタントと対話して学習をサポートしてもらいましょう。',
    placement: 'left' as const,
  },
  {
    target: '[data-tutorial="welcome-section"]',
    title: 'チュートリアル完了！',
    content: '基本的な使い方を覚えました。学習を始めましょう！',
    placement: 'center' as const,
  },
];

// DOM要素の存在を確認する関数
const waitForElement = (selector: string, timeout = 5000): Promise<Element | null> => {
  return new Promise((resolve) => {
    const element = document.querySelector(selector);
    if (element) {
      resolve(element);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);
      if (element) {
        observer.disconnect();
        resolve(element);
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // タイムアウト処理
    setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);
  });
};

// 複数の要素の存在を確認する関数
const waitForElements = async (selectors: string[], timeout = 5000): Promise<boolean> => {
  const promises = selectors.map(selector => waitForElement(selector, timeout));
  const results = await Promise.all(promises);
  
  // すべての要素が見つかったかチェック
  const foundElements = results.filter(element => element !== null);
  console.log(`Found ${foundElements.length}/${selectors.length} tutorial elements`);
  
  return foundElements.length >= Math.floor(selectors.length * 0.7); // 70%以上の要素が見つかればOK
};

interface DashboardTutorialProps {
  autoStart?: boolean;
}

const DashboardTutorial: React.FC<DashboardTutorialProps> = ({ autoStart = false }) => {
  const { registerTutorial, startTutorial, shouldShowTutorial, shouldShowIntro } = useTutorialStore();

  useEffect(() => {
    // チュートリアル設定を登録
    const tutorialConfig = createDashboardTutorial();
    registerTutorial(tutorialConfig);

    // 自動開始の条件チェック
    if (autoStart && shouldShowIntro() && shouldShowTutorial(DASHBOARD_TUTORIAL_ID)) {
      // 必要なDOM要素のセレクター
      const requiredSelectors = [
        '[data-tutorial="welcome-section"]',
        '[data-tutorial="create-project-button"]',
        '[data-tutorial="project-list"]',
        '[data-tutorial="navigation-menu"]',
        '[data-tutorial="ai-chat-section"]'
      ];

      // DOM要素が存在するまで待ってからチュートリアル開始
      const startTutorialWhenReady = async () => {
        console.log('Waiting for tutorial elements to be ready...');
        
        // 最初に少し待つ（アニメーションやレンダリングの完了を待つ）
        await new Promise(resolve => setTimeout(resolve, 2500));
        
        const elementsReady = await waitForElements(requiredSelectors, 5000);
        
        if (elementsReady) {
          console.log('Tutorial elements ready, starting tutorial');
          // さらに少し待ってからチュートリアル開始（描画完了を確実にする）
          setTimeout(() => {
            startTutorial(DASHBOARD_TUTORIAL_ID);
          }, 500);
        } else {
          console.warn('Some tutorial elements not found, starting anyway');
          // 一部の要素が見つからなくても開始（フォールバック）
          setTimeout(() => {
            startTutorial(DASHBOARD_TUTORIAL_ID);
          }, 500);
        }
      };

      startTutorialWhenReady();
    }
  }, [autoStart, registerTutorial, startTutorial, shouldShowTutorial, shouldShowIntro]);

  return null; // このコンポーネントは何もレンダリングしない
};

export default DashboardTutorial; 