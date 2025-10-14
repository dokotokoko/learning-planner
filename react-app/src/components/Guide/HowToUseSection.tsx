import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Paper,
  Button,
  Chip,
  Stack,
  Avatar,
  IconButton,
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
  ChevronRight,
  Lightbulb,
  AutoStories,
  Assessment,
  School,
  Edit,
  Save,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

const HowToUseSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  const steps = [
    {
      number: 1,
      title: 'アイデア出し',
      subtitle: '興味を見つける',
      description: '自分の興味関心から探究テーマを見つけます。AIが質問を通じてアイデアを引き出します。',
      features: [
        '興味の発見',
        'テーマの探索',
        'AIとのブレスト',
        'アイデアの整理',
      ],
      icon: <Lightbulb />,
      bgColor: '#FF7A00',
      chipColor: '#ff8733',
      progressColor: '#ffe1b5',
    },
    {
      number: 2,
      title: '問いを立てる',
      subtitle: '探究の軸を決める',
      description: 'なぜ？どうして？という疑問から、探究の核となる問いを設定します。',
      features: [
        '問いの設定',
        '仮説の構築',
        '探究計画',
        'AIからの助言',
      ],
      icon: <Assignment />,
      bgColor: '#4ECDC4',
      chipColor: '#4ECDC4',
      progressColor: '#cde1ff',
    },
    {
      number: 3,
      title: '調査・実験',
      subtitle: '情報を集める',
      description: '文献調査、インタビュー、実験など様々な方法で情報を収集します。',
      features: [
        '調査方法の選択',
        '情報の収集',
        'データの記録',
        '実験の実施',
      ],
      icon: <Psychology />,
      bgColor: '#28a745',
      chipColor: '#28a745',
      progressColor: '#c7efe1',
    },
    {
      number: 4,
      title: '考察・分析',
      subtitle: '深く考える',
      description: '集めた情報を整理し、パターンを見つけ、自分の考えを深めます。',
      features: [
        '情報の整理',
        'パターン発見',
        '批判的思考',
        'AIとの対話',
      ],
      icon: <School />,
      bgColor: '#9C27B0',
      chipColor: '#9C27B0',
      progressColor: '#e1ceff',
    },
    {
      number: 5,
      title: 'まとめ・発表',
      subtitle: '成果を共有',
      description: '探究の成果をまとめ、プレゼンテーションやレポートとして発表します。',
      features: [
        'レポート作成',
        'プレゼン準備',
        '成果の共有',
        '振り返り',
      ],
      icon: <Save />,
      bgColor: '#2196F3',
      chipColor: '#2196F3',
      progressColor: '#ffd4d4',
    },
  ];

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
      <Container maxWidth="lg">
        {/* メインコンテンツ：問いかけによる具体化 */}
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center">
          {/* 左側：テキストコンテンツ */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 14, height: 14, bgcolor: '#FF7A00', borderRadius: 0.5 }} />
                <Typography variant="subtitle1" sx={{ color: '#6d87a8', fontWeight: 700 }}>
                  問いかけによる思考の深化
                </Typography>
              </Stack>

              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  lineHeight: 1.3, 
                  fontSize: { xs: '1.8rem', md: '2.4rem' } 
                }}
              >
                答えではなく<br />
                <Box component="span" sx={{ 
                  background: 'linear-gradient(45deg, #FF7A00, #E55100)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  考えを具体的にする問いかけ
                </Box>
              </Typography>

              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'text.secondary', 
                  lineHeight: 1.8,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                }}
              >
                探QメイトのAIは答えを教えるのではなく、
                あなたの考えをより具体的にするための問いを投げかけます。
                自ら考える力を育てるサポートをします。
              </Typography>

              {/* ステップリスト（コンパクト版） */}
              <Stack spacing={2} sx={{ mt: 3 }}>
                {steps.map((step, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: `${step.bgColor}20`,
                        color: step.bgColor,
                      }}
                    >
                      {React.cloneElement(step.icon, { fontSize: 'small' })}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {step.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {step.subtitle}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* 右側：インタラクティブなモックUI */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative' }}>
              {/* グロー影 */}
              <Box
                sx={{
                  position: 'absolute',
                  inset: 'auto 0 -20px 0',
                  height: 40,
                  mx: 'auto',
                  width: '80%',
                  filter: 'blur(20px)',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.15)',
                  zIndex: 0,
                }}
              />

              {/* 浮遊する抽象的なチャットUIモック */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                animate={{ y: [0, -8, 0] }}
                transition={{ 
                  y: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.6 }
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(120,144,180,0.15)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    maxWidth: 520,
                    width: '100%',
                    mx: 'auto',
                  }}
                >
                  {/* シンプルなヘッダー */}
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Box 
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #FF7A00, #E55100)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Chat sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ 
                        height: 8, 
                        width: 150, 
                        bgcolor: '#2b3a4d',
                        borderRadius: 4,
                        mb: 0.8,
                      }} />
                      <Box sx={{ 
                        height: 6, 
                        width: 100, 
                        bgcolor: '#c1c9d5',
                        borderRadius: 3,
                      }} />
                    </Box>
                    <Box sx={{ 
                      width: 8, 
                      height: 8, 
                      borderRadius: '50%',
                      bgcolor: '#4ade80',
                      boxShadow: '0 0 8px rgba(74, 222, 128, 0.5)',
                    }} />
                  </Stack>

                  {/* チャット履歴（1往復は実際のテキスト） */}
                  <Stack spacing={2.5} sx={{ mb: 3 }}>
                    {/* ユーザーメッセージ（実際のテキスト） */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          maxWidth: '70%',
                          p: 2,
                          bgcolor: '#FF7A00',
                          color: 'white',
                          borderRadius: '20px 20px 4px 20px',
                          boxShadow: '0 4px 12px rgba(255, 122, 0, 0.2)',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.5 }}>
                          プラスチックが環境に悪いと聞きました
                        </Typography>
                      </Box>
                    </Box>

                    {/* AIメッセージ（問いかけ） */}
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%',
                        bgcolor: '#ffecd1',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Psychology sx={{ fontSize: 18, color: '#FF7A00' }} />
                      </Box>
                      <Box
                        sx={{
                          maxWidth: '75%',
                          p: 2,
                          bgcolor: '#f0f4f8',
                          borderRadius: '4px 20px 20px 20px',
                        }}
                      >
                        <Typography variant="body2" sx={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#334155', mb: 1 }}>
                          なるほど！では質問です：
                        </Typography>
                        <Stack spacing={1} sx={{ pl: 2 }}>
                          <Typography variant="caption" sx={{ color: '#FF7A00', fontWeight: 600 }}>
                            • どんな場面でそう感じましたか？
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#FF7A00', fontWeight: 600 }}>
                            • 特に気になる影響はありますか？
                          </Typography>
                        </Stack>
                      </Box>
                    </Box>

                    {/* ユーザーメッセージ（右寄せ） */}
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Box
                        sx={{
                          maxWidth: '65%',
                          p: 2,
                          bgcolor: '#FF7A00',
                          borderRadius: '20px 20px 4px 20px',
                          boxShadow: '0 4px 12px rgba(255, 122, 0, 0.2)',
                        }}
                      >
                        <Box sx={{ 
                          height: 6, 
                          width: 120, 
                          bgcolor: 'rgba(255,255,255,0.6)',
                          borderRadius: 3,
                        }} />
                      </Box>
                    </Box>

                    {/* AIタイピング中 */}
                    <Box sx={{ display: 'flex', gap: 1.5 }}>
                      <Box sx={{ 
                        width: 32, 
                        height: 32, 
                        borderRadius: '50%',
                        bgcolor: '#ffecd1',
                        flexShrink: 0,
                      }} />
                      <Box
                        sx={{
                          p: 2,
                          bgcolor: '#f0f4f8',
                          borderRadius: '4px 20px 20px 20px',
                        }}
                      >
                        <Stack direction="row" spacing={0.8}>
                          <Box sx={{ 
                            width: 10, 
                            height: 10, 
                            bgcolor: '#FF7A00',
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite',
                            '@keyframes bounce': {
                              '0%, 60%, 100%': { 
                                transform: 'translateY(0)',
                                opacity: 0.3,
                              },
                              '30%': { 
                                transform: 'translateY(-8px)',
                                opacity: 1,
                              },
                            }
                          }} />
                          <Box sx={{ 
                            width: 10, 
                            height: 10, 
                            bgcolor: '#FF7A00',
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite 0.2s',
                          }} />
                          <Box sx={{ 
                            width: 10, 
                            height: 10, 
                            bgcolor: '#FF7A00',
                            borderRadius: '50%',
                            animation: 'bounce 1.4s infinite 0.4s',
                          }} />
                        </Stack>
                      </Box>
                    </Box>
                  </Stack>

                  {/* 抽象的な入力エリア */}
                  <Box sx={{ 
                    p: 2.5,
                    bgcolor: '#f8fafc',
                    borderRadius: 4,
                    border: '1px solid',
                    borderColor: '#e2e8f0',
                  }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Box sx={{ 
                        flex: 1,
                        height: 40,
                        bgcolor: 'white',
                        borderRadius: 20,
                        border: '1px solid',
                        borderColor: '#cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        px: 2,
                      }}>
                        <Box sx={{ 
                          height: 6, 
                          width: 200, 
                          bgcolor: '#cbd5e1',
                          borderRadius: 3,
                        }} />
                      </Box>
                      <Box sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%',
                        bgcolor: '#FF7A00',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 12px rgba(255, 122, 0, 0.3)',
                        cursor: 'pointer',
                      }}>
                        <ArrowForward sx={{ color: 'white', fontSize: 20 }} />
                      </Box>
                    </Stack>
                  </Box>
                </Paper>
              </motion.div>
            </Box>
          </Grid>
        </Grid>

        {/* 2つ目のセット：多様な選択肢の提示 */}
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center" sx={{ mt: { xs: 12, md: 16 } }}>
          {/* 右側：テキストコンテンツ */}
          <Grid item xs={12} md={6} order={{ xs: 2, md: 2 }}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 14, height: 14, bgcolor: '#4ECDC4', borderRadius: 0.5 }} />
                <Typography variant="subtitle1" sx={{ color: '#6d87a8', fontWeight: 700 }}>
                  多様な選択肢を提示
                </Typography>
              </Stack>

              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  lineHeight: 1.3, 
                  fontSize: { xs: '1.8rem', md: '2.4rem' },
                  textAlign: { xs: 'center', md: 'right' },
                }}
              >
                次のステップやアイデアなど<br />
                <Box component="span" sx={{ 
                  background: 'linear-gradient(45deg, #4ECDC4, #2b79ff)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  決定するのはあなた！
                </Box>
              </Typography>

              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'text.secondary', 
                  lineHeight: 1.8,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                  textAlign: { xs: 'center', md: 'right' },
                }}
              >
                AIは複数の選択肢を提案しますが、最終的な判断は生徒自身が行います。
                主体性を保ちながら、視野を広げるサポートをします。
              </Typography>

              {/* 選択肢の例 */}
              <Stack spacing={2} sx={{ mt: 3 }}>
                {[
                  { icon: <TipsAndUpdates />, title: '調査方法の提案', subtitle: '実験・インタビュー・文献', color: '#ffa726' },
                  { icon: <Assignment />, title: '複数の視点', subtitle: '異なるアプローチを紹介', color: '#4ECDC4' },
                  { icon: <Psychology />, title: '発展の方向', subtitle: '深める・広げる・つなげる', color: '#ab47bc' },
                  { icon: <Assessment />, title: 'あなたが選ぶ', subtitle: '興味に合わせて決定', color: '#42a5f5' },
                ].map((item, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={2} sx={{ 
                    justifyContent: { xs: 'center', md: 'flex-end' },
                    textAlign: { xs: 'center', md: 'right' },
                  }}>
                    <Box sx={{ order: { xs: 1, md: 2 }, flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.subtitle}
                      </Typography>
                    </Box>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: `${item.color}20`,
                        color: item.color,
                        order: { xs: 2, md: 1 },
                      }}
                    >
                      {React.cloneElement(item.icon, { fontSize: 'small' })}
                    </Avatar>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* 左側：メモUIモック */}
          <Grid item xs={12} md={6} order={{ xs: 1, md: 1 }}>
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 'auto 0 -20px 0',
                  height: 40,
                  mx: 'auto',
                  width: '80%',
                  filter: 'blur(20px)',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.15)',
                  zIndex: 0,
                }}
              />

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                animate={{ y: [0, -6, 0] }}
                transition={{ 
                  y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.6 }
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(120,144,180,0.15)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    maxWidth: 520,
                    width: '100%',
                    mx: 'auto',
                  }}
                >
                  {/* メモヘッダー */}
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Box 
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #4ECDC4, #2b79ff)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Edit sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ 
                        height: 8, 
                        width: 120, 
                        bgcolor: '#2b3a4d',
                        borderRadius: 4,
                        mb: 0.8,
                      }} />
                      <Box sx={{ 
                        height: 6, 
                        width: 80, 
                        bgcolor: '#c1c9d5',
                        borderRadius: 3,
                      }} />
                    </Box>
                    <Chip 
                      label="下書き" 
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(76, 205, 196, 0.1)',
                        color: '#4ECDC4',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>

                  {/* 選択肢UI */}
                  <Stack spacing={2}>
                    <Typography variant="body2" fontWeight={600} sx={{ color: '#334155' }}>
                      次のアプローチを選んでください：
                    </Typography>
                    
                    {/* 選択肢カード */}
                    <Stack spacing={1.5}>
                      {[
                        { label: 'A: 実験で確かめる', desc: '実際に観察してデータ収集', selected: false },
                        { label: 'B: 専門家に聞く', desc: 'インタビューで深い知識', selected: true },
                        { label: 'C: 文献を調べる', desc: '論文や書籍から学ぶ', selected: false },
                      ].map((option, i) => (
                        <Paper
                          key={i}
                          sx={{
                            p: 1.5,
                            bgcolor: option.selected ? '#e8f5ff' : '#f8fafc',
                            border: option.selected ? '2px solid #4ECDC4' : '1px solid #e2e8f0',
                            borderRadius: 2,
                            cursor: 'pointer',
                          }}
                        >
                          <Typography variant="caption" fontWeight={600} sx={{ 
                            color: option.selected ? '#4ECDC4' : '#64748b',
                          }}>
                            {option.label}
                          </Typography>
                          <Typography variant="caption" sx={{ 
                            display: 'block',
                            color: '#94a3b8',
                            fontSize: '0.7rem',
                            mt: 0.5,
                          }}>
                            {option.desc}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>

                    <Box sx={{ mt: 2, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 2 }}>
                      <Typography variant="caption" sx={{ color: '#0284c7', fontWeight: 600 }}>
                        💡 複数選択も可能です！
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </motion.div>
            </Box>
          </Grid>
        </Grid>

        {/* 3つ目のセット：問いの調整 */}
        <Grid container spacing={{ xs: 5, md: 8 }} alignItems="center" sx={{ mt: { xs: 12, md: 16 } }}>
          {/* 左側：テキストコンテンツ */}
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Box sx={{ width: 14, height: 14, bgcolor: '#2196F3', borderRadius: 0.5 }} />
                <Typography variant="subtitle1" sx={{ color: '#6d87a8', fontWeight: 700 }}>
                  適切な問いのサイズ調整
                </Typography>
              </Stack>

              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 800, 
                  lineHeight: 1.3, 
                  fontSize: { xs: '1.8rem', md: '2.4rem' } 
                }}
              >
                問いの大小を調整して<br />
                <Box component="span" sx={{ 
                  background: 'linear-gradient(45deg, #2196F3, #9c27b0)',
                  backgroundClip: 'text',
                  textFillColor: 'transparent',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  前に進むサポート
                </Box>
              </Typography>

              <Typography 
                variant="h6" 
                sx={{ 
                  color: 'text.secondary', 
                  lineHeight: 1.8,
                  fontSize: { xs: '1rem', sm: '1.1rem' },
                }}
              >
                問いが大きすぎて困ったら小さく分解、
                小さすぎたら視野を広げる。
                探究が止まらないよう、適切なサイズに調整するお手伝いをします。
              </Typography>

              {/* 問いの調整例 */}
              <Stack spacing={2} sx={{ mt: 3 }}>
                {[
                  { icon: <Assessment />, title: '問いを分解', subtitle: '大きな問いを扱いやすく', color: '#2196F3' },
                  { icon: <PlayArrow />, title: '視野を広げる', subtitle: '小さな問いを発展させる', color: '#ff9800' },
                  { icon: <AutoStories />, title: '関連づける', subtitle: '他の問いとつなげる', color: '#4caf50' },
                  { icon: <Save />, title: '段階的に進む', subtitle: 'ステップバイステップ', color: '#9c27b0' },
                ].map((item, index) => (
                  <Stack key={index} direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      sx={{
                        width: 36,
                        height: 36,
                        bgcolor: `${item.color}20`,
                        color: item.color,
                      }}
                    >
                      {React.cloneElement(item.icon, { fontSize: 'small' })}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {item.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.subtitle}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          </Grid>

          {/* 右側：プレゼンUIモック */}
          <Grid item xs={12} md={6}>
            <Box sx={{ position: 'relative' }}>
              <Box
                sx={{
                  position: 'absolute',
                  inset: 'auto 0 -20px 0',
                  height: 40,
                  mx: 'auto',
                  width: '80%',
                  filter: 'blur(20px)',
                  borderRadius: '50%',
                  background: 'rgba(0,0,0,0.15)',
                  zIndex: 0,
                }}
              />

              <motion.div
                initial={{ y: 10, opacity: 0 }}
                whileInView={{ y: 0, opacity: 1 }}
                viewport={{ once: true }}
                animate={{ y: [0, -5, 0] }}
                transition={{ 
                  y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                  default: { duration: 0.6 }
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    position: 'relative',
                    zIndex: 1,
                    p: { xs: 3, md: 4 },
                    borderRadius: 3,
                    bgcolor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(120,144,180,0.15)',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
                    maxWidth: 520,
                    width: '100%',
                    mx: 'auto',
                  }}
                >
                  {/* プレゼンヘッダー */}
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
                    <Box 
                      sx={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #2196F3, #9c27b0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <PlayArrow sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ 
                        height: 8, 
                        width: 140, 
                        bgcolor: '#2b3a4d',
                        borderRadius: 4,
                        mb: 0.8,
                      }} />
                      <Box sx={{ 
                        height: 6, 
                        width: 90, 
                        bgcolor: '#c1c9d5',
                        borderRadius: 3,
                      }} />
                    </Box>
                    <Chip 
                      label="発表準備" 
                      size="small"
                      sx={{ 
                        bgcolor: 'rgba(33, 150, 243, 0.1)',
                        color: '#2196F3',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                      }}
                    />
                  </Stack>

                  {/* 問いの調整UI */}
                  <Stack spacing={2}>
                    <Box sx={{ 
                      p: 2,
                      bgcolor: '#fff4e6',
                      borderRadius: 2,
                      border: '1px solid #ffb74d',
                    }}>
                      <Typography variant="caption" fontWeight={600} sx={{ color: '#e65100' }}>
                        現在の問い（大きすぎる？）
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1, color: '#424242' }}>
                        なぜ地球温暖化が起きるのか？
                      </Typography>
                    </Box>

                    <Box sx={{ textAlign: 'center', py: 1 }}>
                      <ArrowForward sx={{ color: '#2196F3', transform: 'rotate(90deg)' }} />
                    </Box>

                    <Typography variant="caption" fontWeight={600} sx={{ color: '#2196F3', mb: 1 }}>
                      📏 問いを分解して扱いやすくしました：
                    </Typography>

                    <Stack spacing={1}>
                      {[
                        '1. CO2はどのように温室効果を起こす？',
                        '2. 人間活動のどれがCO2を増やす？',
                        '3. 森林減少の影響はどれくらい？',
                      ].map((q, i) => (
                        <Paper
                          key={i}
                          sx={{
                            p: 1.5,
                            bgcolor: '#e3f2fd',
                            border: '1px solid #90caf9',
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="caption" sx={{ color: '#1565c0' }}>
                            {q}
                          </Typography>
                        </Paper>
                      ))}
                    </Stack>

                    <Box sx={{ 
                      mt: 2, 
                      p: 1.5, 
                      bgcolor: '#f3e5f5', 
                      borderRadius: 2,
                      textAlign: 'center',
                    }}>
                      <Typography variant="caption" sx={{ color: '#6a1b9a', fontWeight: 600 }}>
                        どれから始めますか？選んでみましょう！
                      </Typography>
                    </Box>
                  </Stack>
                </Paper>
              </motion.div>
            </Box>
          </Grid>
        </Grid>

        {/* CTA セクション */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box sx={{ textAlign: 'center', mt: { xs: 10, md: 12 } }}>
            <Paper
              elevation={0}
              sx={{
                p: { xs: 4, md: 6 },
                background: 'linear-gradient(135deg, #FF7A00 0%, #E55100 100%)',
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
                探究学習を始めよう
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  opacity: 0.95,
                  fontSize: { xs: '0.9rem', sm: '1rem' },
                  maxWidth: 600,
                  mx: 'auto',
                  lineHeight: 1.8,
                }}
              >
                5つのステップで、あなたの探究学習をサポート。
                AIアシスタントと一緒に、深い学びと創造的思考力を育てましょう。
              </Typography>
            </Paper>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default HowToUseSection;