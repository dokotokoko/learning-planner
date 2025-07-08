import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Grid, Card, CardContent, CardActions, IconButton, Chip, Avatar } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';

interface IdeaItem {
  id: string;
  title: string;
  description: string;
  author: string;
  votes: number;
}

const GalleryWalkGame: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [newIdea, setNewIdea] = useState({
    title: '',
    description: '',
    author: '',
  });
  const [votingMode, setVotingMode] = useState(false);
  const [votesRemaining, setVotesRemaining] = useState(3);
  const [votingComplete, setVotingComplete] = useState(false);

  const handleSetupComplete = () => {
    if (topic) {
      setIsSetupComplete(true);
    }
  };

  const handleAddIdea = () => {
    if (newIdea.title && newIdea.description && newIdea.author) {
      const idea: IdeaItem = {
        id: Date.now().toString(),
        title: newIdea.title,
        description: newIdea.description,
        author: newIdea.author,
        votes: 0,
      };
      setIdeas([...ideas, idea]);
      setNewIdea({
        title: '',
        description: '',
        author: '',
      });
    }
  };

  const handleDeleteIdea = (id: string) => {
    setIdeas(ideas.filter(idea => idea.id !== id));
  };

  const handleStartVoting = () => {
    setVotingMode(true);
    setVotesRemaining(3);
  };

  const handleVote = (id: string) => {
    if (votesRemaining > 0) {
      const updatedIdeas = ideas.map(idea => {
        if (idea.id === id) {
          return { ...idea, votes: idea.votes + 1 };
        }
        return idea;
      });
      setIdeas(updatedIdeas);
      setVotesRemaining(votesRemaining - 1);
    }
  };

  const handleCompleteVoting = () => {
    setVotingComplete(true);
  };

  const handleReset = () => {
    setTopic('');
    setIsSetupComplete(false);
    setIdeas([]);
    setNewIdea({
      title: '',
      description: '',
      author: '',
    });
    setVotingMode(false);
    setVotesRemaining(3);
    setVotingComplete(false);
  };

  const sortedIdeas = [...ideas].sort((a, b) => b.votes - a.votes);

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          ギャラリーウォーク＋ドット投票
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          アイデアを共有し、評価するための手法です。
        </Typography>

        {!isSetupComplete ? (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              テーマを設定
            </Typography>
            <TextField
              fullWidth
              label="ギャラリーウォークのテーマ"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              variant="outlined"
              margin="normal"
              placeholder="例: 学校の課題解決アイデア"
            />
            <Button
              variant="contained"
              onClick={handleSetupComplete}
              sx={{ mt: 2 }}
              disabled={!topic}
              fullWidth
            >
              テーマを設定してスタート
            </Button>
          </Box>
        ) : (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              テーマ: {topic}
            </Typography>
            
            {!votingMode ? (
              <>
                <Paper variant="outlined" sx={{ p: 3, mt: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    新しいアイデアを追加
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="アイデアのタイトル"
                        value={newIdea.title}
                        onChange={(e) => setNewIdea({...newIdea, title: e.target.value})}
                        variant="outlined"
                        margin="normal"
                        placeholder="簡潔なタイトル"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="アイデアの説明"
                        value={newIdea.description}
                        onChange={(e) => setNewIdea({...newIdea, description: e.target.value})}
                        variant="outlined"
                        margin="normal"
                        placeholder="アイデアの詳細を記述"
                        multiline
                        rows={3}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="作成者名"
                        value={newIdea.author}
                        onChange={(e) => setNewIdea({...newIdea, author: e.target.value})}
                        variant="outlined"
                        margin="normal"
                        placeholder="あなたの名前"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddIdea}
                        disabled={!newIdea.title || !newIdea.description || !newIdea.author}
                        fullWidth
                      >
                        アイデアを追加
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                <Typography variant="h6" sx={{ mt: 4, mb: 2 }}>
                  追加されたアイデア ({ideas.length})
                </Typography>
                
                <Grid container spacing={3}>
                  {ideas.map((idea) => (
                    <Grid item xs={12} md={6} key={idea.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {idea.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {idea.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            作成者: {idea.author}
                          </Typography>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'flex-end' }}>
                          <IconButton 
                            color="error" 
                            onClick={() => handleDeleteIdea(idea.id)}
                            size="small"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" onClick={handleReset}>
                    最初からやり直す
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleStartVoting}
                    disabled={ideas.length < 2}
                  >
                    投票を開始する
                  </Button>
                </Box>
              </>
            ) : !votingComplete ? (
              <>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    投票モード
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    残りの投票数: <Chip label={votesRemaining} color="primary" size="small" />
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    気に入ったアイデアに投票してください。各アイデアに複数投票することもできます。
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  {ideas.map((idea) => (
                    <Grid item xs={12} md={6} key={idea.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            {idea.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {idea.description}
                          </Typography>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              作成者: {idea.author}
                            </Typography>
                            <Chip 
                              icon={<ThumbUpIcon fontSize="small" />} 
                              label={idea.votes} 
                              size="small"
                              color={idea.votes > 0 ? "primary" : "default"}
                            />
                          </Box>
                        </CardContent>
                        <CardActions sx={{ justifyContent: 'center' }}>
                          <Button
                            variant="outlined"
                            startIcon={<ThumbUpIcon />}
                            onClick={() => handleVote(idea.id)}
                            disabled={votesRemaining <= 0}
                            fullWidth
                          >
                            投票する
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                  <Button variant="outlined" onClick={() => setVotingMode(false)}>
                    アイデア追加に戻る
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleCompleteVoting}
                    disabled={votesRemaining > 0}
                  >
                    投票を完了する
                  </Button>
                </Box>
              </>
            ) : (
              <>
                <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    投票結果
                  </Typography>
                  <Typography variant="body2">
                    投票が完了しました。以下が投票結果です。
                  </Typography>
                </Box>
                
                <Grid container spacing={3}>
                  {sortedIdeas.map((idea, index) => (
                    <Grid item xs={12} key={idea.id}>
                      <Card 
                        variant="outlined"
                        sx={{ 
                          bgcolor: index === 0 ? 'rgba(76, 175, 80, 0.1)' : 'background.paper',
                          borderColor: index === 0 ? 'success.main' : 'divider'
                        }}
                      >
                        <CardContent>
                          <Grid container spacing={2} alignItems="center">
                            <Grid item>
                              <Avatar 
                                sx={{ 
                                  bgcolor: index === 0 ? 'success.main' : 
                                          index === 1 ? 'primary.main' : 
                                          index === 2 ? 'secondary.main' : 'grey.500'
                                }}
                              >
                                {index + 1}
                              </Avatar>
                            </Grid>
                            <Grid item xs>
                              <Typography variant="h6">
                                {idea.title}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" paragraph>
                                {idea.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                作成者: {idea.author}
                              </Typography>
                            </Grid>
                            <Grid item>
                              <Chip 
                                icon={<ThumbUpIcon fontSize="small" />} 
                                label={idea.votes} 
                                color={
                                  index === 0 ? "success" : 
                                  index === 1 ? "primary" : 
                                  index === 2 ? "secondary" : "default"
                                }
                              />
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                
                <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                  <Button variant="contained" onClick={handleReset}>
                    新しいギャラリーウォークを始める
                  </Button>
                </Box>
              </>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default GalleryWalkGame; 