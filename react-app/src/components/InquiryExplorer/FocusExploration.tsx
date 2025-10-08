import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  Chip,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  Divider,
  LinearProgress,
  Fade,
} from '@mui/material';
import {
  CenterFocusStrong as FocusIcon,
  Lightbulb as IdeaIcon,
  QuestionAnswer as QuestionIcon,
  Psychology as ThinkIcon,
  Timeline as PathIcon,
} from '@mui/icons-material';
import { BubbleNode, QuestionSeed } from './types';

interface FocusExplorationProps {
  bubbleNodes: BubbleNode[];
  centerKeywordId: string | null;
  onSelectCenter: (nodeId: string) => void;
  questionSeeds: QuestionSeed[];
  onAddQuestionSeed: (seed: QuestionSeed) => void;
  onNext: () => void;
  aiMessages?: string[];
}

const FocusExploration: React.FC<FocusExplorationProps> = ({
  bubbleNodes,
  centerKeywordId,
  onSelectCenter,
  questionSeeds,
  onAddQuestionSeed,
  onNext,
  aiMessages = [],
}) => {
  const [selectedKeyword, setSelectedKeyword] = useState<BubbleNode | null>(null);
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (centerKeywordId) {
      const node = bubbleNodes.find(n => n.id === centerKeywordId);
      setSelectedKeyword(node || null);
      
      // プログレスを更新
      const totalSteps = 3; // 選択、対話、問いの種
      const currentStep = questionSeeds.length > 0 ? 3 : (centerKeywordId ? 2 : 1);
      setProgress((currentStep / totalSteps) * 100);
    }
  }, [centerKeywordId, bubbleNodes, questionSeeds]);

  const handleSelectKeyword = (nodeId: string) => {
    onSelectCenter(nodeId);
    const node = bubbleNodes.find(n => n.id === nodeId);
    setSelectedKeyword(node || null);
  };

  // キーワードのグルーピング（頻度や関連性で整理）
  const groupKeywords = () => {
    const groups: { [key: string]: BubbleNode[] } = {
      recent: [],
      popular: [],
      unique: [],
    };
    
    const now = Date.now();
    bubbleNodes.forEach(node => {
      const age = now - new Date(node.createdAt).getTime();
      if (age < 60000) { // 1分以内
        groups.recent.push(node);
      } else if (bubbleNodes.filter(n => n.text.includes(node.text.substring(0, 3))).length > 1) {
        groups.popular.push(node);
      } else {
        groups.unique.push(node);
      }
    });
    
    return groups;
  };

  const keywordGroups = groupKeywords();

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Typography variant="h5" gutterBottom>
          <FocusIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          中心となるテーマを選ぶ
        </Typography>
        <Typography variant="body2" color="text.secondary">
          集めたキーワードから、今日深めたい1つを選んでください。
          選んだキーワードを起点に、AIと対話しながら探究の問いを見つけていきます。
        </Typography>
        
        <LinearProgress 
          variant="determinate" 
          value={progress} 
          sx={{ mt: 2, height: 8, borderRadius: 4 }} 
        />
      </Paper>

      {/* 選択済みのキーワード表示 */}
      {selectedKeyword && (
        <Fade in>
          <Alert 
            severity="success" 
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => handleSelectKeyword('')}>
                変更
              </Button>
            }
          >
            <Typography variant="h6" gutterBottom>
              選択したテーマ: 「{selectedKeyword.text}」
            </Typography>
            <Typography variant="body2">
              右のAIと対話して、このテーマについて深めていきましょう。
              なぜ興味を持ったのか、どんな経験があるか、話してみてください。
            </Typography>
          </Alert>
        </Fade>
      )}

      {/* キーワード選択エリア */}
      {!selectedKeyword && (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* 最近追加したキーワード */}
          {keywordGroups.recent.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="primary" gutterBottom>
                <PathIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                最近追加したキーワード
              </Typography>
              <Grid container spacing={2}>
                {keywordGroups.recent.map(node => (
                  <Grid item xs={12} sm={6} md={4} key={node.id}>
                    <Card 
                      sx={{ 
                        transition: 'all 0.3s',
                        '&:hover': { 
                          transform: 'translateY(-4px)',
                          boxShadow: 3 
                        },
                        border: node.id === centerKeywordId ? 2 : 0,
                        borderColor: 'primary.main',
                      }}
                    >
                      <CardActionArea onClick={() => handleSelectKeyword(node.id)}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {node.text}
                          </Typography>
                          <Chip 
                            label="NEW" 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* 関連性の高いキーワード */}
          {keywordGroups.popular.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="secondary" gutterBottom>
                <ThinkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                関連性の高いキーワード
              </Typography>
              <Grid container spacing={2}>
                {keywordGroups.popular.map(node => (
                  <Grid item xs={12} sm={6} md={4} key={node.id}>
                    <Card 
                      sx={{ 
                        transition: 'all 0.3s',
                        '&:hover': { 
                          transform: 'translateY(-4px)',
                          boxShadow: 3 
                        },
                        border: node.id === centerKeywordId ? 2 : 0,
                        borderColor: 'primary.main',
                      }}
                    >
                      <CardActionArea onClick={() => handleSelectKeyword(node.id)}>
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {node.text}
                          </Typography>
                          <Chip 
                            label="関連" 
                            size="small" 
                            color="secondary" 
                            variant="outlined"
                          />
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* その他のキーワード */}
          {keywordGroups.unique.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                <IdeaIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                その他のキーワード
              </Typography>
              <Grid container spacing={2}>
                {keywordGroups.unique.map(node => (
                  <Grid item xs={12} sm={6} md={4} key={node.id}>
                    <Card 
                      sx={{ 
                        transition: 'all 0.3s',
                        '&:hover': { 
                          transform: 'translateY(-4px)',
                          boxShadow: 3 
                        },
                        border: node.id === centerKeywordId ? 2 : 0,
                        borderColor: 'primary.main',
                      }}
                    >
                      <CardActionArea onClick={() => handleSelectKeyword(node.id)}>
                        <CardContent>
                          <Typography variant="h6">
                            {node.text}
                          </Typography>
                        </CardContent>
                      </CardActionArea>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}
        </Box>
      )}

      {/* 問いの種リスト */}
      {selectedKeyword && questionSeeds.length > 0 && (
        <Paper sx={{ p: 2, mt: 2, maxHeight: 300, overflow: 'auto' }}>
          <Typography variant="h6" gutterBottom>
            <QuestionIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            発見した問いの種
          </Typography>
          <List>
            {questionSeeds.map((seed, index) => (
              <React.Fragment key={seed.id}>
                <ListItem>
                  <ListItemIcon>
                    <IdeaIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={seed.content}
                    secondary={
                      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
                        <Chip label={seed.sourceKeyword} size="small" />
                        <Chip label={seed.category} size="small" variant="outlined" />
                      </Box>
                    }
                  />
                </ListItem>
                {index < questionSeeds.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* ナビゲーション */}
      {selectedKeyword && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            size="large"
            onClick={onNext}
            disabled={questionSeeds.length === 0}
            endIcon={<PathIcon />}
          >
            問いを育てる
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default FocusExploration;