import React from 'react';
import { Link } from 'react-router-dom';
import { Container, Typography, Grid, Card, CardContent } from '@mui/material';

const games = [
  { id: 'theme-deep-dive', title: '探究テーマ深掘りツリー', description: 'AIの提案から選択して、興味のあるテーマを段階的に深掘りする手法です。', path: '/framework-games/theme-deep-dive' },
  { id: '5-whys', title: '5-Whys（５回の「なぜ？」）', description: '問題の根本原因を探るための手法です。', path: '/framework-games/5-whys' },
  { id: 'logic-tree', title: 'ロジックツリー／Issue Tree', description: '問題を構造的に分解し、原因や解決策を整理するためのツールです。', path: '/framework-games/logic-tree' },
  { id: 'hmw', title: 'How Might We（HMW）フレーム', description: '課題を解決可能な問いに変換するフレームワークです。', path: '/framework-games/hmw' },
  { id: 'impact-feasibility', title: 'インパクト × 実現可能性マトリクス', description: 'アイデアの優先順位づけのためのマトリクスです。', path: '/framework-games/impact-feasibility' },
  { id: 'speed-storming', title: 'スピードストーミング（3-2-1 Pitch）', description: '短時間でアイデアを出し、洗練させるための手法です。', path: '/framework-games/speed-storming' },
  { id: 'gallery-walk', title: 'ギャラリーウォーク＋ドット投票', description: 'アイデアを共有し、評価するための手法です。', path: '/framework-games/gallery-walk' },
  { id: 'mind-map', title: 'マインドマップ × Good Time Journal', description: '思考を視覚化し、良い時間の記録を組み合わせた手法です。', path: '/framework-games/mind-map' },
  { id: 'ikigai', title: 'IKIGAIマトリクス', description: '好き／得意／世界が求める／報酬の4つの要素から生きがいを見つける手法です。', path: '/framework-games/ikigai' },
  { id: 'lifeline', title: 'ライフライン ＆ インタレスト・クラスター', description: '人生の重要な出来事と興味の関連性を可視化する手法です。', path: '/framework-games/lifeline' },
  { id: 'qft', title: 'Question Formulation Technique（QFT）', description: '質の高い問いを生み出すための体系的な手法です。', path: '/framework-games/qft' }
];

const FrameworkGamesPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }} data-tutorial="framework-games-section">
      <Typography variant="h4" component="h1" gutterBottom>
        思考フレームワーク・ミニゲーム
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        行き詰まったとき、視点を変えたいとき、これらのミニゲームで思考を楽しく深めてみましょう。
      </Typography>
      <Grid container spacing={4} sx={{ mt: 2 }}>
        {games.map((game) => (
          <Grid item key={game.id} xs={12} sm={6} md={4}>
            <Link to={game.path} style={{ textDecoration: 'none' }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="div">
                    {game.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {game.description}
                  </Typography>
                </CardContent>
              </Card>
            </Link>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
};

export default FrameworkGamesPage; 