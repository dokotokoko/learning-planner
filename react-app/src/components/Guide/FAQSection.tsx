import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  ExpandMore,
  HelpOutline,
  School,
  Payment,
  Security,
  Support,
  DevicesOther,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  icon: React.ReactNode;
}

const FAQSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const faqCategories = {
    basic: { label: '基本機能', color: '#4CAF50', icon: <HelpOutline /> },
    usage: { label: '使い方', color: '#2196F3', icon: <School /> },
    payment: { label: '料金', color: '#FF9800', icon: <Payment /> },
    privacy: { label: 'プライバシー', color: '#9C27B0', icon: <Security /> },
    support: { label: 'サポート', color: '#00BCD4', icon: <Support /> },
    technical: { label: '技術', color: '#F44336', icon: <DevicesOther /> },
  };

  const faqs: FAQItem[] = [
    {
      question: '探Qメイトとは何ですか？',
      answer: '探Qメイトは、中高生の探究学習を支援するAI学習アシスタントです。生徒一人ひとりの興味や学習スタイルに合わせて、テーマ設定から研究、発表まで、探究活動全体をサポートします。「探究的な学び」を「メイト（仲間）」として伴走することから、この名前が付けられました。',
      category: 'basic',
      icon: faqCategories.basic.icon,
    },
    {
      question: 'どのような生徒に向いていますか？',
      answer: '探Qメイトは以下のような生徒に特に適しています：\n・自由研究や探究活動のテーマが決まらない生徒\n・興味はあるが、どう深めていけばよいか分からない生徒\n・一人で探究を進めることに不安を感じる生徒\n・自分のペースで学習を進めたい生徒\n・新しい視点や考え方を得たい生徒',
      category: 'basic',
      icon: faqCategories.basic.icon,
    },
    {
      question: '無料で使えますか？',
      answer: '基本機能は無料でお使いいただけます。無料プランでは、1日あたりのAIとの対話回数に制限がありますが、探究学習の基本的なサポートは十分に受けられます。より高度な機能や無制限の対話を希望される場合は、有料プランもご用意しています。',
      category: 'payment',
      icon: faqCategories.payment.icon,
    },
    {
      question: 'AIは答えを教えてくれますか？',
      answer: '探Qメイトのは、単に答えを提供するのではなく、生徒が自ら考え、発見できるように「問い」を投げかけます。ただし、事実確認や基礎知識については正確な情報を提供します。探究学習の本質である「自ら学ぶ力」を育てることを重視しています。',
      category: 'usage',
      icon: faqCategories.usage.icon,
    },
    {
      question: '学校の授業でも使えますか？',
      answer: 'はい、使えます。総合的な学習の時間、理科の自由研究、社会科の調べ学習など、様々な教科・場面で活用できます。グループでの探究活動にも対応しており、複数の生徒が協力して一つのプロジェクトを進めることも可能です。',
      category: 'usage',
      icon: faqCategories.usage.icon,
    },
    {
      question: '個人情報は安全ですか？',
      answer: '生徒の個人情報保護を最優先に考えています。すべての通信は暗号化され、個人を特定できる情報は最小限に抑えています。また、対話データは学習改善のためにのみ使用され、第三者への提供は行いません。詳細はプライバシーポリシーをご確認ください。',
      category: 'privacy',
      icon: faqCategories.privacy.icon,
    },
    {
      question: '保護者や先生も使えますか？',
      answer: '保護者や先生向けの機能も用意しています。生徒の学習進捗を確認したり、探究活動をサポートするためのアドバイスを受けたりすることができます。ただし、生徒の自主性を尊重し、過度な介入を避けるような設計になっています。',
      category: 'usage',
      icon: faqCategories.usage.icon,
    },
    {
      question: 'スマートフォンでも使えますか？',
      answer: 'はい、スマートフォン、タブレット、パソコンなど、様々なデバイスで利用できます。レスポンシブデザインを採用しており、画面サイズに応じて最適な表示になります。また、オフラインでも一部機能は利用可能です。',
      category: 'technical',
      icon: faqCategories.technical.icon,
    },
    {
      question: '対話履歴は保存されますか？',
      answer: 'はい、対話履歴は自動的に保存されます。過去の対話を振り返ることで、自分の成長や思考の変化を確認できます。また、AIは過去の対話を参照して、より個別化されたサポートを提供します。履歴はいつでも削除可能です。',
      category: 'privacy',
      icon: faqCategories.privacy.icon,
    },
    {
      question: 'サポートはありますか？',
      answer: 'メールサポートとチャットサポートを提供しています。技術的な問題から探究学習の進め方まで、幅広くサポートします。また、よくある質問やチュートリアル動画も充実しており、自己解決も可能です。',
      category: 'support',
      icon: faqCategories.support.icon,
    },
    {
      question: 'AIの回答は信頼できますか？',
      answer: '探QメイトのAIは、信頼性の高い情報源を基に学習しています。ただし、完全ではないため、重要な情報は必ず複数の情報源で確認することを推奨しています。AIは「一緒に考える仲間」であり、最終的な判断は利用者自身が行うことが大切です。',
      category: 'technical',
      icon: faqCategories.technical.icon,
    },
    {
      question: '途中で解約できますか？',
      answer: '有料プランはいつでも解約可能です。解約後も、その月の終わりまではサービスを利用できます。また、これまでの学習データはエクスポート可能なので、別のプラットフォームに移行することも可能です。',
      category: 'payment',
      icon: faqCategories.payment.icon,
    },
  ];

  // カテゴリごとにグループ化
  const groupedFAQs = faqs.reduce((acc, faq) => {
    if (!acc[faq.category]) {
      acc[faq.category] = [];
    }
    acc[faq.category].push(faq);
    return acc;
  }, {} as Record<string, FAQItem[]>);

  return (
    <Box sx={{ py: { xs: 8, md: 12 }, backgroundColor: 'background.default' }}>
      <Container maxWidth="md">
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
              よくある質問（FAQ）
            </Typography>
            <Typography
              variant="h6"
              color="text.secondary"
              sx={{
                fontSize: { xs: '1rem', sm: '1.2rem' },
                maxWidth: 600,
                mx: 'auto',
                lineHeight: 1.6,
              }}
            >
              探Qメイトについてのよくある質問をまとめました。
              お探しの答えが見つからない場合は、お気軽にお問い合わせください。
            </Typography>
          </Box>
        </motion.div>

        {/* カテゴリタグ */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 4, justifyContent: 'center' }}>
          {Object.entries(faqCategories).map(([key, category]) => (
            <Chip
              key={key}
              label={category.label}
              icon={category.icon}
              sx={{
                backgroundColor: `${category.color}20`,
                color: category.color,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: category.color,
                },
              }}
            />
          ))}
        </Box>

        {/* FAQ Accordion */}
        <Box>
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * index }}
            >
              <Accordion
                expanded={expanded === `panel${index}`}
                onChange={handleChange(`panel${index}`)}
                sx={{
                  mb: 2,
                  borderRadius: 2,
                  '&:before': { display: 'none' },
                  boxShadow: expanded === `panel${index}` ? 3 : 1,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: 2,
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMore />}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      alignItems: 'center',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                    <Box
                      sx={{
                        color: faqCategories[faq.category as keyof typeof faqCategories].color,
                        mr: 2,
                        display: { xs: 'none', sm: 'block' },
                      }}
                    >
                      {faq.icon}
                    </Box>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        fontSize: { xs: '0.95rem', sm: '1.1rem' },
                        flex: 1,
                      }}
                    >
                      {faq.question}
                    </Typography>
                    <Chip
                      label={faqCategories[faq.category as keyof typeof faqCategories].label}
                      size="small"
                      sx={{
                        ml: 2,
                        display: { xs: 'none', sm: 'flex' },
                        backgroundColor: `${faqCategories[faq.category as keyof typeof faqCategories].color}20`,
                        color: faqCategories[faq.category as keyof typeof faqCategories].color,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body1"
                    sx={{
                      lineHeight: 1.8,
                      whiteSpace: 'pre-line',
                      pl: { xs: 0, sm: 6 },
                      color: 'text.secondary',
                    }}
                  >
                    {faq.answer}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </motion.div>
          ))}
        </Box>

        {/* お問い合わせCTA */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Box
            sx={{
              mt: 6,
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
                fontSize: { xs: '1.2rem', sm: '1.5rem' },
              }}
            >
              まだ疑問がありますか？
            </Typography>
            <Typography
              variant="body1"
              color="text.secondary"
              sx={{
                maxWidth: 500,
                mx: 'auto',
                lineHeight: 1.6,
                mb: 3,
              }}
            >
              ご不明な点がございましたら、お気軽にお問い合わせください。
              専門スタッフが丁寧にお答えいたします。
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'primary.main',
                fontWeight: 600,
              }}
            >
              お問い合わせ: support@tanqmate.com
            </Typography>
          </Box>
        </motion.div>
      </Container>
    </Box>
  );
};

export default FAQSection;