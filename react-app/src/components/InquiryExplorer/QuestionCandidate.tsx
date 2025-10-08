import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  Slider,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Tooltip,
  Radar,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  Stack,
  Alert,
  LinearProgress,
  TextField,
} from '@mui/material';
import {
  Edit as EditIcon,
  AutoAwesome as GenerateIcon,
  Assessment as ScoreIcon,
  Refresh as RefreshIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from '@mui/icons-material';
import { QuestionSeed, QuestionCandidate as QuestionCandidateType, QuestionScores } from './types';

// Chart.jsのRadarチャートを使用
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip as ChartTooltip,
  Legend,
} from 'chart.js';
import { Radar as RadarChart } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  ChartTooltip,
  Legend
);

interface QuestionCandidateProps {
  questionSeeds: QuestionSeed[];
  questionCandidates: QuestionCandidateType[];
  onGenerateCandidates: (seedId: string) => void;
  onUpdateCandidate: (candidateId: string, content: string) => void;
  onSelectCandidate: (candidateId: string) => void;
  onEvaluateCandidate: (candidateId: string) => void;
  onNext: () => void;
  selectedCandidateId: string | null;
}

const QuestionCandidateComponent: React.FC<QuestionCandidateProps> = ({
  questionSeeds,
  questionCandidates,
  onGenerateCandidates,
  onUpdateCandidate,
  onSelectCandidate,
  onEvaluateCandidate,
  onNext,
  selectedCandidateId,
}) => {
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [transformType, setTransformType] = useState<'paraphrase' | 'focus' | 'method'>('paraphrase');
  const [scopeValue, setScopeValue] = useState(50);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // 問いの種を選択
  const handleSelectSeed = (seedId: string) => {
    setSelectedSeedId(seedId);
    onGenerateCandidates(seedId);
  };

  // 問い候補のタイプを変更
  const handleTransformTypeChange = (
    event: React.MouseEvent<HTMLElement>,
    newType: 'paraphrase' | 'focus' | 'method' | null
  ) => {
    if (newType !== null) {
      setTransformType(newType);
      if (selectedSeedId) {
        onGenerateCandidates(selectedSeedId);
      }
    }
  };

  // お気に入りの切り替え
  const toggleFavorite = (candidateId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(candidateId)) {
      newFavorites.delete(candidateId);
    } else {
      newFavorites.add(candidateId);
    }
    setFavorites(newFavorites);
  };

  // レーダーチャートのデータ準備
  const prepareRadarData = (scores: QuestionScores) => {
    return {
      labels: ['主体性', '探究可能性', 'スコープ', '解像度'],
      datasets: [
        {
          label: '評価スコア',
          data: [
            scores.subjectivity,
            scores.explorability,
            scores.scope,
            scores.resolution,
          ],
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
        },
      ],
    };
  };

  const radarOptions = {
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
  };

  // 選択された問いの種のcandidate
  const currentCandidates = selectedSeedId 
    ? questionCandidates.filter(c => c.originalSeed.id === selectedSeedId)
    : [];

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          問いを育てる
        </Typography>
        <Typography variant="body2" color="text.secondary">
          問いの種から、より具体的で探究可能な問いへと発展させます。
          AIが提案する候補を評価し、編集して、あなたの問いを作りましょう。
        </Typography>
      </Paper>

      <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
        {/* 左側：問いの種リスト */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '100%', p: 2, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              問いの種
            </Typography>
            <List>
              {questionSeeds.map(seed => (
                <ListItem
                  key={seed.id}
                  button
                  selected={seed.id === selectedSeedId}
                  onClick={() => handleSelectSeed(seed.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: seed.id === selectedSeedId ? 'action.selected' : 'transparent',
                  }}
                >
                  <ListItemText
                    primary={seed.content}
                    secondary={
                      <Box sx={{ mt: 0.5 }}>
                        <Chip label={seed.sourceKeyword} size="small" sx={{ mr: 0.5 }} />
                        <Chip label={seed.category} size="small" variant="outlined" />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* 右側：問い候補と評価 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '100%', p: 2, overflow: 'auto' }}>
            {selectedSeedId ? (
              <>
                {/* 変換タイプ選択 */}
                <Box sx={{ mb: 2 }}>
                  <ToggleButtonGroup
                    value={transformType}
                    exclusive
                    onChange={handleTransformTypeChange}
                    aria-label="transform type"
                    fullWidth
                  >
                    <ToggleButton value="paraphrase" aria-label="paraphrase">
                      言い換え
                    </ToggleButton>
                    <ToggleButton value="focus" aria-label="focus">
                      焦点化
                    </ToggleButton>
                    <ToggleButton value="method" aria-label="method">
                      方法付け
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                {/* スコープ調整スライダー */}
                <Box sx={{ mb: 3, px: 2 }}>
                  <Typography gutterBottom>
                    スコープ調整
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Typography variant="body2">狭い</Typography>
                    <Slider
                      value={scopeValue}
                      onChange={(e, value) => setScopeValue(value as number)}
                      onChangeCommitted={() => {
                        if (selectedSeedId) {
                          onGenerateCandidates(selectedSeedId);
                        }
                      }}
                      valueLabelDisplay="auto"
                      step={10}
                      marks
                      min={0}
                      max={100}
                    />
                    <Typography variant="body2">広い</Typography>
                  </Stack>
                </Box>

                {/* 問い候補カード */}
                <Grid container spacing={2}>
                  {currentCandidates.map(candidate => (
                    <Grid item xs={12} key={candidate.id}>
                      <Card 
                        sx={{ 
                          position: 'relative',
                          border: candidate.id === selectedCandidateId ? 2 : 1,
                          borderColor: candidate.id === selectedCandidateId ? 'primary.main' : 'divider',
                        }}
                      >
                        <CardContent>
                          {/* お気に入りボタン */}
                          <IconButton
                            sx={{ position: 'absolute', top: 8, right: 8 }}
                            onClick={() => toggleFavorite(candidate.id)}
                          >
                            {favorites.has(candidate.id) ? <StarIcon color="primary" /> : <StarBorderIcon />}
                          </IconButton>

                          {/* 問い内容 */}
                          {editingCandidateId === candidate.id ? (
                            <Box>
                              <TextField
                                fullWidth
                                multiline
                                rows={2}
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onBlur={() => {
                                  onUpdateCandidate(candidate.id, editContent);
                                  setEditingCandidateId(null);
                                }}
                              />
                            </Box>
                          ) : (
                            <Typography 
                              variant="h6" 
                              gutterBottom
                              sx={{ cursor: 'pointer' }}
                              onClick={() => {
                                setEditingCandidateId(candidate.id);
                                setEditContent(candidate.content);
                              }}
                            >
                              {candidate.content}
                              <IconButton size="small" sx={{ ml: 1 }}>
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </Typography>
                          )}

                          {/* タイプチップ */}
                          <Chip 
                            label={
                              candidate.type === 'paraphrase' ? '言い換え' :
                              candidate.type === 'focus' ? '焦点化' : '方法付け'
                            }
                            size="small"
                            color="primary"
                            variant="outlined"
                            sx={{ mb: 2 }}
                          />

                          {/* 評価スコア */}
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Box sx={{ height: 200 }}>
                                <RadarChart 
                                  data={prepareRadarData(candidate.scores)} 
                                  options={radarOptions}
                                />
                              </Box>
                            </Grid>
                            <Grid item xs={12} md={6}>
                              <Box sx={{ p: 1 }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  AI評価コメント
                                </Typography>
                                <Typography variant="body2" sx={{ mb: 2 }}>
                                  {candidate.comment}
                                </Typography>
                                
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<RefreshIcon />}
                                  onClick={() => onEvaluateCandidate(candidate.id)}
                                  fullWidth
                                >
                                  再評価
                                </Button>
                              </Box>
                            </Grid>
                          </Grid>

                          {/* アクションボタン */}
                          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                            <Button
                              variant={candidate.id === selectedCandidateId ? "contained" : "outlined"}
                              onClick={() => onSelectCandidate(candidate.id)}
                            >
                              この問いを選ぶ
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>

                {/* 候補再生成ボタン */}
                {currentCandidates.length > 0 && (
                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      variant="outlined"
                      startIcon={<GenerateIcon />}
                      onClick={() => onGenerateCandidates(selectedSeedId)}
                    >
                      新しい候補を生成
                    </Button>
                  </Box>
                )}
              </>
            ) : (
              <Alert severity="info">
                左側のリストから問いの種を選択してください
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ナビゲーション */}
      {selectedCandidateId && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={onNext}
          >
            最終決定へ
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default QuestionCandidateComponent;