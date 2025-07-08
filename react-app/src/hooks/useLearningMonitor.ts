import { useState, useEffect, useRef, useCallback } from 'react';

export interface LearningSession {
  startTime: Date;
  lastActivity: Date;
  messageCount: number;
  userMessageCount: number;
  conversationState: 'active' | 'stagnant' | 'circular' | 'overwhelmed';
  recentMessages: string[];
  sessionDuration: number; // 分単位
  breaksTaken: number;
  lastBreakTime?: Date;
}

export interface LearningTriggers {
  longSession: boolean;          // 長時間学習（45分以上）
  veryLongSession: boolean;      // 非常に長時間学習（90分以上）
  inactivity: boolean;           // 非活動（10分以上）
  stagnantThinking: boolean;     // 思考停滞
  circularThinking: boolean;     // 循環思考
  overwhelmed: boolean;          // 情報過多
  manyMessages: boolean;         // 大量メッセージ（20回以上）
  needsBreak: boolean;           // 休憩が必要
  timeForReflection: boolean;    // 振り返りタイム
}

export const useLearningMonitor = () => {
  const [session, setSession] = useState<LearningSession>({
    startTime: new Date(),
    lastActivity: new Date(),
    messageCount: 0,
    userMessageCount: 0,
    conversationState: 'active',
    recentMessages: [],
    sessionDuration: 0,
    breaksTaken: 0
  });

  const [lastNotificationTime, setLastNotificationTime] = useState<Record<string, Date>>({});
  const sessionTimerRef = useRef<number>();

  // セッション時間を更新
  useEffect(() => {
    sessionTimerRef.current = setInterval(() => {
      setSession(prev => ({
        ...prev,
        sessionDuration: Math.floor((new Date().getTime() - prev.startTime.getTime()) / (1000 * 60))
      }));
    }, 60000); // 1分ごと

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, []);

  // 活動記録
  const recordActivity = useCallback((message: string, sender: 'user' | 'ai') => {
    const now = new Date();
    
    setSession(prev => {
      const newSession = {
        ...prev,
        lastActivity: now,
        messageCount: prev.messageCount + 1,
        userMessageCount: sender === 'user' ? prev.userMessageCount + 1 : prev.userMessageCount,
        recentMessages: [...prev.recentMessages.slice(-9), message].slice(0, 10) // 最新10件
      };

      // 会話状態の分析
      if (sender === 'user') {
        newSession.conversationState = analyzeConversationState(message, newSession.recentMessages);
      }

      return newSession;
    });
  }, []);

  // 会話状態の分析
  const analyzeConversationState = (message: string, recentMessages: string[]): LearningSession['conversationState'] => {
    const lowerMessage = message.toLowerCase();
    
    // 停滞キーワード
    const stagnantKeywords = ['わからない', 'どうしよう', '困った', '思いつかない', 'やっぱり'];
    const stagnantCount = stagnantKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    
    // 循環思考キーワード
    const circularKeywords = ['でも', 'しかし', 'やっぱり', '結局', 'それでも'];
    const circularCount = circularKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    
    // 情報過多キーワード
    const overwhelmedKeywords = ['複雑', '多すぎ', '整理できない', '混乱', 'ごちゃごちゃ'];
    const overwhelmedCount = overwhelmedKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
    
    // 似たようなメッセージの検出
    const similarityThreshold = 0.7;
    const similarCount = recentMessages.slice(-5).filter(recentMsg => {
      const similarity = calculateSimilarity(message, recentMsg);
      return similarity > similarityThreshold;
    }).length;

    if (overwhelmedCount > 0 || message.length > 200) {
      return 'overwhelmed';
    } else if (stagnantCount > 0 || similarCount >= 2) {
      return 'stagnant';
    } else if (circularCount > 0) {
      return 'circular';
    } else {
      return 'active';
    }
  };

  // 文字列類似度計算（簡易版）
  const calculateSimilarity = (str1: string, str2: string): number => {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);
    const commonWords = words1.filter(word => words2.includes(word));
    return commonWords.length / Math.max(words1.length, words2.length);
  };

  // 休憩記録
  const recordBreak = useCallback(() => {
    setSession(prev => ({
      ...prev,
      breaksTaken: prev.breaksTaken + 1,
      lastBreakTime: new Date()
    }));
  }, []);

  // セッションリセット
  const resetSession = useCallback(() => {
    setSession({
      startTime: new Date(),
      lastActivity: new Date(),
      messageCount: 0,
      userMessageCount: 0,
      conversationState: 'active',
      recentMessages: [],
      sessionDuration: 0,
      breaksTaken: 0
    });
    setLastNotificationTime({});
  }, []);

  // 通知トリガーの判定
  const checkTriggers = useCallback((): LearningTriggers => {
    const now = new Date();
    const sessionMinutes = session.sessionDuration;
    const inactivityMinutes = Math.floor((now.getTime() - session.lastActivity.getTime()) / (1000 * 60));
    const timeSinceLastBreak = session.lastBreakTime 
      ? Math.floor((now.getTime() - session.lastBreakTime.getTime()) / (1000 * 60))
      : sessionMinutes;

    return {
      longSession: sessionMinutes >= 45 && timeSinceLastBreak >= 45,
      veryLongSession: sessionMinutes >= 90,
      inactivity: inactivityMinutes >= 10,
      stagnantThinking: session.conversationState === 'stagnant',
      circularThinking: session.conversationState === 'circular',
      overwhelmed: session.conversationState === 'overwhelmed',
      manyMessages: session.userMessageCount >= 20,
      needsBreak: sessionMinutes >= 60 && timeSinceLastBreak >= 60,
      timeForReflection: session.userMessageCount >= 15 && session.userMessageCount % 15 === 0
    };
  }, [session]);

  // 通知クールダウンチェック
  const shouldShowNotification = useCallback((notificationType: string, cooldownMinutes: number = 15): boolean => {
    const lastTime = lastNotificationTime[notificationType];
    if (!lastTime) return true;
    
    const timeSinceLastNotification = Math.floor((new Date().getTime() - lastTime.getTime()) / (1000 * 60));
    return timeSinceLastNotification >= cooldownMinutes;
  }, [lastNotificationTime]);

  // 通知時間記録
  const recordNotification = useCallback((notificationType: string) => {
    setLastNotificationTime(prev => ({
      ...prev,
      [notificationType]: new Date()
    }));
  }, []);

  return {
    session,
    recordActivity,
    recordBreak,
    resetSession,
    checkTriggers,
    shouldShowNotification,
    recordNotification
  };
}; 