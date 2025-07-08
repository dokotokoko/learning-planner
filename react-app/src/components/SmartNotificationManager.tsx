import React, { useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import { useLearningMonitor, LearningTriggers } from '../hooks/useLearningMonitor';
import LearningNotifications from './LearningNotifications';

interface SmartNotificationManagerProps {
  onMessageSent?: (message: string, sender: 'user' | 'ai') => void;
  pageId?: string;
}

export interface SmartNotificationManagerRef {
  recordActivity: (message: string, sender: 'user' | 'ai') => void;
  recordBreak: () => void;
  getSession: () => any;
}

const SmartNotificationManager = forwardRef<SmartNotificationManagerRef, SmartNotificationManagerProps>(({
  onMessageSent,
  pageId = 'general'
}, ref) => {
  const { notifications, showNotification, removeNotification } = useNotifications();
  const { 
    session, 
    recordActivity, 
    recordBreak, 
    checkTriggers, 
    shouldShowNotification, 
    recordNotification 
  } = useLearningMonitor();

  // メッセージ送信時の処理
  useEffect(() => {
    if (onMessageSent) {
      onMessageSent = (message: string, sender: 'user' | 'ai') => {
        recordActivity(message, sender);
      };
    }
  }, [onMessageSent, recordActivity]);

  // 定期的な通知チェック
  useEffect(() => {
    const checkInterval = setInterval(() => {
      const triggers = checkTriggers();
      handleNotificationTriggers(triggers);
    }, 2 * 60 * 1000); // 2分間隔でチェック

    return () => clearInterval(checkInterval);
  }, [checkTriggers]);

  // 通知トリガーの処理
  const handleNotificationTriggers = useCallback((triggers: LearningTriggers) => {
    // 1. 時間経過による通知
    if (triggers.longSession && shouldShowNotification('longSession', 30)) {
      showNotification({
        type: 'warning',
        title: '🌟 小休憩のススメ',
        message: '45分間集中されていますね！5分間の休憩で効率アップしませんか？',
        persistent: true,
        action: {
          label: '5分休憩',
          onClick: () => {}
        },
        secondaryAction: {
          label: '続ける',
          onClick: () => {}
        }
      });
      recordNotification('longSession');
    }

    if (triggers.veryLongSession && shouldShowNotification('veryLongSession', 45)) {
      showNotification({
        type: 'error',
        title: '⚠️ 長時間学習注意',
        message: '90分以上学習されています。健康のため、少し長めの休憩を取りましょう！',
        persistent: true,
        action: {
          label: '15分休憩',
          onClick: () => {}
        }
      });
      recordNotification('veryLongSession');
    }

    // 2. 思考停滞の検出
    if (triggers.stagnantThinking && shouldShowNotification('stagnantThinking', 20)) {
      showNotification({
        type: 'info',
        title: '🔄 思考の整理提案',
        message: '同じような内容が続いています。フレームワークで思考を整理してみませんか？',
        persistent: true,
        action: {
          label: 'マインドマップ',
          onClick: () => {}
        },
        secondaryAction: {
          label: '5-Whys',
          onClick: () => {}
        }
      });
      recordNotification('stagnantThinking');
    }

    if (triggers.circularThinking && shouldShowNotification('circularThinking', 15)) {
      showNotification({
        type: 'warning',
        title: '🌀 循環思考を検出',
        message: '同じところを堂々巡りしているようです。視点を変えてみませんか？',
        persistent: true,
        action: {
          label: 'ロジックツリー',
          onClick: () => {}
        },
        secondaryAction: {
          label: 'マインドマップ',
          onClick: () => {}
        }
      });
      recordNotification('circularThinking');
    }

    if (triggers.overwhelmed && shouldShowNotification('overwhelmed', 10)) {
      showNotification({
        type: 'warning',
        title: '🧩 情報整理のススメ',
        message: '情報が複雑になっているようです。一度整理してみませんか？',
        persistent: true,
        action: {
          label: 'マインドマップ',
          onClick: () => {}
        },
        secondaryAction: {
          label: 'ロジックツリー',
          onClick: () => {}
        }
      });
      recordNotification('overwhelmed');
    }

    // 3. クエスト提案
    if (triggers.timeForReflection && shouldShowNotification('reflection', 25)) {
      showNotification({
        type: 'success',
        title: '📝 振り返りタイム',
        message: 'これまでの学習を振り返って、新しい気づきを見つけてみましょう！',
        persistent: true,
        action: {
          label: '振り返りを書く',
          onClick: () => {}
        },
        secondaryAction: {
          label: '後で',
          onClick: () => {}
        }
      });
      recordNotification('reflection');
    }

    if (triggers.manyMessages && shouldShowNotification('manyMessages', 30)) {
      // 実際のクエストを提案
      const questSuggestions = [
        '初めての観察日記',
        'アートで表現してみよう',
        'インタビューマスター',
        '1分間スピーチ・チャレンジ'
      ];
      const randomQuest = questSuggestions[Math.floor(Math.random() * questSuggestions.length)];
      
      showNotification({
        type: 'info',
        title: '🎯 新しいクエストに挑戦！',
        message: `「${randomQuest}」など、面白いクエストに挑戦して探究を深めてみませんか？`,
        persistent: true,
        action: {
          label: 'クエストボードを見る',
          onClick: () => {}
        },
        secondaryAction: {
          label: '続ける',
          onClick: () => {}
        }
      });
      recordNotification('manyMessages');
    }

    // ページ固有の通知
    if (pageId.startsWith('step-') && session.sessionDuration >= 30 && shouldShowNotification(`step-${pageId}`, 40)) {
      const stepNumber = pageId.replace('step-', '');
      showNotification({
        type: 'info',
        title: '📈 ステップ進捗確認',
        message: `Step ${stepNumber}で30分経過しました。一度振り返って進捗を確認してみませんか？`,
        action: {
          label: '進捗を確認',
          onClick: () => {}
        },
        secondaryAction: {
          label: '続ける',
          onClick: () => {}
        }
      });
      recordNotification(`step-${pageId}`);
    }
  }, [showNotification, shouldShowNotification, recordNotification, session, pageId]);

  // 外部からの活動記録用の関数を提供
  const recordUserActivity = useCallback((message: string, sender: 'user' | 'ai') => {
    recordActivity(message, sender);
  }, [recordActivity]);

  // 休憩記録
  const handleBreakTaken = useCallback(() => {
    recordBreak();
  }, [recordBreak]);

  // useImperativeHandleでAPIを公開
  useImperativeHandle(ref, () => ({
    recordActivity: recordUserActivity,
    recordBreak: handleBreakTaken,
    getSession: () => session
  }), [recordUserActivity, handleBreakTaken, session]);

  return (
    <LearningNotifications
      notifications={notifications}
      onDismiss={removeNotification}
      onBreakTaken={handleBreakTaken}
    />
  );
});

SmartNotificationManager.displayName = 'SmartNotificationManager';

export default SmartNotificationManager; 