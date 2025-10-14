import React, { useRef } from 'react';
import { Box, Fab, useTheme, useMediaQuery } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

// セクションコンポーネントのインポート
import HeroSection from '../components/Guide/HeroSection';
import WhyNeededSection from '../components/Guide/WhyNeededSection';
import HowToUseSection from '../components/Guide/HowToUseSection';
import UseCaseSection from '../components/Guide/UseCaseSection';
import FAQSection from '../components/Guide/FAQSection';

const GuidePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const { user } = useAuthStore();
  
  // セクションへの参照
  const heroRef = useRef<HTMLDivElement>(null);
  const whyRef = useRef<HTMLDivElement>(null);
  const howRef = useRef<HTMLDivElement>(null);
  const useCaseRef = useRef<HTMLDivElement>(null);
  const faqRef = useRef<HTMLDivElement>(null);

  // スムーズスクロール関数
  const scrollToSection = (ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  };

  // 上部へのスクロール
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // 探Qメイトを始めるハンドラー
  const handleGetStarted = () => {
    if (user) {
      // ログイン済みの場合、直接アプリへ
      navigate('/app');
    } else {
      // 未ログインの場合、ログインページへ
      navigate('/login');
    }
  };

  // 詳しく見るハンドラー（WhyNeededSectionへスクロール）
  const handleLearnMore = () => {
    scrollToSection(whyRef);
  };

  // デモを見るハンドラー（実際のデモ動画がある場合に実装）
  const handleWatchDemo = () => {
    // 将来的にデモ動画のモーダルを開くなどの実装
    console.log('デモを開く予定');
    // 現在は使い方セクションへスクロール
    scrollToSection(howRef);
  };

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Hero Section */}
      <Box ref={heroRef}>
        <HeroSection 
          onGetStarted={handleGetStarted}
          onLearnMore={handleLearnMore}
        />
      </Box>

      {/* Why Needed Section */}
      <Box ref={whyRef}>
        <WhyNeededSection />
      </Box>

      {/* How To Use Section */}
      <Box ref={howRef}>
        <HowToUseSection />
      </Box>

      {/* Use Case Section */}
      <Box ref={useCaseRef}>
        <UseCaseSection />
      </Box>

      {/* FAQ Section */}
      <Box ref={faqRef}>
        <FAQSection />
      </Box>

      {/* フローティングナビゲーション（上に戻るボタン） */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            position: 'fixed',
            bottom: isMobile ? 20 : 32,
            right: isMobile ? 20 : 32,
            zIndex: 1000,
          }}
        >
          <Fab
            color="primary"
            size={isMobile ? 'medium' : 'large'}
            onClick={scrollToTop}
            sx={{
              background: 'linear-gradient(45deg, #FF7A00, #FF9500)',
              '&:hover': {
                background: 'linear-gradient(45deg, #FFB347, #FF6B35)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 25px rgba(255,122,0,0.3)',
            }}
            aria-label="上に戻る"
          >
            <KeyboardArrowUp />
          </Fab>
        </motion.div>
      </AnimatePresence>

      {/* 簡易ナビゲーションドット（デスクトップのみ） */}
      {!isMobile && (
        <Box
          sx={{
            position: 'fixed',
            right: 32,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {[
            { ref: heroRef, label: 'トップ' },
            { ref: whyRef, label: '機能の特徴' },
            { ref: howRef, label: '使い方' },
            { ref: useCaseRef, label: 'UseCase' },
            { ref: faqRef, label: 'FAQ' },
          ].map((section, index) => (
            <motion.div
              key={index}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
            >
              <Box
                onClick={() => scrollToSection(section.ref)}
                sx={{
                  width: 12,
                  height: 12,
                  borderRadius: '50%',
                  backgroundColor: '#FF7A00',
                  cursor: 'pointer',
                  opacity: 0.6,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    opacity: 1,
                    backgroundColor: '#FF6B35',
                    transform: 'scale(1.2)',
                  },
                }}
                title={section.label}
              />
            </motion.div>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default GuidePage;