import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Container,
  TextField,
  IconButton,
  Typography,
  Breadcrumbs,
  Link,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  SmartToy as AIIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { debounce } from 'lodash';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import AIChat from '../components/MemoChat/AIChat';

interface Memo {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
}

const MemoPage: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { projectId, memoId } = useParams<{ projectId: string; memoId: string }>();
  const { user } = useAuthStore();

  const [memo, setMemo] = useState<Memo | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isChatExpanded, setIsChatExpanded] = useState(true);

  // MemoChat風の状態管理
  const [memoContent, setMemoContent] = useState('');
  const memoRef = useRef<HTMLDivElement>(null);
  const memoPlaceholder = `メモのタイトル

ここにメモの内容を自由に書いてください。

# 見出し
- リスト項目
- リスト項目

**太字**や*斜体*も使用できます。

思考の整理、アイデアのメモ、学習の記録など、
自由にお使いください。

1行目がメモのタイトルとして扱われます。`;

  // メモの取得
  const fetchMemo = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`http://localhost:8000/v2/memos/${memoId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setMemo(data);
      setTitle(data.title);
      setContent(data.content);
    } catch (error) {
      console.error('Error fetching memo:', error);
    }
  };

  // プロジェクトの取得
  const fetchProject = async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`http://localhost:8000/v2/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('プロジェクトの取得に失敗しました');
      
      const data = await response.json();
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId && memoId) {
      fetchMemo();
      fetchProject();
    }
  }, [projectId, memoId]);

  // メモの初期化時のみmemoContentを設定
  useEffect(() => {
    if (memo && !memoContent) {
      const combinedContent = title ? `${title}\n\n${content}` : content;
      setMemoContent(combinedContent);
    }
  }, [memo, title, content, memoContent]);

  // 自動保存機能
  const saveChanges = async (newTitle: string, newContent: string) => {
    try {
      const token = localStorage.getItem('auth-token');
      const response = await fetch(`http://localhost:8000/v2/memos/${memoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          content: newContent,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error('Error saving memo:', error);
    }
  };

  // デバウンスされた自動保存（保存のみ、状態更新なし）
  const debouncedSave = useCallback(
    debounce((newTitle: string, fullContent: string) => {
      // fullContentからタイトルと本文を分離
      const lines = fullContent.split('\n');
      const extractedTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
      const extractedContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                              (lines.length === 1 && !lines[0].trim() ? '' : fullContent);
      
      // 保存のみ実行（状態更新は手動保存時のみ）
      saveChanges(extractedTitle, extractedContent);
    }, 1000),
    [memoId]
  );

  // タイトル変更時の処理
  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    debouncedSave(newTitle, content);
  };

  // 内容変更時の処理
  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    debouncedSave(title, newContent);
  };

  // 動的タイトル取得（memoContentの1行目をそのまま使用）
  const getCurrentTitle = () => {
    if (!memoContent) return title || '';
    const lines = memoContent.split('\n');
    return lines.length > 0 ? lines[0] : '';
  };



  // メモ変更時の処理（MemoChat風 - シンプル版）
  const handleMemoChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setMemoContent(newContent);
    
    // デバウンス保存（タイトルと本文の分離は保存時に行う）
    debouncedSave('', newContent);
  };

  // キーボードショートカット処理
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    // Ctrl+S で手動保存
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      handleMemoSave();
    }
  };

  // メモクリア
  const handleMemoClear = async () => {
    setMemoContent('');
    setTitle('');
    setContent('');
    await saveChanges('', '');
  };

  // メモ保存
  const handleMemoSave = async () => {
    console.log('Memo saved:', memoContent);
    
    // memoContentからタイトルと本文を分離して保存
    const lines = memoContent.split('\n');
    const newTitle = lines.length > 0 && lines[0].trim() ? lines[0] : '';
    const newContent = lines.length > 1 ? lines.slice(1).join('\n').replace(/^\n+/, '') : 
                      (lines.length === 1 && !lines[0].trim() ? '' : memoContent);
    
    // 状態を更新
    setTitle(newTitle);
    setContent(newContent);
    
    // 保存実行
    await saveChanges(newTitle, newContent);
  };

  // AI応答の処理
  const handleAIMessage = async (message: string, memoContent: string): Promise<string> => {
    try {
      // ユーザーIDを取得
      let userId = null;
      
      // auth-storageからユーザーIDを取得
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

      if (!userId) {
        throw new Error('ユーザーIDが見つかりません。再ログインしてください。');
      }

      // バックエンドAPIに接続
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          message: message,
          page: `memo-${memoId}`,
          context: `現在のページ: メモ編集
プロジェクト: ${project?.theme || 'unknown'}
メモ内容: ${memoContent}

ユーザーはこのメモについてAIに相談しています。メモの内容を参考にしながら、探究学習に関するアドバイスや質問への回答を提供してください。`
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API Error ${response.status}:`, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI API エラー:', error);
      
      // エラー時の代替応答
      return new Promise((resolve) => {
        setTimeout(() => {
          const responses = [
            `「${message}」についてお答えします。

${getCurrentTitle() ? `メモ「${getCurrentTitle()}」の内容` : 'このメモの内容'}を参考にさせていただきました。

探究学習のメモ作成では以下のようなアプローチが効果的です：

1. **構造化**: 見出しや箇条書きで情報を整理する
2. **関連付け**: 既存の知識や他の情報と関連付ける
3. **疑問点の記録**: わからないことや調べたいことを明記する
4. **振り返り**: 定期的にメモを見返して気づきを追加する

${project?.theme ? `プロジェクト「${project.theme}」` : 'あなたの探究'}に関して、他にもご質問があればお気軽にお聞かせください！`,
            
            `良いご質問ですね！${getCurrentTitle() ? `「${getCurrentTitle()}」というメモ` : 'このメモ'}について一緒に考えてみましょう。

メモを効果的に活用するためのポイント：

**📝 記録の充実**
思いついたアイデアや疑問は忘れないうちにメモに記録

**🔍 深掘りの実践**  
表面的な情報だけでなく、「なぜ？」「どのように？」を追求

**🔗 関連性の発見**
他の知識や経験との関連性を見つけて記録

継続的な記録と振り返りが探究学習の深化につながります。`,
            
            `とても重要なポイントについてのご質問ですね。${getCurrentTitle() ? `「${getCurrentTitle()}」のメモ内容` : 'このメモの内容'}から、あなたの探究への取り組みが伝わってきます。

メモ活用のコツ：

**💡 アイデアの発展**
書かれている内容をさらに発展させるために、新しい視点や角度を考える

**📚 情報の補完**
現在の内容に関連する追加情報や具体例を調べて補強

**🎯 目標との整合**
${project?.theme ? `プロジェクト「${project.theme}」の目標` : '探究目標'}との関連性を確認

ご不明な点があれば、さらに詳しくお聞かせください。`,
          ];
          
          const randomResponse = responses[Math.floor(Math.random() * responses.length)];
          resolve(randomResponse);
        }, 1500);
      });
    }
  };

  if (isLoading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>読み込み中...</Typography>
      </Container>
    );
  }

  if (!memo || !project) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography>メモまたはプロジェクトが見つかりません</Typography>
      </Container>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper 
        elevation={1} 
        sx={{ 
          borderRadius: 0, 
          borderBottom: `1px solid ${theme.palette.divider}`,
          zIndex: 1,
        }}
      >
        <Container maxWidth="xl" sx={{ py: 2 }}>
          {/* ブレッドクラム */}
          <Breadcrumbs sx={{ mb: 1 }}>
            <Link
              component="button"
              variant="body2"
              onClick={() => navigate('/dashboard')}
              sx={{ textDecoration: 'none' }}
            >
              ダッシュボード
            </Link>
            <Typography 
              variant="body2" 
              color="text.primary"
            >
              {project.theme}
            </Typography>
          </Breadcrumbs>

          {/* ツールバー */}
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <IconButton
                onClick={() => navigate(`/projects/${projectId}`)}
                sx={{ mr: 1 }}
              >
                <BackIcon />
              </IconButton>
              <Typography variant="h6" fontWeight="bold">
                メモ
              </Typography>
              {lastSaved && (
                <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                  最終保存: {lastSaved.toLocaleTimeString()}
                </Typography>
              )}
            </Box>

            {/* メモ情報 */}
            <Box display="flex" alignItems="center">
              {lastSaved && (
                <Typography variant="caption" color="text.secondary" sx={{ mr: 2 }}>
                  最終保存: {lastSaved.toLocaleTimeString()}
                </Typography>
              )}
            </Box>
          </Box>
        </Container>
      </Paper>

      {/* メインコンテンツ - MemoChat風レイアウト */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        {!isMobile ? (
          /* デスクトップ: 左右分割表示 */
          <PanelGroup direction="horizontal" style={{ height: '100%' }}>
            {/* メモパネル */}
            <Panel defaultSize={45} minSize={25} maxSize={70}>
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'background.paper',
                overflow: 'hidden',
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  p: 2,
                  backgroundColor: 'background.default',
                  flexShrink: 0,
                }}>
                  <Tooltip title="メモをクリア" arrow>
                    <IconButton onClick={handleMemoClear} size="small" sx={{ mr: 1 }}>
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="メモを保存" arrow>
                    <IconButton onClick={handleMemoSave} size="small" color="primary">
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ 
                  flex: 1,
                  overflow: 'auto',
                  p: 3,
                }}>
                  <TextField
                    multiline
                    fullWidth
                    minRows={25}
                    value={memoContent}
                    onChange={handleMemoChange}
                    onKeyDown={handleKeyDown}
                    placeholder={memoPlaceholder}
                    variant="standard"
                    sx={{
                      '& .MuiInputBase-root': {
                        padding: 0,
                      },
                      '& .MuiInput-underline:before': {
                        display: 'none',
                      },
                      '& .MuiInput-underline:after': {
                        display: 'none',
                      },
                    }}
                    ref={memoRef}
                  />
                </Box>
              </Box>
            </Panel>

            {/* リサイズハンドル */}
            <PanelResizeHandle style={{
              width: '8px',
              backgroundColor: theme.palette.divider,
              cursor: 'col-resize',
              position: 'relative',
            }}>
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '4px',
                height: '40px',
                backgroundColor: 'background.paper',
                borderRadius: '2px',
              }} />
            </PanelResizeHandle>

            {/* チャットパネル */}
            <Panel defaultSize={55} minSize={30}>
              <Box sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'background.default',
              }}>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  p: 3,
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      AIアシスタント
                    </Typography>
                  </Box>
                </Box>
                
                {/* AI相談コンポーネント */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  <AIChat 
                    pageId={`memo-${memoId}`}
                    title={getCurrentTitle()}
                    memoContent={memoContent}
                    loadHistoryFromDB={true}
                    onMessageSend={handleAIMessage}
                    initialMessage={`こんにちは！このメモについて何でもお気軽にご相談ください。

${getCurrentTitle() ? `「${getCurrentTitle()}」というメモ` : 'このメモ'}の内容を参考にしながら、以下のようなサポートができます：

• **内容の深掘り**: メモの内容をさらに発展させるアイデア
• **構造化のアドバイス**: 情報をより分かりやすく整理する方法  
• **関連情報の提案**: 追加で調べると良い情報や資料
• **探究の方向性**: ${project?.theme ? `プロジェクト「${project.theme}」` : '探究学習'}への活用方法

メモを見ながら、どのようなことでお困りですか？`}
                  />
                </Box>
              </Box>
            </Panel>
          </PanelGroup>
        ) : (
          /* モバイル: 縦並び表示 */
          <Box sx={{ 
            height: '100%',
            display: 'flex', 
            flexDirection: 'column',
            backgroundColor: 'background.default',
          }}>
            {/* メモエリア */}
            <Box sx={{ backgroundColor: 'background.paper' }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                justifyContent: 'flex-end',
                p: 2,
              }}>
                <IconButton 
                  onClick={() => setIsChatExpanded(!isChatExpanded)}
                  size="small"
                  sx={{ mr: 1 }}
                >
                  {isChatExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
                <Tooltip title="メモをクリア" arrow>
                  <IconButton onClick={handleMemoClear} size="small" sx={{ mr: 1 }}>
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="メモを保存" arrow>
                  <IconButton onClick={handleMemoSave} size="small" color="primary">
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              </Box>
              {!isChatExpanded && (
                <TextField
                  multiline
                  minRows={4}
                  maxRows={8}
                  fullWidth
                  value={memoContent}
                  onChange={handleMemoChange}
                  onKeyDown={handleKeyDown}
                  placeholder={memoPlaceholder}
                  variant="standard"
                  sx={{
                    px: 3,
                    pb: 3,
                    '& .MuiInputBase-root': {
                      padding: 0,
                    },
                    '& .MuiInput-underline:before': {
                      display: 'none',
                    },
                    '& .MuiInput-underline:after': {
                      display: 'none',
                    },
                  }}
                  ref={memoRef}
                />
              )}
            </Box>

            {/* チャットエリア */}
            <Box sx={{ 
              flex: isChatExpanded ? 1 : 'none',
              display: 'flex',
              flexDirection: 'column',
              height: isChatExpanded ? 'calc(100% - 72px)' : 'auto',
            }}>
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 3,
                backgroundColor: 'background.paper',
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  <AIIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    AIアシスタント
                  </Typography>
                </Box>
              </Box>
              
              {/* AI相談コンポーネント */}
              <Box sx={{ flex: 1, overflow: 'hidden' }}>
                <AIChat 
                  pageId={`memo-${memoId}`}
                  title={getCurrentTitle()}
                  memoContent={memoContent}
                  loadHistoryFromDB={true}
                  onMessageSend={handleAIMessage}
                  initialMessage={`こんにちは！このメモについて何でもお気軽にご相談ください。

${getCurrentTitle() ? `「${getCurrentTitle()}」というメモ` : 'このメモ'}の内容を参考にしながら、以下のようなサポートができます：

• **内容の深掘り**: メモの内容をさらに発展させるアイデア
• **構造化のアドバイス**: 情報をより分かりやすく整理する方法  
• **関連情報の提案**: 追加で調べると良い情報や資料
• **探究の方向性**: ${project?.theme ? `プロジェクト「${project.theme}」` : '探究学習'}への活用方法

メモを見ながら、どのようなことでお困りですか？`}
                />
              </Box>
            </Box>
          </Box>
        )}
      </Box>

    </Box>
  );
};

export default MemoPage; 