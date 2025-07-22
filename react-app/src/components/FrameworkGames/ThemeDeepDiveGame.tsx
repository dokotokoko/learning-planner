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
      
      // APIが利用できない場合は、オフラインモードで動作していることを通知
      if (error instanceof Error && error.message.includes('Failed to generate')) {
        setError('AIサーバーに接続できないため、オフラインモードで動作しています。基本的な提案のみ表示されます。');
        // 3秒後にエラーメッセージを消す
        setTimeout(() => setError(null), 3000);
      }
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
    
    // 深さに応じて異なる探索アプローチを提供
    let templates: string[] = [];
    
    // レベル1: 基本的な分野・アプローチの分岐
    if (depth === 0) {
      templates = [
        `${theme}の理論・基礎研究`,
        `${theme}の実践・応用分野`,
        `${theme}と社会・人間の関係`,
        `${theme}の技術・ツール`,
        `${theme}のビジネス・産業応用`,
        `${theme}の教育・学習方法`,
        `${theme}の最新動向・トレンド`,
        `${theme}の課題・問題点`,
      ];
    }
    // レベル2: より具体的な分野への深掘り
    else if (depth === 1) {
      templates = [
        `${theme}の具体的な手法・メソッド`,
        `${theme}における主要なプレイヤー・組織`,
        `${theme}の成功事例・ベストプラクティス`,
        `${theme}で使われる専門用語・概念`,
        `${theme}の歴史的発展・マイルストーン`,
        `${theme}と他分野の融合・連携`,
        `${theme}の評価基準・指標`,
        `${theme}における最新の研究テーマ`,
      ];
    }
    // レベル3: 実践的・具体的なアプローチ
    else if (depth === 2) {
      templates = [
        `${theme}の入門プロジェクト・チュートリアル`,
        `${theme}で解決できる具体的な問題`,
        `${theme}の学習リソース・教材`,
        `${theme}のコミュニティ・ネットワーク`,
        `${theme}の実装・実験方法`,
        `${theme}のツール・フレームワーク比較`,
        `${theme}でのキャリア・仕事`,
        `${theme}の個人プロジェクトアイデア`,
      ];
    }
    // レベル4以降: より専門的・ニッチな探索
    else {
      templates = [
        `${theme}の最新論文・研究成果`,
        `${theme}の未解決問題・研究課題`,
        `${theme}の実験設計・方法論`,
        `${theme}のニッチな応用分野`,
        `${theme}の専門家インタビュー・意見`,
        `${theme}のワークショップ・実習`,
        `${theme}の独自アプローチ・視点`,
        `${theme}での革新的なアイデア`,
      ];
    }

    // プロフィールに基づいた追加提案
    if (profile.interests.length > 0) {
      // ランダムに2つの興味分野を選んで掛け合わせ
      const interest1 = profile.interests[Math.floor(Math.random() * profile.interests.length)];
      const interest2 = profile.interests[Math.floor(Math.random() * profile.interests.length)];
      templates.push(`${theme}×${interest1}の可能性`);
      if (interest1 !== interest2) {
        templates.push(`${theme}を${interest2}に応用する方法`);
      }
    }

    // テーマの具体性に応じて追加の提案
    if (theme.includes('AI') || theme.includes('人工知能')) {
      templates.push(
        `${theme}の倫理的な考慮事項`,
        `${theme}のオープンソースプロジェクト`
      );
    }

    // ランダムに5-7個選択（重複を避けて）
    const shuffled = templates.sort(() => Math.random() - 0.5);
    const selectedCount = Math.floor(Math.random() * 3) + 5;
    return shuffled.slice(0, Math.min(selectedCount, templates.length));
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
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 2 }}>
                探索の道筋
              </Typography>
              <Stepper activeStep={path.length - 1} alternativeLabel>
                {path.map((theme, index) => (
                  <Step key={index} completed={index < path.length - 1}>
                    <StepLabel
                      StepIconProps={{
                        sx: {
                          color: index === path.length - 1 ? 'primary.main' : 'success.main',
                          '& .MuiStepIcon-text': {
                            fill: 'white',
                          },
                        },
                      }}
                    >
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          maxWidth: 150,
                          display: 'block',
                          fontWeight: index === path.length - 1 ? 'bold' : 'normal',
                          color: index === path.length - 1 ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {theme}
                      </Typography>
                    </StepLabel>
                  </Step>
                ))}
              </Stepper>
              <Typography variant="caption" color="text.secondary" align="center" sx={{ mt: 1, display: 'block' }}>
                クリックして選択したテーマが、より具体的になっていく様子が確認できます
              </Typography>
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
                  
                  {/* ツリービジュアライゼーション - 縦型階層構造 */}
                  <Box sx={{ 
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    py: 4,
                    overflow: 'auto',
                    maxHeight: '70vh',
                  }}>
                    {/* 現在のノード（親ノード） */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Paper
                        elevation={8}
                        sx={{
                          p: 3,
                          borderRadius: 2,
                          minWidth: 250,
                          maxWidth: 400,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          bgcolor: 'primary.main',
                          color: 'primary.contrastText',
                          textAlign: 'center',
                          position: 'relative',
                        }}
                      >
                        <Typography variant="h6" fontWeight="bold">
                          {treeNodes[currentNodeId]?.theme}
                        </Typography>
                      </Paper>
                    </motion.div>

                    {/* 接続線エリア */}
                    <Box sx={{ position: 'relative', width: '100%', height: 50 }}>
                      <svg
                        style={{
                          position: 'absolute',
                          width: '100%',
                          height: '100%',
                          left: 0,
                          top: 0,
                          overflow: 'visible',
                        }}
                      >
                        {/* 中央の縦線 */}
                        <motion.line
                          x1="50%"
                          y1="0"
                          x2="50%"
                          y2="30"
                          stroke="#ccc"
                          strokeWidth="2"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.3 }}
                        />
                        {/* 横線 */}
                        {suggestions.length > 1 && (
                          <motion.line
                            x1="10%"
                            y1="30"
                            x2="90%"
                            y2="30"
                            stroke="#ccc"
                            strokeWidth="2"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.3, delay: 0.1 }}
                          />
                        )}
                        {/* 各子ノードへの縦線 */}
                        {[...suggestions, 'custom'].map((_, index) => {
                          const total = suggestions.length + 1;
                          const position = total === 1 ? 50 : 10 + (80 / (total - 1)) * index;
                          return (
                            <motion.line
                              key={index}
                              x1={`${position}%`}
                              y1="30"
                              x2={`${position}%`}
                              y2="50"
                              stroke="#ccc"
                              strokeWidth="2"
                              initial={{ pathLength: 0 }}
                              animate={{ pathLength: 1 }}
                              transition={{ duration: 0.3, delay: 0.2 }}
                            />
                          );
                        })}
                      </svg>
                    </Box>

                    {/* 子ノード（選択肢） */}
                    <Box sx={{ 
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 2,
                      justifyContent: 'center',
                      width: '100%',
                      maxWidth: 1200,
                      px: 2,
                    }}>
                      {suggestions.map((suggestion, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 + 0.3 }}
                          style={{ flex: '1 1 300px', maxWidth: 350 }}
                        >
                          <Card
                            sx={{
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              height: '100%',
                              '&:hover': {
                                transform: 'translateY(-5px)',
                                boxShadow: 6,
                                borderColor: 'primary.main',
                              },
                              border: '1px solid',
                              borderColor: 'divider',
                            }}
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: 'primary.light',
                                    color: 'primary.main',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    fontWeight: 'bold',
                                    fontSize: '0.875rem',
                                  }}
                                >
                                  {index + 1}
                                </Box>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    lineHeight: 1.6,
                                    color: 'text.primary',
                                  }}
                                >
                                  {suggestion}
                                </Typography>
                              </Box>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}

                      {/* カスタム入力カード */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: suggestions.length * 0.1 + 0.3 }}
                        style={{ flex: '1 1 300px', maxWidth: 350 }}
                      >
                        <Card
                          sx={{
                            border: '2px dashed',
                            borderColor: 'divider',
                            bgcolor: 'background.default',
                            cursor: showCustomInput ? 'default' : 'pointer',
                            transition: 'all 0.3s ease',
                            height: '100%',
                            minHeight: 120,
                            ...(!showCustomInput && {
                              '&:hover': {
                                transform: 'translateY(-5px)',
                                borderColor: 'primary.main',
                                boxShadow: 2,
                              },
                            }),
                          }}
                          onClick={() => !showCustomInput && setShowCustomInput(true)}
                        >
                          {!showCustomInput ? (
                            <CardContent sx={{ 
                              height: '100%', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              p: 3,
                            }}>
                              <EditIcon sx={{ fontSize: 32, color: 'action.active', mb: 1 }} />
                              <Typography variant="body1" color="text.secondary">
                                自分で入力
                              </Typography>
                            </CardContent>
                          ) : (
                            <CardContent sx={{ p: 3 }}>
                              <TextField
                                autoFocus
                                fullWidth
                                label="テーマを入力"
                                value={customInput}
                                onChange={(e) => setCustomInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleCustomInput()}
                                variant="outlined"
                                sx={{ mb: 2 }}
                              />
                              <Box sx={{ display: 'flex', gap: 1 }}>
                                <Button
                                  variant="contained"
                                  onClick={handleCustomInput}
                                  fullWidth
                                >
                                  決定
                                </Button>
                                <Button
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
                    </Box>
                  </Box>

                  {/* プロフィールベースのヒント */}
                  {userProfile.interests.length > 0 && (
                    <Box sx={{ mt: 4, p: 2, bgcolor: 'info.light', borderRadius: 2 }}>
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