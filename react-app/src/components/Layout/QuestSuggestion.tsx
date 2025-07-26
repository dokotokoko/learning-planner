import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Button,
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  LinearProgress,
  Fade,
} from '@mui/material';
import {
  EmojiEvents,
  LocalFireDepartment,
  Explore,
  Star,
  StarBorder,
  ExpandMore,
  ExpandLess,
  Lightbulb,
  Build,
  Science,
  Group,
} from '@mui/icons-material';
import { questApi, Quest, UserQuest, QuestStats } from '../../lib/api';
import { useNavigate } from 'react-router-dom';

// アイコンマッピング（簡略版）
const iconMap: Record<string, React.ReactNode> = {
  'Explore': <Explore sx={{ fontSize: 20 }} />,
  'Build': <Build sx={{ fontSize: 20 }} />,
  'Science': <Science sx={{ fontSize: 20 }} />,
  'Group': <Group sx={{ fontSize: 20 }} />,
  'Lightbulb': <Lightbulb sx={{ fontSize: 20 }} />,
};

interface ExtendedQuest extends Quest {
  status: 'available' | 'in_progress' | 'completed';
  progress: number;
  user_quest_id?: number;
  icon: React.ReactNode;
}

const categoryColors = {
  creative: '#FF6B6B',
  research: '#4ECDC4',
  experiment: '#FFE66D',
  communication: '#6C5CE7',
};

// デフォルトクエストデータ
const getDefaultQuests = (): Quest[] => [
  {
    id: 1,
    title: '初めての観察日記',
    description: '身の回りの何か興味深いものを3日間観察して、変化を記録してみよう！',
    category: 'research' as const,
    difficulty: 1,
    points: 1000,
    required_evidence: '3日分の観察記録（写真または文章）',
    icon_name: 'Explore',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'アートで表現してみよう',
    description: '今の気持ちや考えを絵、コラージュ、デジタルアートなど、好きな方法で表現してみよう。',
    category: 'creative' as const,
    difficulty: 1,
    points: 1000,
    required_evidence: '作品の写真',
    icon_name: 'CameraAlt',
    is_active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 3,
    title: 'インタビューマスター',
    description: '興味のあるテーマについて、身近な人3人にインタビューしてみよう。',
    category: 'communication' as const,
    difficulty: 2,
    points: 5000,
    required_evidence: 'インタビューの質問と回答のまとめ',
    icon_name: 'Group',
    is_active: true,
    created_at: new Date().toISOString(),
  }
];

const QuestSuggestion: React.FC = () => {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [userQuests, setUserQuests] = useState<UserQuest[]>([]);
  const [questStats, setQuestStats] = useState<QuestStats>({
    total_quests: 0,
    available_quests: 0,
    completed_quests: 0,
    in_progress_quests: 0,
    total_points: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuestData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // APIが利用できない場合はデフォルトデータを使用
      try {
        const [questsResult, userQuestsResult, statsResult] = await Promise.all([
          questApi.getQuests(),
          questApi.getUserQuests(),
          questApi.getQuestStats()
        ]);
        setQuests(questsResult);
        setUserQuests(userQuestsResult);
        setQuestStats(statsResult);
      } catch (apiError) {
        console.warn('API not available, using fallback data:', apiError);
        // フォールバック: デフォルトデータを使用
        setQuests(getDefaultQuests());
        setUserQuests([]);
        setQuestStats({
          total_quests: getDefaultQuests().length,
          available_quests: getDefaultQuests().length,
          completed_quests: 0,
          in_progress_quests: 0,
          total_points: 0
        });
      }
    } catch (err) {
      console.error('Failed to load quest data:', err);
      setError('クエストデータの読み込みに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestData();
  }, []);

  const getQuestWithStatus = (quest: Quest): ExtendedQuest => {
    const userQuest = userQuests.find(uq => uq.quest_id === quest.id);
    return {
      ...quest,
      status: userQuest?.status || 'available',
      progress: userQuest?.progress || 0,
      user_quest_id: userQuest?.id,
      icon: iconMap[quest.icon_name || ''] || <Explore sx={{ fontSize: 20 }} />
    };
  };

  // 進行中のクエストと利用可能なクエストを取得（最大3個まで）
  const getRecommendedQuests = (): ExtendedQuest[] => {
    const questsWithStatus = quests.map(getQuestWithStatus);
    const inProgressQuests = questsWithStatus.filter(q => q.status === 'in_progress');
    const availableQuests = questsWithStatus.filter(q => q.status === 'available').slice(0, 3 - inProgressQuests.length);
    return [...inProgressQuests, ...availableQuests].slice(0, 3);
  };

  const recommendedQuests = getRecommendedQuests();

  const handleToggleExpanded = () => {
    setExpanded(!expanded);
  };

  const handleViewAllQuests = () => {
    navigate('/quests');
  };

  if (loading) {
    return (
      <Box sx={{ p: 2 }}>
        <Card sx={{ bgcolor: 'rgba(5, 155, 255, 0.05)', borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600}>
                クエスト提案
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              読み込み中...
            </Typography>
          </CardContent>
        </Card>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Card sx={{ bgcolor: 'rgba(255, 193, 7, 0.05)', borderRadius: 2, border: '1px solid rgba(255, 193, 7, 0.2)' }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents color="warning" sx={{ fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600}>
                クエスト提案
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              現在利用できません
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={loadQuestData}
              sx={{ mt: 1, fontSize: '0.7rem' }}
            >
              再試行
            </Button>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Card 
        sx={{ 
          bgcolor: 'rgba(5, 155, 255, 0.05)',
          borderRadius: 2,
          border: '1px solid rgba(5, 155, 255, 0.2)',
        }}
      >
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              mb: expanded ? 2 : 0,
            }}
            onClick={handleToggleExpanded}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <EmojiEvents color="primary" sx={{ fontSize: 20 }} />
              <Typography variant="body2" fontWeight={600}>
                クエスト提案
              </Typography>
            </Box>
            <IconButton size="small">
              {expanded ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          {!expanded && (
            <Fade in={!expanded}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  進行中: {questStats.in_progress_quests} | 利用可能: {questStats.available_quests}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <LocalFireDepartment sx={{ fontSize: 14, color: '#FF6B6B' }} />
                  <Typography variant="caption" fontWeight={600}>
                    {questStats.total_points.toLocaleString()} pt
                  </Typography>
                </Box>
              </Box>
            </Fade>
          )}

          <Collapse in={expanded}>
            <Box>
              {/* 統計情報 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip 
                  label={`進行中: ${questStats.in_progress_quests}`}
                  size="small" 
                  color="warning"
                  sx={{ fontSize: '0.7rem' }}
                />
                <Chip 
                  label={`利用可能: ${questStats.available_quests}`}
                  size="small" 
                  color="success"
                  sx={{ fontSize: '0.7rem' }}
                />
              </Box>

              {/* おすすめクエスト */}
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                {recommendedQuests.length > 0 ? 'おすすめクエスト' : 'クエストがありません'}
              </Typography>
              
              <List sx={{ p: 0 }}>
                {recommendedQuests.map((quest) => (
                  <ListItem 
                    key={quest.id} 
                    sx={{ 
                      p: 1, 
                      mb: 1,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      border: quest.status === 'in_progress' ? '1px solid' : 'none',
                      borderColor: 'primary.main',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1,
                          bgcolor: `${categoryColors[quest.category]}20`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {quest.icon}
                      </Box>
                    </ListItemIcon>
                    <ListItemText
                      primary={quest.title}
                      secondary={
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                            {[...Array(3)].map((_, i) => (
                              i < quest.difficulty ? 
                                <Star key={i} sx={{ fontSize: 10, color: '#FFD700' }} /> :
                                <StarBorder key={i} sx={{ fontSize: 10, color: '#ccc' }} />
                            ))}
                            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                              {quest.points} pt
                            </Typography>
                          </Box>
                          {quest.status === 'in_progress' && (
                            <LinearProgress 
                              variant="determinate" 
                              value={quest.progress} 
                              sx={{ height: 4, borderRadius: 2, mt: 0.5 }}
                            />
                          )}
                        </>
                      }
                      primaryTypographyProps={{
                        variant: "caption",
                        sx: { fontWeight: 600, lineHeight: 1.2 }
                      }}
                      secondaryTypographyProps={{
                        component: "div"
                      }}
                    />
                  </ListItem>
                ))}
              </List>

              <Button
                variant="outlined"
                size="small"
                fullWidth
                onClick={handleViewAllQuests}
                sx={{ 
                  mt: 1,
                  textTransform: 'none',
                  fontSize: '0.75rem',
                }}
              >
                すべてのクエストを見る
              </Button>
            </Box>
          </Collapse>
        </CardContent>
      </Card>
    </Box>
  );
};

export default QuestSuggestion;