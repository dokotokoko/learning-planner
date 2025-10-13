import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Psychology,
  Assignment,
  Chat,
  TipsAndUpdates,
  PlayArrow,
  CheckCircle,
  ArrowForward,
  Lightbulb,
  AutoStories,
  Assessment,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const HowToUseSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const steps = [
    {
      number: 1,
      title: 'プロジェクト作成',
      subtitle: 'テーマを決めてスタート',
      description: 'ダッシュボードから新しい探究プロジェクトを作成し、興味のあるテーマを設定します。',
      features: [
        'テーマの設定',
        'プロジェクトの作成',
        'AIアシスタントとの対話',
        '探究の方向性の相談',
      ],
      icon: <Lightbulb sx={{ fontSize: 48 }} />,
      bgColor: 'linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%)',
      example: 'ダッシュボード→「新しいプロジェクト」→テーマを入力してプロジェクト作成',
    },
    {
      number: 2,
      title: '問いと仮説を設定',
      subtitle: '探究を深める準備',
      description: 'プロジェクトページで具体的な問いと仮説を設定し、探究の方向性を明確にします。',
      features: [
        '問いの設定',
        '仮説の構築',
        'インライン編集',
        'AIからのアドバイス',
      ],
      icon: <Assignment sx={{ fontSize: 48 }} />,
      bgColor: 'linear-gradient(135deg, #4ECDC4 0%, #67E6DC 100%)',
      example: 'プロジェクトページで問いと仮説の欄をクリックして編集・保存',
    },
    {
      number: 3,
      title: 'メモで記録・整理',
      subtitle: 'アイデアと調査を蓄積',
      description: 'メモ機能を使って調査内容やアイデアを記録し、AIチャットで対話しながら探究を深めます。',
      features: [
        'Markdown対応メモ',
        '自動保存機能',
        'AIチャット連携',
        '思考フレームワーク活用',
      ],
      icon: <Psychology sx={{ fontSize: 48 }} />,
      bgColor: 'linear-gradient(135deg, #A8E6CF 0%, #C1E6CF 100%)',
      example: 'メモ作成→内容記録→AIチャットで相談→思考フレームワークで整理',
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
          <Box sx={{ textAlign: 'center', mb: { xs: 6, md: 10 } }}>
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
              どう使うか？
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
                mb: 4,
              }}
            >
              3つのステップで始める探究学習
            </Typography>
            <Chip
              label="すぐに始められる"
              color="primary"
              sx={{
                fontWeight: 600,
                px: 2,
                py: 1,
                fontSize: '0.9rem',
              }}
            />
          </Box>
        </motion.div>

        {/* ステップ */}
        {steps.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, delay: 0.2 * index }}
          >
            <Box sx={{ mb: { xs: 8, md: 12 } }}>
              <Grid
                container
                spacing={{ xs: 4, md: 6 }}
                alignItems="center"
                direction={{ xs: 'column', md: index % 2 === 0 ? 'row' : 'row-reverse' }}
              >
                {/* コンテンツ側 */}
                <Grid item xs={12} md={6}>
                  <Box sx={{ 
                    textAlign: { xs: 'center', md: index % 2 === 0 ? 'left' : 'right' },
                    pr: { md: index % 2 === 0 ? 4 : 0 },
                    pl: { md: index % 2 === 0 ? 0 : 4 },
                  }}>
                    {/* ステップ番号 */}
                    <Box
                      sx={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 60,
                        height: 60,
                        borderRadius: '50%',
                        background: step.bgColor,
                        color: 'white',
                        fontWeight: 700,
                        fontSize: '1.5rem',
                        mb: 3,
                        position: 'relative',
                      }}
                    >
                      {step.number}
                      {index < steps.length - 1 && (
                        <Box
                          sx={{
                            display: { xs: 'none', md: 'block' },
                            position: 'absolute',
                            [index % 2 === 0 ? 'right' : 'left']: -80,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: 'text.secondary',
                          }}
                        >
                          <ArrowForward sx={{ fontSize: 32 }} />
                        </Box>
                      )}
                    </Box>

                    <Typography
                      variant="h4"
                      sx={{
                        fontWeight: 600,
                        fontSize: { xs: '1.5rem', sm: '2rem' },
                        mb: 1,
                      }}
                    >
                      {step.title}
                    </Typography>
                    
                    <Typography
                      variant="h6"
                      color="primary"
                      sx={{
                        fontWeight: 500,
                        fontSize: { xs: '1rem', sm: '1.1rem' },
                        mb: 3,
                      }}
                    >
                      {step.subtitle}
                    </Typography>

                    <Typography
                      variant="body1"
                      color="text.secondary"
                      sx={{
                        fontSize: { xs: '0.9rem', sm: '1rem' },
                        lineHeight: 1.7,
                        mb: 4,
                      }}
                    >
                      {step.description}
                    </Typography>

                    {/* 特徴リスト */}
                    <Box sx={{ mb: 4 }}>
                      {step.features.map((feature, featureIndex) => (
                        <Box
                          key={featureIndex}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            mb: 1.5,
                            justifyContent: { xs: 'center', md: index % 2 === 0 ? 'flex-start' : 'flex-end' },
                          }}
                        >
                          <CheckCircle
                            sx={{
                              color: 'success.main',
                              fontSize: 20,
                              mr: index % 2 === 0 ? 1.5 : 0,
                              ml: index % 2 === 0 ? 0 : 1.5,
                              order: { xs: 1, md: index % 2 === 0 ? 1 : 2 },
                            }}
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              fontSize: { xs: '0.85rem', sm: '0.9rem' },
                              order: { xs: 2, md: index % 2 === 0 ? 2 : 1 },
                            }}
                          >
                            {feature}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

                    {/* 実例 */}
                    <Paper
                      elevation={2}
                      sx={{
                        p: 3,
                        backgroundColor: 'rgba(5, 155, 255, 0.05)',
                        border: '1px solid rgba(5, 155, 255, 0.1)',
                        borderRadius: 3,
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: { xs: '0.8rem', sm: '0.85rem' },
                          lineHeight: 1.6,
                          fontStyle: 'italic',
                          color: 'text.secondary',
                        }}
                      >
                        <strong>実例:</strong> {step.example}
                      </Typography>
                    </Paper>
                  </Box>
                </Grid>

                {/* ビジュアル側 */}
                <Grid item xs={12} md={6}>
                  <Paper
                    elevation={8}
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      background: step.bgColor,
                      color: 'white',
                      borderRadius: 4,
                      minHeight: { xs: 300, md: 400 },
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    {/* 背景装飾 */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: -50,
                        right: -50,
                        width: 200,
                        height: 200,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: -30,
                        left: -30,
                        width: 150,
                        height: 150,
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      }}
                    />

                    <Box sx={{ position: 'relative', zIndex: 1 }}>
                      {step.icon}
                      <Typography
                        variant="h5"
                        sx={{
                          fontWeight: 600,
                          mt: 3,
                          mb: 2,
                          fontSize: { xs: '1.2rem', sm: '1.5rem' },
                        }}
                      >
                        ステップ {step.number}
                      </Typography>
                      <Typography
                        variant="body1"
                        sx={{
                          opacity: 0.9,
                          fontSize: { xs: '0.9rem', sm: '1rem' },
                        }}
                      >
                        {step.subtitle}
                      </Typography>
                      
                      <Button
                        variant="contained"
                        startIcon={<PlayArrow />}
                        sx={{
                          mt: 4,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          color: 'white',
                          '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.3)',
                          },
                          borderRadius: 2,
                          px: 3,
                        }}
                      >
                        詳しく見る
                      </Button>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </motion.div>
        ))}

        {/* 続けて学習の流れ */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mt: { xs: 8, md: 10 } }}>
            <Paper
              elevation={3}
              sx={{
                p: { xs: 4, md: 6 },
                background: 'linear-gradient(135deg, #059BFF 0%, #00406B 100%)',
                color: 'white',
                borderRadius: 4,
              }}
            >
              <AutoStories sx={{ fontSize: 48, mb: 3 }} />
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  fontSize: { xs: '1.2rem', sm: '1.5rem' },
                }}
              >
                継続的な学習サイクル
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.9,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  maxWidth: 600,
                  mx: 'auto',
                }}
              >
                これらの3ステップを繰り返すことで、探究スキルが自然と身につき、
                深い学びと創造的思考力を育成できます。
              </Typography>
            </Paper>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HowToUseSection;