import React, { useState, useRef, useEffect } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Grid, Slider, Card, CardContent, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

interface IdeaItem {
  id: string;
  text: string;
  impact: number;
  feasibility: number;
  x: number;
  y: number;
}

const ImpactFeasibilityGame: React.FC = () => {
  const [ideaText, setIdeaText] = useState('');
  const [impact, setImpact] = useState<number>(5);
  const [feasibility, setFeasibility] = useState<number>(5);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<string | null>(null);
  const matrixRef = useRef<HTMLDivElement>(null);

  const handleAddIdea = () => {
    if (ideaText.trim()) {
      const newIdea: IdeaItem = {
        id: Date.now().toString(),
        text: ideaText,
        impact,
        feasibility,
        x: feasibility * 10, // スケール調整
        y: 100 - impact * 10, // Y軸は逆
      };
      setIdeas([...ideas, newIdea]);
      setIdeaText('');
      setImpact(5);
      setFeasibility(5);
    }
  };

  const handleDeleteIdea = (id: string) => {
    setIdeas(ideas.filter(idea => idea.id !== id));
    if (selectedIdea === id) {
      setSelectedIdea(null);
    }
  };

  const handleSelectIdea = (id: string) => {
    setSelectedIdea(id === selectedIdea ? null : id);
  };

  const getQuadrantText = (impact: number, feasibility: number) => {
    if (impact >= 5 && feasibility >= 5) {
      return '「今すぐ実行」: 高インパクト・高実現可能性';
    } else if (impact >= 5 && feasibility < 5) {
      return '「計画的に取り組む」: 高インパクト・低実現可能性';
    } else if (impact < 5 && feasibility >= 5) {
      return '「簡単な勝利」: 低インパクト・高実現可能性';
    } else {
      return '「見送る」: 低インパクト・低実現可能性';
    }
  };

  const getQuadrantColor = (impact: number, feasibility: number) => {
    if (impact >= 5 && feasibility >= 5) {
      return 'rgba(76, 175, 80, 0.1)'; // 緑
    } else if (impact >= 5 && feasibility < 5) {
      return 'rgba(255, 152, 0, 0.1)'; // オレンジ
    } else if (impact < 5 && feasibility >= 5) {
      return 'rgba(33, 150, 243, 0.1)'; // 青
    } else {
      return 'rgba(158, 158, 158, 0.1)'; // グレー
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          インパクト × 実現可能性マトリクス
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          アイデアの優先順位づけのためのマトリクスです。
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 2 }}>
              <Typography variant="h6" gutterBottom>
                アイデアを追加
              </Typography>
              <TextField
                fullWidth
                label="アイデア"
                value={ideaText}
                onChange={(e) => setIdeaText(e.target.value)}
                variant="outlined"
                margin="normal"
                placeholder="例: オンラインカスタマーサポート"
              />
              
              <Typography gutterBottom>インパクト (1-10)</Typography>
              <Slider
                value={impact}
                onChange={(_, newValue) => setImpact(newValue as number)}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
              
              <Typography gutterBottom>実現可能性 (1-10)</Typography>
              <Slider
                value={feasibility}
                onChange={(_, newValue) => setFeasibility(newValue as number)}
                min={1}
                max={10}
                step={1}
                marks
                valueLabelDisplay="auto"
              />
              
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddIdea}
                sx={{ mt: 2 }}
                disabled={!ideaText}
                fullWidth
              >
                追加
              </Button>

              {selectedIdea && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    選択中のアイデア:
                  </Typography>
                  <Typography>
                    {ideas.find(idea => idea.id === selectedIdea)?.text}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {getQuadrantText(
                      ideas.find(idea => idea.id === selectedIdea)?.impact || 0,
                      ideas.find(idea => idea.id === selectedIdea)?.feasibility || 0
                    )}
                  </Typography>
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom>
                追加したアイデア
              </Typography>
              {ideas.map((idea) => (
                <Card 
                  key={idea.id} 
                  variant="outlined" 
                  sx={{ 
                    mb: 1, 
                    bgcolor: selectedIdea === idea.id ? 'primary.light' : 'background.paper',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSelectIdea(idea.id)}
                >
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" noWrap sx={{ maxWidth: '80%' }}>
                        {idea.text}
                      </Typography>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteIdea(idea.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={8}>
            <Box
              ref={matrixRef}
              sx={{
                position: 'relative',
                width: '100%',
                height: 400,
                border: '1px solid #ccc',
                borderRadius: 1,
                overflow: 'hidden',
              }}
            >
              {/* マトリクスの4象限 */}
              <Box sx={{ position: 'absolute', top: 0, left: '50%', width: '50%', height: '50%', bgcolor: 'rgba(76, 175, 80, 0.1)', zIndex: 0 }}>
                <Typography sx={{ p: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  今すぐ実行
                </Typography>
              </Box>
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '50%', height: '50%', bgcolor: 'rgba(255, 152, 0, 0.1)', zIndex: 0 }}>
                <Typography sx={{ p: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  計画的に取り組む
                </Typography>
              </Box>
              <Box sx={{ position: 'absolute', top: '50%', left: '50%', width: '50%', height: '50%', bgcolor: 'rgba(33, 150, 243, 0.1)', zIndex: 0 }}>
                <Typography sx={{ p: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  簡単な勝利
                </Typography>
              </Box>
              <Box sx={{ position: 'absolute', top: '50%', left: 0, width: '50%', height: '50%', bgcolor: 'rgba(158, 158, 158, 0.1)', zIndex: 0 }}>
                <Typography sx={{ p: 1, fontSize: '0.75rem', color: 'text.secondary' }}>
                  見送る
                </Typography>
              </Box>

              {/* X軸とY軸のラベル */}
              <Box sx={{ position: 'absolute', bottom: 0, left: 0, width: '100%', textAlign: 'center' }}>
                <Typography variant="body2">実現可能性 →</Typography>
              </Box>
              <Box sx={{ position: 'absolute', top: '50%', left: -30, transform: 'rotate(-90deg)', transformOrigin: 'center right' }}>
                <Typography variant="body2">インパクト →</Typography>
              </Box>

              {/* アイデアのドット */}
              {ideas.map((idea) => (
                <Box
                  key={idea.id}
                  sx={{
                    position: 'absolute',
                    left: `${idea.x}%`,
                    top: `${idea.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: selectedIdea === idea.id ? 'primary.main' : 'secondary.main',
                    border: '2px solid white',
                    zIndex: 1,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      transform: 'translate(-50%, -50%) scale(1.2)',
                    },
                  }}
                  onClick={() => handleSelectIdea(idea.id)}
                />
              ))}
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                * マトリクスの各象限をクリックすると、そのエリアの意味が表示されます。
              </Typography>
              <Typography variant="body2" color="text.secondary">
                * アイデアの点をクリックすると、そのアイデアの詳細が表示されます。
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  );
};

export default ImpactFeasibilityGame; 