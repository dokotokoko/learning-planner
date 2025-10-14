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
import { Stack } from '@mui/material';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQSection: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState<string | false>(false);

  const handleChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  const faqs: FAQItem[] = [
    {
      question: '探Qメイトとは何ですか？',
      answer: '探Qメイトは、中高生の探究学習を支援するAI学習アシスタントです。生徒一人ひとりの興味や学習スタイルに合わせて、テーマ設定から研究、発表まで、探究活動全体をサポートします。「探究的な学び」を「メイト（仲間）」として伴走することから、この名前が付けられました。',
    },
    {
      question: 'どのような生徒に向いていますか？',
      answer: '探Qメイトは以下のような生徒に特に適しています：\n・自由研究や探究活動のテーマが決まらない生徒\n・興味はあるが、どう深めていけばよいか分からない生徒\n・一人で探究を進めることに不安を感じる生徒\n・自分のペースで学習を進めたい生徒\n・新しい視点や考え方を得たい生徒',
    },
    {
      question: '利用するために料金は必要ですか？',
      answer: '現在はベータ版として提供しているため、無料でご利用いただけます。ただし、今後のアップデートによって、変更される可能性がございます。。',
    },
    {
      question: 'AIが答えを教えることはありますか？',
      answer: '探Qメイトは、単に答えを提供するのではなく、生徒が自ら考え、探究できるように「問い」を投げかけます。ただし、事実確認や基礎知識については正確な情報を提供します。探究学習の本質である「自ら学ぶ力」を育てることを重視しています。',
    },
    {
      question: 'AIの回答は信頼できますか？',
      answer: '現在、AIの回答を100%信頼できるとは言えません。人と話す時のように、相手の情報が勘違いの場合もあれば、自分の意図が伝わっておらず返答がかみ合わないこともあります。出典がある場合はAIが参考にした情報源をURLで表示されます。',
    },
    {
      question: '会話した内容は生成AIの学習に使用されますか？',
      answer: 'Microsoft Azureの厳格なセキュリティ基準に準拠した生成AI環境を提供し、情報セキュリティリスクを回避する機能を標準搭載していますので、対話内容が生成AIの学習データに利用されることはありません。探Qメイトの対話改善のみに会話データを利用することがあります。',
    },
    {
      question: 'どんなデバイスで使用できますか？',
      answer: 'スマートフォン、タブレット、Chromebookなど、様々なデバイスで利用できます。',
    },
    {
      question: 'どんなサポートがありますか？',
      answer: '下記の問い合わせフォームから24時間ご相談いただけます。技術的な問題から探究学習の進め方、探Qメイトでは上手く行かなかった生徒の悩み等幅広くサポートします。',
    },
    {
      question: 'バグや不具合を発見しました。どうすれば良いですか？',
      answer: 'ご迷惑をおかけしております。こちらのフォームより「バグ報告」を選択して、お問い合わせください',
    },
  ];

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
                background: 'linear-gradient(45deg, #FF7A00, #E55100)',
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
            </Typography>
          </Box>
        </motion.div>

        {/* FAQ Accordion */}
        <Stack spacing={{ xs: 2, sm: 3 }}>
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
                  borderRadius: 2,
                  '&:before': { display: 'none' },
                  boxShadow: expanded === `panel${index}` ? 3 : 1,
                  transition: 'all 0.3s ease',
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
        </Stack>

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
              background: 'linear-gradient(135deg,rgb(253, 180, 137) 0%,rgb(252, 255, 82) 100%)',
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
              お問い合わせフォーム
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
              探究の伴走の経験が豊富な開発者が責任をもって対応いたします。
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