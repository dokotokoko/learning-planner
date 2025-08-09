import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  IconButton,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Collapse,
  Tooltip,
} from '@mui/material';
import {
  History as HistoryIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Clear as ClearIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface ChatSession {
  id: string;
  page: string;
  title: string;
  lastMessage: string;
  messageCount: number;
  lastUpdated: Date;
  memoTitle?: string; // 実際のメモタイトル
  projectName?: string; // プロジェクト名
  messages: {
    id: number;
    sender: string;
    message: string;
    created_at: string;
  }[];
}

interface ChatHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionSelect: (session: ChatSession) => void;
  currentPageId?: string;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({
  isOpen,
  onClose,
  onSessionSelect,
  currentPageId,
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [sessionToClear, setSessionToClear] = useState<string | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set());

  // チャット履歴を取得（conversation版）
  const fetchChatHistory = async () => {
    setLoading(true);
    try {
      // ユーザーIDを取得
      let userId: string | null = null;
      const authData = localStorage.getItem('auth-storage');
      const authToken = localStorage.getItem('auth-token');
      
      console.log('🔍 認証情報デバッグ:', {
        authData: authData,
        authToken: authToken,
      });
      
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          console.log('📋 auth-storage解析結果:', parsed);
          
          if (parsed.state?.user?.id) {
            userId = parsed.state.user.id;
          }
        } catch (e) {
          console.error('認証データの解析に失敗:', e);
        }
      }
      
      // 代替認証: auth-tokenも試す
      if (!userId && authToken) {
        userId = authToken;
        console.log('⚠️ auth-storageからuser_id取得失敗、auth-tokenを使用:', userId);
      }

      console.log('🆔 最終user_id:', userId);

      if (!userId) {
        console.error('ユーザーIDが見つかりません');
        return;
      }

      // 新しいconversation APIを試行
      try {
        console.log('📡 conversation API呼び出し...');
        const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
        const conversationResponse = await fetch(`${apiBaseUrl}/chat/conversations?limit=50`, {
          headers: {
            'Authorization': `Bearer ${userId}`,
          },
          credentials: 'include',
        });

        if (conversationResponse.ok) {
          const conversations = await conversationResponse.json();
          console.log(`conversation一覧取得成功:`, {
            total: conversations.length,
            conversations: conversations.map((c: any) => ({ id: c.id, title: c.title, page_id: c.page_id }))
          });
          
          // conversationをChatSession形式に変換
          const convertedSessions: ChatSession[] = conversations.map((conv: any) => ({
            id: conv.id,
            page: conv.page_id,
            title: conv.title, // AI生成タイトルまたは初期タイトル
            lastMessage: conv.last_message || '',
            messageCount: conv.message_count || 0,
            lastUpdated: new Date(conv.updated_at || conv.last_updated || new Date()),
            messages: [], // 初回は空、必要に応じて後で読み込み
          }));

          console.log(`conversation変換後:`, {
            sessionCount: convertedSessions.length,
            titles: convertedSessions.map(s => s.title).slice(0, 10),
          });

          setSessions(convertedSessions);
          return; // 成功したらここで終了
        } else {
          console.warn('conversation API利用不可、レガシーAPIにフォールバック');
        }
      } catch (convError) {
        console.warn('conversation API失敗、レガシーAPIにフォールバック:', convError);
      }

      // フォールバック: 従来のchat/history API
      console.log('📡 レガシーchat/history API呼び出し...');
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/chat/history?limit=200`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const history = await response.json();
        console.log(`レガシー履歴取得:`, {
          total: history.length,
          memoCount: history.filter((item: any) => item.page?.startsWith('memo-')).length,
          samplePages: [...new Set(history.slice(0, 10).map((item: any) => item.page))],
        });
        
        // ページごとにセッションをグループ化（従来の方法）
        const sessionMap = new Map<string, ChatSession>();
        
        history.forEach((item: any) => {
          const pageId = item.page || 'general';
          const sessionId = pageId;
          
          if (!sessionMap.has(sessionId)) {
            sessionMap.set(sessionId, {
              id: sessionId,
              page: pageId,
              title: getPageTitle(pageId),
              lastMessage: '',
              messageCount: 0,
              lastUpdated: new Date(item.created_at),
              messages: [],
            });
          }
          
          const session = sessionMap.get(sessionId)!;
          session.messages.push(item);
          session.messageCount++;
          session.lastUpdated = new Date(Math.max(
            session.lastUpdated.getTime(),
            new Date(item.created_at).getTime()
          ));
        });

        // メッセージを時系列順（古い→新しい）にソートして最後のメッセージを設定
        sessionMap.forEach((session) => {
          session.messages.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          if (session.messages.length > 0) {
            const lastMsg = session.messages[session.messages.length - 1];
            session.lastMessage = lastMsg.message.substring(0, 100) + 
              (lastMsg.message.length > 100 ? '...' : '');
          }
        });

        const sortedSessions = Array.from(sessionMap.values()).sort((a, b) => 
          b.lastUpdated.getTime() - a.lastUpdated.getTime()
        );

        console.log(`レガシーセッション作成後:`, {
          sessionCount: sortedSessions.length,
          memoSessions: sortedSessions.filter(s => s.page.startsWith('memo-')).length,
          pages: sortedSessions.map(s => s.page).slice(0, 10),
        });

        // メモタイトルを取得して追加
        await fetchMemoTitles(sortedSessions, userId);

        setSessions(sortedSessions);
      }
    } catch (error) {
      console.error('履歴取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // メモタイトルを取得する関数
  const fetchMemoTitles = async (sessions: ChatSession[], userId: string) => {
    // 統一した認証トークンの取得
    const token = userId; // userIdをそのまま使用
    
    for (const session of sessions) {
      if (session.page.startsWith('memo-')) {
        try {
          const memoId = session.page.replace('memo-', '');
          const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
          const memoResponse = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
          });
          
          if (memoResponse.ok) {
            const memoData = await memoResponse.json();
            session.memoTitle = memoData.title || '無題のメモ';
            session.title = memoData.title || '無題のメモ';
            
            // プロジェクト名も取得
            if (memoData.project_id) {
              try {
                const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
                const projectResponse = await fetch(`${apiBaseUrl}/projects/${memoData.project_id}`, {
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                  credentials: 'include',
                });
                if (projectResponse.ok) {
                  const projectData = await projectResponse.json();
                  session.projectName = projectData.theme;
                }
              } catch (e) {
                console.error('プロジェクト情報の取得に失敗:', e);
              }
            }
          } else if (memoResponse.status === 404) {
            // メモが見つからない場合のフォールバック
            const memoId = session.page.replace('memo-', '');
            session.memoTitle = `メモ ${memoId} (削除済み)`;
            session.title = `メモ ${memoId} (削除済み)`;
            session.projectName = '不明';
            console.warn(`メモ ID ${memoId} が見つかりません（削除済みまたは権限なし）`);
          } else {
            // その他のHTTPエラー
            const memoId = session.page.replace('memo-', '');
            session.memoTitle = `メモ ${memoId} (取得エラー)`;
            session.title = `メモ ${memoId} (取得エラー)`;
            console.error(`メモ ${memoId} の取得でエラー: ${memoResponse.status}`);
          }
        } catch (error) {
          console.error(`メモ${session.page}の情報取得に失敗:`, error);
          // エラーの場合はデフォルトタイトルを使用
          session.memoTitle = `メモ ${session.page.replace('memo-', '')}`;
          session.title = session.memoTitle;
        }
      }
    }
  };

  // ページIDからタイトルを生成
  const getPageTitle = (pageId: string): string => {
    if (pageId.startsWith('memo-')) {
      return `メモ ${pageId.replace('memo-', '')}`;
    }
    if (pageId.startsWith('step-')) {
      return `ステップ ${pageId.replace('step-', '')}`;
    }
    if (pageId === 'general') {
      return '一般的な質問';
    }
    return pageId;
  };

  // ページ別グループ化（メモ中心に改善）
  const groupedSessions = sessions.reduce((acc, session) => {
    let pageGroup: string;
    
    if (session.page.startsWith('memo-')) {
      // プロジェクト名があればそれを使用、なければ「個人メモ」
      pageGroup = session.projectName ? `📁 ${session.projectName}` : '📝 個人メモ';
    } else if (session.page.startsWith('step-')) {
      pageGroup = '🎯 学習ステップ';
    } else if (session.page === 'general' || session.page.includes('inquiry')) {
      pageGroup = '💬 一般相談';
    } else {
      pageGroup = '📂 その他';
    }
    
    if (!acc[pageGroup]) {
      acc[pageGroup] = [];
    }
    acc[pageGroup].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  // セッションクリア
  const handleClearSession = async (pageId: string) => {
    try {
      let userId = null;
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        const parsed = JSON.parse(authData);
        if (parsed.state?.user?.id) {
          userId = parsed.state.user.id;
        }
      }

      if (!userId) return;

      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/chat/history?page=${pageId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        await fetchChatHistory(); // 履歴を再取得
      }
    } catch (error) {
      console.error('履歴削除エラー:', error);
    }
    setClearDialogOpen(false);
    setSessionToClear(null);
  };

  // ページグループの展開/折りたたみ
  const togglePageExpanded = (pageGroup: string) => {
    const newExpanded = new Set(expandedPages);
    if (newExpanded.has(pageGroup)) {
      newExpanded.delete(pageGroup);
    } else {
      newExpanded.add(pageGroup);
    }
    setExpandedPages(newExpanded);
  };

  // conversation詳細メッセージを取得
  const loadConversationMessages = async (session: ChatSession): Promise<ChatSession | null> => {
    try {
      // ユーザーIDを取得
      let userId: string | null = null;
      const authData = localStorage.getItem('auth-storage');
      const authToken = localStorage.getItem('auth-token');
      
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
      
      if (!userId && authToken) {
        userId = authToken;
      }

      if (!userId) {
        console.error('ユーザーIDが見つかりません');
        return null;
      }

      console.log(`📡 conversation ${session.id} の詳細メッセージ取得...`);
      const apiBaseUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiBaseUrl}/chat/conversations/${session.id}/messages`, {
        headers: {
          'Authorization': `Bearer ${userId}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const messages = await response.json();
        console.log(`conversation ${session.id} のメッセージ取得成功: ${messages.length}件`);
        
        // 更新されたセッションを作成
        const updatedSession = { ...session, messages };
        
        // セッションのメッセージを更新
        const updatedSessions = sessions.map(s => 
          s.id === session.id ? updatedSession : s
        );
        setSessions(updatedSessions);
        
        // 更新されたセッションを返す
        return updatedSession;
      } else {
        console.warn(`conversation ${session.id} のメッセージ取得失敗: ${response.status}`);
        return null;
      }
    } catch (error) {
      console.error(`conversation ${session.id} のメッセージ取得エラー:`, error);
      return null;
    }
  };

  // 時間フォーマット
  const formatTime = (date: Date) => {
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return '今';
    if (diffHours < 24) return `${diffHours}時間前`;
    if (diffHours < 24 * 7) return `${Math.floor(diffHours / 24)}日前`;
    return date.toLocaleDateString('ja-JP');
  };

  useEffect(() => {
    if (isOpen) {
      fetchChatHistory();
    }
  }, [isOpen]);

  // セッション取得後にページグループを自動展開
  useEffect(() => {
    if (sessions.length > 0) {
      const groupNames = new Set<string>();
      sessions.forEach(session => {
        if (session.page.startsWith('memo-')) {
          const groupName = session.projectName ? `📁 ${session.projectName}` : '📝 個人メモ';
          groupNames.add(groupName);
        } else if (session.page.startsWith('step-')) {
          groupNames.add('🎯 学習ステップ');
        } else if (session.page === 'general' || session.page.includes('inquiry')) {
          groupNames.add('💬 一般相談');
        } else {
          groupNames.add('📂 その他');
        }
      });
      setExpandedPages(groupNames);
    }
  }, [sessions]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '320px',
        height: '100vh',
        zIndex: 1300,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
          borderRadius: 0,
        }}
      >
        {/* ヘッダー */}
        <Box sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <HistoryIcon sx={{ mr: 1, color: 'primary.main' }} />
            <Typography variant="h6" fontWeight="bold">
              対話履歴
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <ClearIcon />
          </IconButton>
        </Box>


        {/* 履歴リスト */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {loading ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">読み込み中...</Typography>
            </Box>
          ) : sessions.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                まだ対話履歴がありません
              </Typography>
            </Box>
          ) : (
            <List sx={{ py: 0 }}>
              {Object.entries(groupedSessions).map(([pageGroup, groupSessions]) => (
                <Box key={pageGroup}>
                  {/* ページグループヘッダー */}
                  <ListItemButton
                    onClick={() => togglePageExpanded(pageGroup)}
                    sx={{
                      backgroundColor: 'action.hover',
                      '&:hover': {
                        backgroundColor: 'action.selected',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="subtitle2" fontWeight="bold">
                          {pageGroup} ({groupSessions.length})
                        </Typography>
                      }
                    />
                    {expandedPages.has(pageGroup) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </ListItemButton>

                  {/* セッションリスト */}
                  <Collapse in={expandedPages.has(pageGroup)}>
                    {groupSessions.map((session) => (
                      <ListItem
                        key={session.id}
                        sx={{
                          pl: 3,
                          backgroundColor: selectedSession === session.id ? 'action.selected' : 'transparent',
                        }}
                      >
                        <ListItemButton
                          onClick={async () => {
                            setSelectedSession(session.id);
                            
                            console.log('🖱️ セッション選択:', {
                              sessionId: session.id,
                              messageCount: session.messages.length,
                              isUUID: session.id.match(/^[0-9a-f-]{36}$/i)
                            });
                            
                            // conversation詳細を取得（メッセージが空の場合）
                            if (session.messages.length === 0) {
                              console.log('📥 メッセージ詳細取得開始...');
                              const updatedSession = await loadConversationMessages(session);
                              if (updatedSession) {
                                console.log('✅ 更新されたセッションでonSessionSelect呼び出し:', {
                                  messageCount: updatedSession.messages.length
                                });
                                onSessionSelect(updatedSession);
                                return;
                              } else {
                                console.warn('⚠️ セッション更新失敗、元のセッションを使用');
                              }
                            }
                            
                            console.log('📤 元のセッションでonSessionSelect呼び出し');
                            onSessionSelect(session);
                          }}
                          sx={{ borderRadius: 1 }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {session.memoTitle || session.title}
                                  </Typography>
                                  {session.page.startsWith('memo-') && session.projectName && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      📁 {session.projectName}
                                    </Typography>
                                  )}
                                </Box>
                                <Chip
                                  label={session.messageCount}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem', height: '20px' }}
                                />
                              </Box>
                            }
                            secondary={
                              <Box>
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.2,
                                    mb: 0.5,
                                  }}
                                >
                                  {session.lastMessage}
                                </Typography>
                                <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                  <ScheduleIcon sx={{ fontSize: '0.8rem', mr: 0.5, color: 'text.disabled' }} />
                                  <Typography variant="caption" color="text.disabled">
                                    {formatTime(session.lastUpdated)}
                                  </Typography>
                                  {session.page.startsWith('memo-') && (
                                    <Typography variant="caption" color="text.disabled" sx={{ ml: 1 }}>
                                      • メモ {session.page.replace('memo-', '')}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            }
                          />
                        </ListItemButton>
                        <Tooltip title="この履歴を削除">
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSessionToClear(session.page);
                              setClearDialogOpen(true);
                            }}
                            sx={{ ml: 1 }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </ListItem>
                    ))}
                  </Collapse>
                  <Divider />
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Paper>

      {/* 履歴削除確認ダイアログ */}
      <Dialog
        open={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>履歴を削除</DialogTitle>
        <DialogContent>
          <Typography>
            この対話履歴を完全に削除しますか？この操作は元に戻せません。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={() => sessionToClear && handleClearSession(sessionToClear)}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </motion.div>
  );
};

export default ChatHistory; 