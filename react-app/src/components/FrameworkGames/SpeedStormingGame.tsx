import React, { useState, useEffect, useRef } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Grid, Card, CardContent, IconButton, LinearProgress } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import DeleteIcon from '@mui/icons-material/Delete';

interface PitchItem {
  id: string;
  benefits: string[];
  features: string[];
  uniqueValue: string;
}

const SpeedStormingGame: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [currentIdea, setCurrentIdea] = useState('');
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180); // 3分 = 180秒
  const [phase, setPhase] = useState<'setup' | 'ideation' | 'refinement' | 'pitch'>('setup');
  const [pitches, setPitches] = useState<PitchItem[]>([]);
  const [currentPitch, setCurrentPitch] = useState<PitchItem>({
    id: Date.now().toString(),
    benefits: [],
    features: [],
    uniqueValue: '',
  });
  const [benefit, setBenefit] = useState('');
  const [feature, setFeature] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerActive && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setTimerActive(false);
      if (phase === 'ideation') {
        setPhase('refinement');
        setTimeLeft(120); // 2分 = 120秒
      }
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [timerActive, timeLeft, phase]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleStartTimer = () => {
    setTimerActive(true);
  };

  const handlePauseTimer = () => {
    setTimerActive(false);
  };

  const handleResetTimer = () => {
    setTimerActive(false);
    setTimeLeft(phase === 'ideation' ? 180 : 120);
  };

  const handleStartIdeation = () => {
    if (topic) {
      setPhase('ideation');
      setTimeLeft(180); // 3分
    }
  };

  const handleAddIdea = () => {
    if (currentIdea.trim()) {
      setCurrentPitch({
        ...currentPitch,
        benefits: [...currentPitch.benefits],
        features: [...currentPitch.features],
      });
      setCurrentIdea('');
    }
  };

  const handleAddBenefit = () => {
    if (benefit.trim() && currentPitch.benefits.length < 3) {
      setCurrentPitch({
        ...currentPitch,
        benefits: [...currentPitch.benefits, benefit],
      });
      setBenefit('');
    }
  };

  const handleAddFeature = () => {
    if (feature.trim() && currentPitch.features.length < 2) {
      setCurrentPitch({
        ...currentPitch,
        features: [...currentPitch.features, feature],
      });
      setFeature('');
    }
  };

  const handleFinishRefinement = () => {
    if (currentPitch.benefits.length > 0 && currentPitch.features.length > 0 && currentPitch.uniqueValue) {
      setPitches([...pitches, currentPitch]);
      setCurrentPitch({
        id: Date.now().toString(),
        benefits: [],
        features: [],
        uniqueValue: '',
      });
      setPhase('pitch');
    }
  };

  const handleDeletePitch = (id: string) => {
    setPitches(pitches.filter(pitch => pitch.id !== id));
  };

  const handleStartOver = () => {
    setPhase('setup');
    setTopic('');
    setCurrentIdea('');
    setTimerActive(false);
    setTimeLeft(180);
    setPitches([]);
    setCurrentPitch({
      id: Date.now().toString(),
      benefits: [],
      features: [],
      uniqueValue: '',
    });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          スピードストーミング（3-2-1 Pitch）
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          短時間でアイデアを出し、洗練させるための手法です。
        </Typography>

        {phase === 'setup' && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              テーマを設定
            </Typography>
            <TextField
              fullWidth
              label="アイデアを出すテーマ"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              variant="outlined"
              margin="normal"
              placeholder="例: 新しい学習アプリのアイデア"
            />
            <Button
              variant="contained"
              onClick={handleStartIdeation}
              sx={{ mt: 2 }}
              disabled={!topic}
              fullWidth
            >
              アイデア出しを開始する（3分間）
            </Button>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              * このゲームでは、3分間でアイデアを出し、2分間でそれを洗練させ、最終的に「3-2-1ピッチ」を作成します。
            </Typography>
          </Box>
        )}

        {phase === 'ideation' && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                アイデア出し: {formatTime(timeLeft)}
              </Typography>
              <Box>
                {!timerActive ? (
                  <IconButton color="primary" onClick={handleStartTimer}>
                    <PlayArrowIcon />
                  </IconButton>
                ) : (
                  <IconButton color="primary" onClick={handlePauseTimer}>
                    <PauseIcon />
                  </IconButton>
                )}
                <IconButton color="secondary" onClick={handleResetTimer}>
                  <RestartAltIcon />
                </IconButton>
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={(1 - timeLeft / 180) * 100} sx={{ mb: 3 }} />
            
            <Typography variant="body1" gutterBottom>
              テーマ: {topic}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              3分間で、できるだけ多くのアイデアを出してください。質より量を重視しましょう。
            </Typography>
            
            <TextField
              fullWidth
              label="アイデア"
              value={currentIdea}
              onChange={(e) => setCurrentIdea(e.target.value)}
              variant="outlined"
              margin="normal"
              placeholder="アイデアを入力..."
            />
            <Button
              variant="contained"
              onClick={handleAddIdea}
              sx={{ mt: 1 }}
              disabled={!currentIdea}
            >
              追加
            </Button>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={handleStartOver}>
                最初からやり直す
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setTimerActive(false);
                  setPhase('refinement');
                  setTimeLeft(120);
                }}
              >
                次のステップへ
              </Button>
            </Box>
          </Box>
        )}

        {phase === 'refinement' && (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                アイデアの洗練: {formatTime(timeLeft)}
              </Typography>
              <Box>
                {!timerActive ? (
                  <IconButton color="primary" onClick={handleStartTimer}>
                    <PlayArrowIcon />
                  </IconButton>
                ) : (
                  <IconButton color="primary" onClick={handlePauseTimer}>
                    <PauseIcon />
                  </IconButton>
                )}
                <IconButton color="secondary" onClick={handleResetTimer}>
                  <RestartAltIcon />
                </IconButton>
              </Box>
            </Box>
            <LinearProgress variant="determinate" value={(1 - timeLeft / 120) * 100} sx={{ mb: 3 }} />
            
            <Typography variant="body1" gutterBottom>
              テーマ: {topic}
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              2分間で、最も良いアイデアを選び、3-2-1ピッチの形式に洗練させましょう。
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  3つのメリット
                </Typography>
                <TextField
                  fullWidth
                  label="メリット"
                  value={benefit}
                  onChange={(e) => setBenefit(e.target.value)}
                  variant="outlined"
                  margin="normal"
                  placeholder="このアイデアのメリット"
                  disabled={currentPitch.benefits.length >= 3}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddBenefit}
                  sx={{ mt: 1 }}
                  disabled={!benefit || currentPitch.benefits.length >= 3}
                  fullWidth
                >
                  追加 ({currentPitch.benefits.length}/3)
                </Button>
                {currentPitch.benefits.map((b, index) => (
                  <Typography key={index} variant="body2" sx={{ mt: 1 }}>
                    {index + 1}. {b}
                  </Typography>
                ))}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  2つの特徴
                </Typography>
                <TextField
                  fullWidth
                  label="特徴"
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  variant="outlined"
                  margin="normal"
                  placeholder="このアイデアの特徴"
                  disabled={currentPitch.features.length >= 2}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddFeature}
                  sx={{ mt: 1 }}
                  disabled={!feature || currentPitch.features.length >= 2}
                  fullWidth
                >
                  追加 ({currentPitch.features.length}/2)
                </Button>
                {currentPitch.features.map((f, index) => (
                  <Typography key={index} variant="body2" sx={{ mt: 1 }}>
                    {index + 1}. {f}
                  </Typography>
                ))}
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle1" gutterBottom>
                  1つのユニークな価値
                </Typography>
                <TextField
                  fullWidth
                  label="ユニークな価値"
                  value={currentPitch.uniqueValue}
                  onChange={(e) => setCurrentPitch({...currentPitch, uniqueValue: e.target.value})}
                  variant="outlined"
                  margin="normal"
                  placeholder="このアイデアの最も重要な価値"
                />
              </Grid>
            </Grid>
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={handleStartOver}>
                最初からやり直す
              </Button>
              <Button
                variant="contained"
                onClick={handleFinishRefinement}
                disabled={
                  currentPitch.benefits.length < 3 ||
                  currentPitch.features.length < 2 ||
                  !currentPitch.uniqueValue
                }
              >
                ピッチを完成させる
              </Button>
            </Box>
          </Box>
        )}

        {phase === 'pitch' && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              完成した3-2-1ピッチ
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              テーマ: {topic}
            </Typography>
            
            {pitches.map((pitch) => (
              <Card key={pitch.id} variant="outlined" sx={{ mb: 3 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Typography variant="h6" gutterBottom>
                      3-2-1ピッチ
                    </Typography>
                    <IconButton color="error" onClick={() => handleDeletePitch(pitch.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    3つのメリット:
                  </Typography>
                  <ul>
                    {pitch.benefits.map((benefit, index) => (
                      <li key={index}>
                        <Typography variant="body2">{benefit}</Typography>
                      </li>
                    ))}
                  </ul>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    2つの特徴:
                  </Typography>
                  <ul>
                    {pitch.features.map((feature, index) => (
                      <li key={index}>
                        <Typography variant="body2">{feature}</Typography>
                      </li>
                    ))}
                  </ul>
                  
                  <Typography variant="subtitle1" gutterBottom>
                    1つのユニークな価値:
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {pitch.uniqueValue}
                  </Typography>
                </CardContent>
              </Card>
            ))}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={handleStartOver}>
                新しいピッチを作成する
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default SpeedStormingGame;