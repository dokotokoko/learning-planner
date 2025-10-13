import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  School,
  Science,
  Create,
  Group,
  Assignment,
  Psychology,
  Extension,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const UseCaseSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const useCases = [
    {
      title: '総合的な学習の時間での活用',
      icon: <School sx={{ fontSize: 40 }} />,
      color: '#4CAF50',
      grade: '中学・高校',
      description: '自由研究や探究活動のテーマ設定から発表まで',
      scenarios: [
        '環境問題について調べたい生徒のテーマ絞り込み',
        '地域の課題を発見し、解決策を考える活動',
        '興味のある分野から研究テーマを見つける',
      ],
      benefits: [
        'テーマの深掘りがスムーズに',
        '調査の方向性が明確になる',
        '発表資料作成のサポート',
      ],
    },
    {
      title: '理科・科学研究での活用',
      icon: <Science sx={{ fontSize: 40 }} />,
      color: '#2196F3',
      grade: '中学・高校',
      description: '仮説立案から実験計画、考察まで体系的にサポート',
      scenarios: [
        '実験の仮説を立てる際のアイデア整理',
        '実験結果の考察と新たな問いの発見',
        '科学コンテストへの出品作品の企画',
      ],
      benefits: [
        '科学的思考プロセスの習得',
        '実験計画の精度向上',
        '考察の深まり',
      ],
    },
    {
      title: '進路探究・キャリア教育',
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: '#FF9800',
      grade: '高校',
      description: '自己理解を深め、進路選択につながる探究活動',
      scenarios: [
        '興味のある職業について深く調査',
        '大学の学部選択のための探究',
        '社会課題と自分の興味を結びつける',
      ],
      benefits: [
        '自己理解の深化',
        '進路選択の明確化',
        'モチベーション向上',
      ],
    },
    {
      title: '部活動・課外活動での活用',
      icon: <Group sx={{ fontSize: 40 }} />,
      color: '#9C27B0',
      grade: '中学・高校',
      description: 'プロジェクトベースの活動を効果的にサポート',
      scenarios: [
        '文化祭の企画立案と準備',
        '部活動での研究プロジェクト',
        'ボランティア活動の企画',
      ],
      benefits: [
        'チームでの探究が可能',
        'プロジェクト管理スキル向上',
        '成果の可視化',
      ],
    },
    {
      title: '教科横断型学習',
      icon: <Extension sx={{ fontSize: 40 }} />,
      color: '#00BCD4',
      grade: '中学・高校',
      description: '複数教科を結びつけた深い学びの実現',
      scenarios: [
        '歴史と地理を組み合わせた地域研究',
        '数学と物理を活用した現象の解明',
        '国語と社会を結びつけた文化研究',
      ],
      benefits: [
        '教科の繋がりを発見',
        '多角的な視点の獲得',
        '深い理解の促進',
      ],
    },
    {
      title: '個人の興味探究',
      icon: <Psychology sx={{ fontSize: 40 }} />,
      color: '#F44336',
      grade: '全学年',
      description: '個人の興味・関心を深める自由な探究活動',
      scenarios: [
        '趣味を学問的に探究する',
        '日常の疑問を深く調査',
        '将来の夢に向けた学習計画',
      ],
      benefits: [
        '主体的な学習習慣',
        '知的好奇心の育成',
        '学習意欲の向上',
      ],
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.paper' }}>
      <Container maxWidth="lg">
        {/* セクションタイトル */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 700,
                fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                mb: 2,
                background: 'linear-gradient(45deg, #059BFF, #006EB8)',
                backgroundClip: 'text',
                textFillColor: 'transparent',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              活用シーン・UseCase
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                maxWidth: 700,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              探Qメイトは様々な学習場面で活用できます。
              実際の活用例と期待される効果をご紹介します。
            </Typography>
          </Box>
        </motion.div>

        {/* Use Cases Grid */}
        <Grid container spacing={{ xs: 3, md: 4 }}>
          {useCases.map((useCase, index) => (
            <Grid item xs={12} md={6} lg={4} key={useCase.title}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 * index }}
              >
                <Card
                  elevation={3}
                  sx={{
                    height: '100%',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: 8,
                    },
                    borderTop: `4px solid ${useCase.color}`,
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box sx={{ color: useCase.color, mr: 2 }}>
                        {useCase.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            fontSize: { xs: '1rem', sm: '1.1rem' },
                            lineHeight: 1.3,
                          }}
                        >
                          {useCase.title}
                        </Typography>
                        <Chip
                          label={useCase.grade}
                          size="small"
                          sx={{
                            mt: 0.5,
                            backgroundColor: `${useCase.color}20`,
                            color: useCase.color,
                            fontWeight: 600,
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 2,
                        fontSize: { xs: '0.85rem', sm: '0.9rem' },
                        lineHeight: 1.6,
                      }}
                    >
                      {useCase.description}
                    </Typography>

                    {/* Scenarios */}
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          mb: 1,
                          color: useCase.color,
                          fontSize: '0.9rem',
                        }}
                      >
                        活用シーン例
                      </Typography>
                      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                        {useCase.scenarios.map((scenario, idx) => (
                          <Box
                            component="li"
                            key={idx}
                            sx={{
                              fontSize: '0.85rem',
                              lineHeight: 1.5,
                              mb: 0.5,
                              color: 'text.secondary',
                            }}
                          >
                            {scenario}
                          </Box>
                        ))}
                      </Box>
                    </Box>

                    {/* Benefits */}
                    <Paper
                      sx={{
                        p: 1.5,
                        backgroundColor: `${useCase.color}08`,
                        border: `1px solid ${useCase.color}30`,
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          mb: 0.5,
                          fontSize: '0.85rem',
                          color: useCase.color,
                        }}
                      >
                        期待される効果
                      </Typography>
                      {useCase.benefits.map((benefit, idx) => (
                        <Typography
                          key={idx}
                          variant="body2"
                          sx={{
                            fontSize: '0.8rem',
                            lineHeight: 1.4,
                            color: 'text.primary',
                            '&:before': {
                              content: '"✓ "',
                              color: useCase.color,
                              fontWeight: 600,
                            },
                          }}
                        >
                          {benefit}
                        </Typography>
                      ))}
                    </Paper>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box
            sx={{
              mt: 8,
              p: 4,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
              textAlign: 'center',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 600,
                mb: 2,
                fontSize: { xs: '1.3rem', sm: '1.5rem' },
              }}
            >
              あなたの探究活動にも活用できます
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              探Qメイトは、生徒一人ひとりの興味や学習スタイルに合わせて
              最適な探究学習をサポートします。
              まずは無料で試してみませんか？
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default UseCaseSection;