import { useState, useEffect, useCallback } from 'react';

export interface NotificationData {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, []);

  const requestBrowserPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission();
      setBrowserPermission(result);
      return result;
    }
    return browserPermission;
  }, [browserPermission]);

  const showBrowserNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (browserPermission === 'granted' && document.hidden) {
      return new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        tag: 'learning-assistant',
        requireInteraction: true,
        ...options
      });
    }
    return null;
  }, [browserPermission]);

  const showNotification = useCallback((data: Omit<NotificationData, 'id'>) => {
    const id = Date.now().toString();
    const notification: NotificationData = {
      id,
      duration: data.persistent ? undefined : (data.duration || 6000),
      ...data
    };

    setNotifications(prev => [...prev, notification]);

    // ブラウザ通知も表示（ページが非アクティブの場合）
    if (document.hidden) {
      showBrowserNotification(notification.title, {
        body: notification.message,
        tag: notification.id
      });
    }

    // 自動削除（persistentでない場合）
    if (!notification.persistent && notification.duration) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, [showBrowserNotification]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    showNotification,
    removeNotification,
    clearAll,
    requestBrowserPermission,
    browserPermission
  };
}; 