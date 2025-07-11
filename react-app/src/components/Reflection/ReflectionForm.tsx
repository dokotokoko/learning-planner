import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  FormLabel,
  Rating,
  Chip,
  Button,
  Grid,
  LinearProgress,
  Collapse,
  Alert,
} from '@mui/material';
import {
  SentimentVeryDissatisfied,
  SentimentDissatisfied,
  SentimentNeutral,
  SentimentSatisfied,
  SentimentVerySatisfied,
  TrendingUp,
  Psychology,
  ExpandMore,
  ExpandLess,
  AutoAwesome,
} from '@mui/icons-material';

// 振り返りデータの型定義
export interface ReflectionData {
  enjoyment: number;
  engagement: number;
  difficulty: number;
  understanding: number;
  motivation: number;
  insights: string;
  challenges: string;
  nextGoals: string;
  emotions: string[];
  timeSpent: number;
  collaborationRating?: number;
}

export interface ReflectionFormProps {
  title: string;
  subtitle?: string;
  context: 'quest' | 'step' | 'daily';
  onSubmit: (data: ReflectionData) => void;
  onCancel?: () => void;
  initialData?: Partial<ReflectionData>;
  isSubmitting?: boolean;
  showAdvanced?: boolean;
}

const emotionOptions = [
  '嬉しい', '楽しい', '達成感', '驚き', '興味深い', 
  '困った', '焦った', '不安', '混乱', '疲れた',
  '集中', 'リラックス', 'ワクワク', '自信', '成長感'
];

const ReflectionForm: React.FC<ReflectionFormProps> = ({
  title,
  subtitle,
  context,
  onSubmit,
  onCancel,
  initialData = {},
  isSubmitting = false,
  showAdvanced = false,
}) => {
  const [data, setData] = useState<ReflectionData>({
    enjoyment: 3,
    engagement: 3,
    difficulty: 3,
    understanding: 3,
    motivation: 3,
    insights: '',
    challenges: '',
    nextGoals: '',
    emotions: [],
    timeSpent: 30,
    collaborationRating: 3,
    ...initialData,
  });

  const [showAdvancedFields, setShowAdvancedFields] = useState(showAdvanced);
  const [completionScore, setCompletionScore] = useState(0);

  // 完成度を計算
  React.useEffect(() => {
    const requiredFields = [
      data.insights.trim(),
      data.emotions.length > 0,
      data.enjoyment,
      data.engagement,
    ];
    
    const optionalFields = [
      data.challenges.trim(),
      data.nextGoals.trim(),
      data.timeSpent > 0,
    ];

    const requiredScore = requiredFields.filter(Boolean).length / requiredFields.length * 70;
    const optionalScore = optionalFields.filter(Boolean).length / optionalFields.length * 30;
    
    setCompletionScore(Math.round(requiredScore + optionalScore));
  }, [data]);

  const handleEmotionToggle = (emotion: string) => {
    if (data.emotions.includes(emotion)) {
      setData(prev => ({
        ...prev,
        emotions: prev.emotions.filter(e => e !== emotion)
      }));
    } else {
      setData(prev => ({
        ...prev,
        emotions: [...prev.emotions, emotion]
      }));
    }
  };

  const handleSubmit = () => {
    onSubmit(data);
  };

  const getEnjoymentIcon = (value: number) => {
    if (value <= 1) return <SentimentVeryDissatisfied />;
    if (value <= 2) return <SentimentDissatisfied />;
    if (value <= 3) return <SentimentNeutral />;
    if (value <= 4) return <SentimentSatisfied />;
    return <SentimentVerySatisfied />;
  };

  return (
    <Box>
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        
        {/* 完成度プログレス */}
        <Box sx={{ mt: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              振り返り完成度
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {completionScore}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={completionScore} 
            sx={{ 
              height: 6, 
              borderRadius: 3,
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
              }
            }}
          />
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* 基本的な評価 */}
        <Grid item xs={12} sm={6}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getEnjoymentIcon(data.enjoyment)}
                <Typography>楽しさはどうでしたか？</Typography>
              </Box>
            </FormLabel>
            <Rating
              value={data.enjoyment}
              onChange={(_, newValue) => {
                setData(prev => ({ ...prev, enjoyment: newValue || 3 }));
              }}
              max={5}
              sx={{ mt: 1 }}
            />
          </FormControl>
        </Grid>

        <Grid item xs={12} sm={6}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUp />
                <Typography>どのくらい取り組めましたか？</Typography>
              </Box>
            </FormLabel>
            <Rating
              value={data.engagement}
              onChange={(_, newValue) => {
                setData(prev => ({ ...prev, engagement: newValue || 3 }));
              }}
              max={5}
              sx={{ mt: 1 }}
            />
          </FormControl>
        </Grid>

        {/* 感情タグ */}
        <Grid item xs={12}>
          <FormControl component="fieldset" fullWidth>
            <FormLabel component="legend">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Psychology />
                <Typography>どんな気持ちでしたか？（複数選択可）</Typography>
              </Box>
            </FormLabel>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {emotionOptions.map((emotion) => (
                <Chip
                  key={emotion}
                  label={emotion}
                  onClick={() => handleEmotionToggle(emotion)}
                  color={data.emotions.includes(emotion) ? 'primary' : 'default'}
                  variant={data.emotions.includes(emotion) ? 'filled' : 'outlined'}
                  size="small"
                />
              ))}
            </Box>
          </FormControl>
        </Grid>

        {/* 気づき・学び */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="今日の気づき・学んだこと"
            multiline
            rows={3}
            value={data.insights}
            onChange={(e) => setData(prev => ({ ...prev, insights: e.target.value }))}
            placeholder="どんな発見や学びがありましたか？新しく分かったことや面白いと思ったことを書いてください..."
            variant="outlined"
            helperText="* 必須項目"
          />
        </Grid>

        {/* 詳細フィールド */}
        <Grid item xs={12}>
          <Button
            onClick={() => setShowAdvancedFields(!showAdvancedFields)}
            startIcon={showAdvancedFields ? <ExpandLess /> : <ExpandMore />}
            sx={{ mb: 2 }}
          >
            詳細な振り返り
          </Button>
          
          <Collapse in={showAdvancedFields}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="困ったこと・課題"
                  multiline
                  rows={2}
                  value={data.challenges}
                  onChange={(e) => setData(prev => ({ ...prev, challenges: e.target.value }))}
                  placeholder="うまくいかなかったことや、もっと改善したいことがあれば書いてください..."
                  variant="outlined"
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="次にやりたいこと・目標"
                  multiline
                  rows={2}
                  value={data.nextGoals}
                  onChange={(e) => setData(prev => ({ ...prev, nextGoals: e.target.value }))}
                  placeholder="今回の経験を活かして、次に挑戦してみたいことはありますか？"
                  variant="outlined"
                />
              </Grid>
            </Grid>
          </Collapse>
        </Grid>

        {/* AIからのアドバイス */}
        {completionScore >= 80 && (
          <Grid item xs={12}>
            <Alert 
              severity="info" 
              icon={<AutoAwesome />}
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>✨ AIアシスタントからのメッセージ</strong><br />
                とても充実した振り返りですね！次は{data.emotions.includes('楽しい') ? '創造的な' : '新しい視点での'}アプローチにも挑戦してみましょう！
              </Typography>
            </Alert>
          </Grid>
        )}

        {/* 送信ボタン */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            {onCancel && (
              <Button onClick={onCancel} disabled={isSubmitting}>
                キャンセル
              </Button>
            )}
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={isSubmitting || completionScore < 50}
              sx={{
                py: 1.5,
                px: 4,
                fontSize: '1.1rem',
                background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                color: 'white',
                '&:hover': {
                  background: 'linear-gradient(45deg, #52BAFF, #00406B)',
                },
              }}
            >
              {isSubmitting ? '送信中...' : '振り返りを送信'}
            </Button>
          </Box>
          {completionScore < 50 && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              必須項目を入力してください（完成度50%以上で送信可能）
            </Typography>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReflectionForm; 