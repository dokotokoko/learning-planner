import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Collapse,
  Stack,
} from '@mui/material';
import {
  Check as CheckIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  History as HistoryIcon,
  Lightbulb as IdeaIcon,
  Flag as FlagIcon,
  NavigateNext as NextIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
} from '@mui/icons-material';
import { BubbleNode, QuestionSeed, QuestionCandidate, FinalQuestion } from './types';

interface QuestionFinalizationProps {
  bubbleNodes: BubbleNode[];
  centerKeywordId: string | null;
  questionSeeds: QuestionSeed[];
  questionCandidates: QuestionCandidate[];
  selectedCandidateId: string | null;
  finalQuestion: FinalQuestion | null;
  onUpdateFinalQuestion: (question: string) => void;
  onSaveFinalQuestion: (question: FinalQuestion) => void;
  onComplete: () => void;
}

const QuestionFinalization: React.FC<QuestionFinalizationProps> = ({
  bubbleNodes,
  centerKeywordId,
  questionSeeds,
  questionCandidates,
  selectedCandidateId,
  finalQuestion,
  onUpdateFinalQuestion,
  onSaveFinalQuestion,
  onComplete,
}) => {
  const [questionText, setQuestionText] = useState('');
  const [isEditing, setIsEditing] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // 選択された候補から初期値を設定
  useEffect(() => {
    if (selectedCandidateId && !questionText) {
      const selectedCandidate = questionCandidates.find(c => c.id === selectedCandidateId);
      if (selectedCandidate) {
        setQuestionText(selectedCandidate.content);
      }
    } else if (finalQuestion) {
      setQuestionText(finalQuestion.content);
    }
  }, [selectedCandidateId, questionCandidates, finalQuestion]);

  const centerKeyword = bubbleNodes.find(n => n.id === centerKeywordId);
  const selectedCandidate = questionCandidates.find(c => c.id === selectedCandidateId);

  const handleSave = () => {
    if (questionText.trim()) {
      const final: FinalQuestion = {
        content: questionText.trim(),
        keywords: bubbleNodes.map(n => n.text),
        questionSeeds,
        candidates: questionCandidates,
        createdAt: new Date(),
      };
      onSaveFinalQuestion(final);
      setIsEditing(false);
      setIsSaved(true);
    }
  };

  const handleComplete = () => {
    if (questionText.trim()) {
      onComplete();
    }
  };

  // 探究のプロセスサマリー
  const processSummary = {
    totalKeywords: bubbleNodes.length,
    centerKeyword: centerKeyword?.text || '',
    questionSeedsCount: questionSeeds.length,
    candidatesCount: questionCandidates.length,
    categories: [...new Set(questionSeeds.map(s => s.category))],
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          <FlagIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          探究の問いを決定する
        </Typography>
        <Typography variant="body2" color="text.secondary">
          これまでの探究を踏まえて、あなたの問いを最終決定します。
          必要に応じて編集して、探究学習のスタートラインに立ちましょう。
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* メインエリア */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', p: 3, overflow: 'auto' }}>
            {/* 最終的な問い */}
            <Card sx={{ mb: 3, bgcolor: 'primary.light' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ color: 'primary.contrastText' }}>
                  あなたの探究の問い
                </Typography>
                
                {isEditing ? (
                  <Box>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder="探究の問いを入力してください..."
                      sx={{
                        bgcolor: 'white',
                        borderRadius: 1,
                        '& .MuiInputBase-input': {
                          fontSize: '1.2rem',
                          lineHeight: 1.6,
                        },
                      }}
                    />
                    <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        startIcon={<SaveIcon />}
                        onClick={handleSave}
                        disabled={!questionText.trim()}
                      >
                        保存
                      </Button>
                      {finalQuestion && (
                        <Button
                          variant="outlined"
                          onClick={() => setIsEditing(false)}
                        >
                          キャンセル
                        </Button>
                      )}
                    </Box>
                  </Box>
                ) : (
                  <Box>
                    <Typography 
                      variant="h5" 
                      sx={{ 
                        color: 'primary.contrastText',
                        lineHeight: 1.6,
                        mb: 2,
                      }}
                    >
                      {questionText}
                    </Typography>
                    <IconButton
                      onClick={() => setIsEditing(true)}
                      sx={{ color: 'primary.contrastText' }}
                    >
                      <EditIcon />
                    </IconButton>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* 保存完了メッセージ */}
            {isSaved && (
              <Alert severity="success" sx={{ mb: 2 }}>
                問いが保存されました！編集して調整することもできます。
              </Alert>
            )}

            {/* 探究のヒント */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  <IdeaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                  探究のヒント
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="問いは具体的で、調査可能ですか？"
                      secondary="「なぜ」「どのように」を使うと深い探究になります"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="あなた自身の興味や関心が反映されていますか？"
                      secondary="個人的な体験や疑問と結びつけると意欲が高まります"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <CheckIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="問いの範囲は適切ですか？"
                      secondary="広すぎず狭すぎず、探究期間内で取り組める範囲に"
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* 探究開始ボタン */}
            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button
                variant="contained"
                size="large"
                color="primary"
                onClick={handleComplete}
                disabled={!questionText.trim() || isEditing}
                endIcon={<NextIcon />}
                sx={{
                  py: 2,
                  px: 4,
                  fontSize: '1.1rem',
                }}
              >
                この問いで探究を始める
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* サイドバー：プロセスサマリー */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', p: 2, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              <HistoryIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              探究のプロセス
            </Typography>
            
            {/* サマリー統計 */}
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      収集したキーワード:
                    </Typography>
                    <Chip label={processSummary.totalKeywords} size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      中心テーマ:
                    </Typography>
                    <Chip label={processSummary.centerKeyword} size="small" color="primary" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      問いの種:
                    </Typography>
                    <Chip label={processSummary.questionSeedsCount} size="small" />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      生成した候補:
                    </Typography>
                    <Chip label={processSummary.candidatesCount} size="small" />
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* 問いの履歴 */}
            <Box>
              <Button
                fullWidth
                onClick={() => setShowHistory(!showHistory)}
                endIcon={showHistory ? <CollapseIcon /> : <ExpandIcon />}
                sx={{ mb: 1 }}
              >
                問いの変遷を見る
              </Button>
              
              <Collapse in={showHistory}>
                <List dense>
                  {/* 問いの種 */}
                  <ListItem>
                    <ListItemText
                      primary="初期の問いの種"
                      secondary={questionSeeds.map(s => s.content).join(', ')}
                    />
                  </ListItem>
                  <Divider />
                  
                  {/* 候補 */}
                  {selectedCandidate && (
                    <>
                      <ListItem>
                        <ListItemText
                          primary="選択した候補"
                          secondary={selectedCandidate.content}
                        />
                      </ListItem>
                      <Divider />
                    </>
                  )}
                  
                  {/* 最終問い */}
                  {questionText && (
                    <ListItem>
                      <ListItemText
                        primary="最終的な問い"
                        secondary={questionText}
                      />
                    </ListItem>
                  )}
                </List>
              </Collapse>
            </Box>

            {/* キーワードタグ */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                使用したキーワード
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {bubbleNodes.slice(0, 10).map(node => (
                  <Chip
                    key={node.id}
                    label={node.text}
                    size="small"
                    variant={node.id === centerKeywordId ? "filled" : "outlined"}
                    color={node.id === centerKeywordId ? "primary" : "default"}
                  />
                ))}
                {bubbleNodes.length > 10 && (
                  <Chip
                    label={`他${bubbleNodes.length - 10}個`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default QuestionFinalization;