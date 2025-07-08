import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  TextField,
  Button,
  Box,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Fade,
  Grow,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stepper,
  Step,
  StepLabel,
  Zoom,
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  School as SchoolIcon,
  Psychology as PsychologyIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as RadioButtonUncheckedIcon,
  AccountTree as TreeIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { themeDeepDiveApi } from '../../lib/api';

interface TreeNode {
  id: string;
  theme: string;
  depth: number;
  parent?: string;
  children: string[];
  selected?: boolean;
  userInput?: boolean;
}

interface UserProfile {
  interests: string[];
  recentTopics: string[];
}

const ThemeDeepDiveGame: React.FC = () => {
  const { user } = useAuthStore();
  const [currentTheme, setCurrentTheme] = useState('');
  const [treeNodes, setTreeNodes] = useState<Record<string, TreeNode>>({});
  const [currentNodeId, setCurrentNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    interests: [],
    recentTopics: [],
  });
  const [path, setPath] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ユーザープロフィールの読み込み
  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    try {
      // LocalStorageからプロフィール情報を読み込み
      const storedInterests = localStorage.getItem(`user-${user?.id}-interests`);
      const storedRecentTopics = localStorage.getItem(`user-${user?.id}-recent-topics`);
      
      setUserProfile({
        interests: storedInterests ? JSON.parse(storedInterests) : [],
        recentTopics: storedRecentTopics ? JSON.parse(storedRecentTopics) : [],
      });
    } catch (error) {
      console.error('プロフィール読み込みエラー:', error);
    }
  };

  // テーマの保存
  const saveRecentTopic = (topic: string) => {
    try {
      const recentTopics = [...userProfile.recentTopics];
      if (!recentTopics.includes(topic)) {
        recentTopics.unshift(topic);
        if (recentTopics.length > 10) {
          recentTopics.pop();
        }
        localStorage.setItem(`user-${user?.id}-recent-topics`, JSON.stringify(recentTopics));
        setUserProfile({ ...userProfile, recentTopics });
      }
    } catch (error) {
      console.error('トピック保存エラー:', error);
    }
  };

  // 初期テーマの設定
  const handleStartExploration = () => {
    if (!currentTheme.trim()) {
      setError('テーマを入力してください');
      return;
    }

    setError(null);
    const rootId = 'root';
    const rootNode: TreeNode = {
      id: rootId,
      theme: currentTheme.trim(),
      depth: 0,
      children: [],
    };

    setTreeNodes({ [rootId]: rootNode });
    setCurrentNodeId(rootId);
    setPath([currentTheme.trim()]);
    saveRecentTopic(currentTheme.trim());
    
    // 最初の子レイヤーを生成
    generateChildSuggestions(rootNode);
  };

  // 子レイヤーの生成（実際のLLM API呼び出し）
  const generateChildSuggestions = async (parentNode: TreeNode) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // 選択パスを構築
      const pathNodes: string[] = [];
      let currentNode: TreeNode | undefined = parentNode;
      while (currentNode) {
        pathNodes.unshift(currentNode.theme);
        if (currentNode.parent) {
          currentNode = treeNodes[currentNode.parent];
        } else {
          currentNode = undefined;
        }
      }
      
      // API呼び出し
      const data = await themeDeepDiveApi.generateSuggestions({
        theme: parentNode.theme,
        parent_theme: parentNode.parent ? treeNodes[parentNode.parent]?.theme || '' : '',
        depth: parentNode.depth,
        path: pathNodes,
        user_interests: userProfile.interests,
      });
      
      setSuggestions(data.suggestions);
      setShowCustomInput(false);
      
    } catch (error) {
      console.error('生成エラー:', error);
      // フォールバック：シミュレーション生成を使用
      const suggestions = generateSuggestionsBasedOnContext(
        parentNode.theme,
        userProfile,
        parentNode.depth
      );
      setSuggestions(suggestions);
      setShowCustomInput(false);
    } finally {
      setIsLoading(false);
    }
  };

  // コンテキストに基づいた提案生成（シミュレーション）
  const generateSuggestionsBasedOnContext = (
    theme: string,
    profile: UserProfile,
    depth: number
  ): string[] => {
    const baseKeywords = extractKeywords(theme);
    const interestKeywords = profile.interests.flatMap(extractKeywords);
    
    // デモ用の提案生成ロジック
    const templates = [
      `${theme}の社会的影響`,
      `${theme}の技術的側面`,
      `${theme}と環境の関係`,
      `${theme}の歴史的背景`,
      `${theme}の未来予測`,
      `${theme}の具体的事例`,
      `${theme}に関する課題`,
      `${theme}の可能性`,
    ];

    // プロフィールに基づいた追加提案
    if (profile.interests.length > 0) {
      const randomInterest = profile.interests[Math.floor(Math.random() * profile.interests.length)];
      templates.push(`${theme}と${randomInterest}の関連性`);
    }

    // 深さに応じて具体化
    if (depth > 1) {
      templates.push(
        `${theme}の実践方法`,
        `${theme}の測定・評価`,
        `${theme}のケーススタディ`
      );
    }

    // ランダムに5-7個選択
    const shuffled = templates.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.floor(Math.random() * 3) + 5);
  };

  // キーワード抽出（簡易版）
  const extractKeywords = (text: string): string[] => {
    return text.split(/[、。\s]+/).filter(word => word.length > 1);
  };

  // 選択肢の選択処理
  const handleSelectSuggestion = async (suggestion: string) => {
    if (!currentNodeId) return;

    const parentNode = treeNodes[currentNodeId];
    const newNodeId = `node-${Date.now()}`;
    const newNode: TreeNode = {
      id: newNodeId,
      theme: suggestion,
      depth: parentNode.depth + 1,
      parent: currentNodeId,
      children: [],
      selected: true,
      userInput: false,
    };

    // ツリーの更新
    const updatedNodes = {
      ...treeNodes,
      [currentNodeId]: {
        ...parentNode,
        children: [...parentNode.children, newNodeId],
      },
      [newNodeId]: newNode,
    };

    setTreeNodes(updatedNodes);
    setCurrentNodeId(newNodeId);
    const newPath = [...path, suggestion];
    setPath(newPath);
    setSuggestions([]);
    
    // 選択を保存（非同期で実行）
    try {
      await themeDeepDiveApi.saveSelection(suggestion, newPath);
    } catch (error) {
      console.error('選択の保存に失敗:', error);
    }
    
    // 次の子レイヤーを生成
    generateChildSuggestions(newNode);
  };

  // カスタム入力の処理
  const handleCustomInput = () => {
    if (!customInput.trim()) {
      setError('テーマを入力してください');
      return;
    }

    handleSelectSuggestion(customInput.trim());
    setCustomInput('');
    setShowCustomInput(false);
  };

  // 戻る処理
  const handleGoBack = () => {
    if (!currentNodeId || path.length <= 1) return;

    const currentNode = treeNodes[currentNodeId];
    if (currentNode.parent) {
      setCurrentNodeId(currentNode.parent);
      setPath(path.slice(0, -1));
      const parentNode = treeNodes[currentNode.parent];
      generateChildSuggestions(parentNode);
    }
  };

  // リセット処理
  const handleReset = () => {
    setCurrentTheme('');
    setTreeNodes({});
    setCurrentNodeId(null);
    setSuggestions([]);
    setCustomInput('');
    setShowCustomInput(false);
    setPath([]);
    setError(null);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          探究テーマ深掘りツリー
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          AIの提案から興味のある方向を選んで、テーマを深掘りしていきましょう
        </Typography>

        {/* 初期入力画面 */}
        {!currentNodeId && (
          <Fade in={true}>
            <Box sx={{ mt: 4, maxWidth: 600, mx: 'auto' }}>
              <Typography variant="h6" gutterBottom>
                探究したいテーマを入力してください
              </Typography>
              <TextField
                fullWidth
                label="探究テーマ"
                value={currentTheme}
                onChange={(e) => setCurrentTheme(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStartExploration()}
                variant="outlined"
                margin="normal"
                placeholder="例：再生可能エネルギー、AI技術、環境問題など"
                error={!!error}
                helperText={error}
              />
              
              {/* 最近のテーマ */}
              {userProfile.recentTopics.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    最近探究したテーマ
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {userProfile.recentTopics.slice(0, 5).map((topic, index) => (
                      <Chip
                        key={index}
                        label={topic}
                        onClick={() => setCurrentTheme(topic)}
                        variant="outlined"
                        size="small"
                      />
                    ))}
                  </Box>
                </Box>
              )}

              <Button
                variant="contained"
                size="large"
                onClick={handleStartExploration}
                sx={{ mt: 3 }}
                fullWidth
                startIcon={<SchoolIcon />}
              >
                探究を開始する
              </Button>
            </Box>
          </Fade>
        )}

        {/* 探究画面 */}
        {currentNodeId && (
          <Box sx={{ mt: 4 }}>
            {/* パスの表示 */}
            <Box sx={{ mb: 4 }}>
              <Stepper activeStep={path.length - 1} alternativeLabel>
                {path.map((theme, index) => (
                  <Step key={index} completed={index < path.length - 1}>
                    <StepLabel>
                      <Typography variant="caption" noWrap sx={{ maxWidth: 150 }}>
                        {theme}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
            </Box>

            {/* 現在のテーマ */}
            <Paper sx={{ p: 3, mb: 4, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h5" align="center">
                現在のテーマ: {treeNodes[currentNodeId]?.theme}
              </Typography>
              <Typography variant="body2" align="center" sx={{ mt: 1 }}>
                深さ: レベル {treeNodes[currentNodeId]?.depth + 1}
              </Typography>
            </Paper>

            {/* エラー表示 */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* ローディング */}
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                <CircularProgress />
                <Typography variant="body1" sx={{ ml: 2 }}>
                  AIが提案を生成中...
                </Typography>
              </Box>
            )}

            {/* 選択肢の表示（ツリー構造） */}
            {!isLoading && suggestions.length > 0 && (
              <AnimatePresence>
                <Box>
                  <Typography variant="h6" gutterBottom sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TreeIcon />
                    どの方向に深掘りしますか？
                  </Typography>
                  
                  {/* ツリービジュアライゼーション */}
                  <Box sx={{ 
                    position: 'relative',
                    minHeight: 400,
                    overflow: 'visible',
                    py: 4,
                  }}>
                    {/* 現在のノード（中央） */}
                    <Box sx={{
                      position: 'absolute',
                      left: '50%',
                      top: 0,
                      transform: 'translateX(-50%)',
                      zIndex: 2,
                    }}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Paper
                          elevation={8}
                          sx={{
                            p: 2,
                            borderRadius: '50%',
                            width: 120,
                            height: 120,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'primary.main',
                            color: 'primary.contrastText',
                            textAlign: 'center',
                          }}
                        >
                          <Typography variant="body2" fontWeight="bold">
                            {treeNodes[currentNodeId]?.theme}
                          </Typography>
                        </Paper>
                      </motion.div>
                    </Box>

                    {/* 接続線とサジェスチョンノード */}
                    <Box sx={{ position: 'relative', mt: 20 }}>
                      {suggestions.map((suggestion, index) => {
                        const totalSuggestions = suggestions.length + 1; // +1 for custom input
                        const angle = (index / (totalSuggestions - 1)) * 180 - 90; // -90度から90度の範囲
                        const radius = 250;
                        const x = Math.cos((angle * Math.PI) / 180) * radius;
                        const y = Math.sin((angle * Math.PI) / 180) * radius + 50;

                        return (
                          <React.Fragment key={index}>
                            {/* 接続線 */}
                            <svg
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: -120,
                                width: Math.abs(x) + 60,
                                height: y + 120,
                                transform: x < 0 ? 'translateX(-100%)' : 'translateX(-60px)',
                                pointerEvents: 'none',
                                zIndex: 0,
                              }}
                            >
                              <motion.line
                                x1={x < 0 ? Math.abs(x) + 60 : 60}
                                y1={60}
                                x2={x < 0 ? 60 : Math.abs(x) + 60}
                                y2={y + 120}
                                stroke="#ccc"
                                strokeWidth="2"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                              />
                            </svg>

                            {/* サジェスチョンノード */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.3 }}
                              style={{
                                position: 'absolute',
                                left: `calc(50% + ${x}px)`,
                                top: y,
                                transform: 'translateX(-50%)',
                                zIndex: 1,
                              }}
                            >
                              <Card
                                sx={{
                                  width: 200,
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: 6,
                                    '& .node-circle': {
                                      bgcolor: 'primary.main',
                                      color: 'primary.contrastText',
                                    },
                                  },
                                }}
                                onClick={() => handleSelectSuggestion(suggestion)}
                              >
                                <CardContent sx={{ p: 2 }}>
                                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                    <Box
                                      className="node-circle"
                                      sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        bgcolor: 'background.paper',
                                        border: '2px solid',
                                        borderColor: 'primary.main',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        mb: 1,
                                        transition: 'all 0.3s ease',
                                      }}
                                    >
                                      <Typography variant="caption" fontWeight="bold">
                                        {index + 1}
                                      </Typography>
                                    </Box>
                                    <Typography 
                                      variant="body2" 
                                      align="center"
                                      sx={{ 
                                        fontSize: '0.875rem',
                                        lineHeight: 1.4,
                                      }}
                                    >
                                      {suggestion}
                                    </Typography>
                                  </Box>
                                </CardContent>
                              </Card>
                            </motion.div>
                          </React.Fragment>
                        );
                      })}

                      {/* カスタム入力ノード */}
                      {(() => {
                        const index = suggestions.length;
                        const totalSuggestions = suggestions.length + 1;
                        const angle = (index / (totalSuggestions - 1)) * 180 - 90;
                        const radius = 250;
                        const x = Math.cos((angle * Math.PI) / 180) * radius;
                        const y = Math.sin((angle * Math.PI) / 180) * radius + 50;

                        return (
                          <React.Fragment>
                            {/* 接続線 */}
                            <svg
                              style={{
                                position: 'absolute',
                                left: '50%',
                                top: -120,
                                width: Math.abs(x) + 60,
                                height: y + 120,
                                transform: x < 0 ? 'translateX(-100%)' : 'translateX(-60px)',
                                pointerEvents: 'none',
                                zIndex: 0,
                              }}
                            >
                              <motion.line
                                x1={x < 0 ? Math.abs(x) + 60 : 60}
                                y1={60}
                                x2={x < 0 ? 60 : Math.abs(x) + 60}
                                y2={y + 120}
                                stroke="#ccc"
                                strokeWidth="2"
                                strokeDasharray="5,5"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 0.5, delay: index * 0.1 }}
                              />
                            </svg>

                            {/* カスタム入力ノード */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.3 }}
                              style={{
                                position: 'absolute',
                                left: `calc(50% + ${x}px)`,
                                top: y,
                                transform: 'translateX(-50%)',
                                zIndex: 1,
                              }}
                            >
                              <Card
                                sx={[
                                  {
                                    width: 200,
                                    border: '2px dashed',
                                    borderColor: 'divider',
                                    bgcolor: 'background.default',
                                    cursor: showCustomInput ? 'default' : 'pointer',
                                    transition: 'all 0.3s ease',
                                  },
                                  !showCustomInput && {
                                    '&:hover': {
                                      transform: 'scale(1.05)',
                                      borderColor: 'primary.main',
                                    },
                                  },
                                ]}
                                onClick={() => !showCustomInput && setShowCustomInput(true)}
                              >
                                {!showCustomInput ? (
                                  <CardContent sx={{ p: 2 }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                      <EditIcon sx={{ fontSize: 30, color: 'action.active', mb: 1 }} />
                                      <Typography variant="body2" color="text.secondary" align="center">
                                        自分で入力
                                      </Typography>
                                    </Box>
                                  </CardContent>
                                ) : (
                                  <CardContent sx={{ p: 2 }}>
                                    <TextField
                                      autoFocus
                                      fullWidth
                                      label="テーマを入力"
                                      value={customInput}
                                      onChange={(e) => setCustomInput(e.target.value)}
                                      onKeyPress={(e) => e.key === 'Enter' && handleCustomInput()}
                                      variant="outlined"
                                      size="small"
                                      sx={{ mb: 1 }}
                                    />
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                      <Button
                                        size="small"
                                        variant="contained"
                                        onClick={handleCustomInput}
                                        fullWidth
                                      >
                                        決定
                                      </Button>
                                      <Button
                                        size="small"
                                        variant="outlined"
                                        onClick={() => {
                                          setShowCustomInput(false);
                                          setCustomInput('');
                                        }}
                                        fullWidth
                                      >
                                        キャンセル
                                      </Button>
                                    </Box>
                                  </CardContent>
                                )}
                              </Card>
                            </motion.div>
                          </React.Fragment>
                        );
                      })()}
                    </Box>
                  </Box>

                  {/* プロフィールベースのヒント */}
                  {userProfile.interests.length > 0 && (
                    <Box sx={{ mt: 6, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
                      <Typography variant="body2" color="info.dark">
                        💡 ヒント: あなたの興味（{userProfile.interests.slice(0, 3).join('、')}）
                        に関連する視点も考慮されています
                      </Typography>
                    </Box>
                  )}
                </Box>
              </AnimatePresence>
            )}

            {/* アクションボタン */}
            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<ArrowBackIcon />}
                onClick={handleGoBack}
                disabled={path.length <= 1}
              >
                戻る
              </Button>
              
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => currentNodeId && generateChildSuggestions(treeNodes[currentNodeId])}
                  disabled={isLoading}
                >
                  再生成
                </Button>
                <Button
                  variant="text"
                  color="error"
                  onClick={handleReset}
                >
                  最初からやり直す
                </Button>
              </Box>
            </Box>

            {/* 探究の深さ表示 */}
            <Box sx={{ mt: 4, p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
              <Typography variant="body2" color="text.secondary" align="center">
                現在の探究の深さ: {path.length} / 推奨: 5〜7層
              </Typography>
              {path.length >= 5 && (
                <Typography variant="body2" color="success.main" align="center" sx={{ mt: 1 }}>
                  十分に深掘りできています！さらに深めることも、ここで完了することもできます。
                </Typography>
              )}
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default ThemeDeepDiveGame; 