import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Card, CardContent, Chip, Grid } from '@mui/material';

interface HMWItem {
  id: string;
  challenge: string;
  hmwQuestion: string;
}

const HMWGame: React.FC = () => {
  const [challenge, setChallenge] = useState('');
  const [hmwQuestion, setHmwQuestion] = useState('');
  const [hmwItems, setHmwItems] = useState<HMWItem[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const handleAddHMW = () => {
    if (hmwQuestion.trim()) {
      const newItem: HMWItem = {
        id: Date.now().toString(),
        challenge,
        hmwQuestion,
      };
      setHmwItems([...hmwItems, newItem]);
      setHmwQuestion('');
    }
  };

  const handleDeleteHMW = (id: string) => {
    setHmwItems(hmwItems.filter(item => item.id !== id));
  };

  const examples = [
    { challenge: '顧客の待ち時間が長い', hmw: 'どうすれば顧客の待ち時間を楽しい経験に変えられるだろうか？' },
    { challenge: '学生の授業への集中力が続かない', hmw: 'どうすれば学生が自ら学びに没頭できる環境を作れるだろうか？' },
    { challenge: '社内のコミュニケーション不足', hmw: 'どうすれば部門を超えた自発的な対話を促進できるだろうか？' },
  ];

  const tips = [
    '問題をポジティブな可能性として再構築する',
    '「どうすれば〜できるだろうか？」の形式を使う',
    '広すぎず狭すぎない範囲で問いを立てる',
    '複数の視点から問いを考える',
    '行動を促す言葉を使う',
  ];

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          How Might We（HMW）フレーム
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          課題を解決可能な問いに変換するフレームワークです。
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            1. 課題を特定する
          </Typography>
          <TextField
            fullWidth
            label="取り組みたい課題"
            value={challenge}
            onChange={(e) => setChallenge(e.target.value)}
            variant="outlined"
            margin="normal"
            placeholder="例: 顧客の待ち時間が長い"
          />

          <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
            2. How Might We の問いに変換する
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            「どうすれば〜できるだろうか？」という形式で問いを立てます。
          </Typography>
          <TextField
            fullWidth
            label="HMW問い"
            value={hmwQuestion}
            onChange={(e) => setHmwQuestion(e.target.value)}
            variant="outlined"
            margin="normal"
            placeholder="例: どうすれば顧客の待ち時間を楽しい経験に変えられるだろうか？"
          />
          <Button
            variant="contained"
            onClick={handleAddHMW}
            sx={{ mt: 2 }}
            disabled={!challenge || !hmwQuestion}
          >
            問いを追加する
          </Button>

          {hmwItems.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography variant="h6" gutterBottom>
                作成したHMW問い
              </Typography>
              <Grid container spacing={2}>
                {hmwItems.map((item) => (
                  <Grid item xs={12} key={item.id}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="body2" color="text.secondary">
                          課題:
                        </Typography>
                        <Typography variant="body1" paragraph>
                          {item.challenge}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          HMW問い:
                        </Typography>
                        <Typography variant="body1">
                          {item.hmwQuestion}
                        </Typography>
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleDeleteHMW(item.id)}
                          >
                            削除
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              HMW作成のコツ
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {tips.map((tip, index) => (
                <Chip
                  key={index}
                  label={tip}
                  sx={{ m: 0.5 }}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Paper>
          </Box>

          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              例
            </Typography>
            <Grid container spacing={2}>
              {examples.map((example, index) => (
                <Grid item xs={12} md={4} key={index}>
                  <Card variant="outlined" sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        課題:
                      </Typography>
                      <Typography variant="body1" paragraph>
                        {example.challenge}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        HMW問い:
                      </Typography>
                      <Typography variant="body1">
                        {example.hmw}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default HMWGame; 