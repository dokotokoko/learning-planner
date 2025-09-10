import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';

export type CharacterState = 'idle' | 'thinking' | 'speaking';

type Position = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';

interface AnimatedAICharacterProps {
  state: CharacterState;
  messageHint?: string; // 任意: 状態テキスト
  position?: Position; // 位置の切替
  offset?: { x?: number; y?: number }; // 微調整オフセット(px)
  size?: number; // 直径(px)
  imageSrc?: string; // 差し替え用の任意画像
  colors?: {
    background?: string;
    faceGradientFrom?: string;
    faceGradientTo?: string;
    border?: string;
    eye?: string;
    mouth?: string;
    dot1?: string;
    dot2?: string;
  };
  // 完全差し替え用レンダラ（必要なら）
  renderAvatar?: (state: CharacterState, size: number) => React.ReactNode;
  className?: string;
}

// シンプルな丸顔キャラクタ。目と口をアニメーションさせる
const AnimatedAICharacter: React.FC<AnimatedAICharacterProps> = ({
  state,
  messageHint,
  position = 'bottom-left',
  offset,
  size = 68,
  colors,
  imageSrc,
  renderAvatar,
  className,
}) => {
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';

  const faceSize = Math.round(size * 0.82);
  const base = {
    background: colors?.background,
    faceFrom: colors?.faceGradientFrom ?? '#ffffff',
    faceTo: colors?.faceGradientTo ?? '#dbe9ff',
    border: colors?.border ?? '#b3ccff',
    eye: colors?.eye ?? '#334155',
    mouth: colors?.mouth ?? '#64748b',
    dot1: colors?.dot1 ?? '#94a3b8',
    dot2: colors?.dot2 ?? '#b0bccd',
  };

  const posStyle: React.CSSProperties = (() => {
    const x = offset?.x ?? 12;
    const y = offset?.y ?? 12;
    switch (position) {
      case 'bottom-right':
        return { right: x, bottom: y };
      case 'top-right':
        return { right: x, top: y };
      case 'top-left':
        return { left: x, top: y };
      default:
        return { left: x, bottom: y };
    }
  })();

  return (
    <Box
      className={className}
      sx={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: (theme) =>
          base.background ?? (theme.palette.mode === 'dark' ? '#1e2a38' : '#eaf2ff'),
        boxShadow: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        pointerEvents: 'none', // クリックを透過
        zIndex: 2,
        ...posStyle,
      }}
      aria-label="AIキャラクタ"
    >
      {renderAvatar ? (
        renderAvatar(state, size)
      ) : imageSrc ? (
        <motion.img
          src={imageSrc}
          alt="avatar"
          style={{
            width: faceSize,
            height: faceSize,
            objectFit: 'cover',
            borderRadius: '50%',
            border: `2px solid ${base.border}`,
            background: `linear-gradient(180deg, ${base.faceFrom}, ${base.faceTo})`,
          }}
          animate={{
            rotate: isThinking ? [0, -4, 4, 0] : 0,
            scale: isSpeaking ? [1.0, 1.03, 1.0] : 1.0,
          }}
          transition={{
            duration: isThinking ? 1.2 : 0.6,
            repeat: isThinking || isSpeaking ? Infinity : 0,
            ease: 'easeInOut',
          }}
        />
      ) : (
        <motion.div
          style={{
            width: faceSize,
            height: faceSize,
            borderRadius: '50%',
            background: `linear-gradient(180deg, ${base.faceFrom}, ${base.faceTo})`,
            border: `2px solid ${base.border}`,
            position: 'relative',
          }}
          animate={{
            rotate: isThinking ? [0, -4, 4, 0] : 0,
            scale: isSpeaking ? [1.0, 1.03, 1.0] : 1.0,
          }}
          transition={{
            duration: isThinking ? 1.2 : 0.6,
            repeat: isThinking || isSpeaking ? Infinity : 0,
            ease: 'easeInOut',
          }}
        >
          {/* 目 */}
          <motion.div
            style={{
              position: 'absolute',
              top: Math.round(faceSize * 0.32),
              left: Math.round(faceSize * 0.25),
              width: Math.max(6, Math.round(faceSize * 0.14)),
              height: Math.max(6, Math.round(faceSize * 0.14)),
              borderRadius: '50%',
              background: base.eye,
            }}
            animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 1, 1] }}
            transition={{ duration: isThinking ? 1.2 : 2.5, repeat: isThinking ? Infinity : Infinity, repeatDelay: 1.8 }}
          />
          <motion.div
            style={{
              position: 'absolute',
              top: Math.round(faceSize * 0.32),
              right: Math.round(faceSize * 0.25),
              width: Math.max(6, Math.round(faceSize * 0.14)),
              height: Math.max(6, Math.round(faceSize * 0.14)),
              borderRadius: '50%',
              background: base.eye,
            }}
            animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 1, 1] }}
            transition={{ duration: isThinking ? 1.2 : 2.5, repeat: isThinking ? Infinity : Infinity, repeatDelay: 1.8, delay: 0.1 }}
          />

          {/* 口 */}
          <motion.div
            style={{
              position: 'absolute',
              bottom: Math.round(faceSize * 0.2),
              left: Math.round(faceSize * 0.36),
              right: Math.round(faceSize * 0.36),
              height: Math.max(6, Math.round(faceSize * 0.18)),
              borderRadius: 8,
              background: base.mouth,
            }}
            animate={{ height: isSpeaking ? [8, 14, 8] : isThinking ? 6 : 8 }}
            transition={{ duration: isSpeaking ? 0.4 : 0.8, repeat: isSpeaking ? Infinity : 0, ease: 'easeInOut' }}
          />

          {/* 思考中のフローティングドット */}
          {isThinking && (
            <Box sx={{ position: 'absolute', top: -10, right: -8 }}>
              <motion.div
                style={{ width: 6, height: 6, borderRadius: '50%', background: base.dot1, marginBottom: 2 }}
                animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <motion.div
                style={{ width: 4, height: 4, borderRadius: '50%', background: base.dot2 }}
                animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
              />
            </Box>
          )}
        </motion.div>
      )}

      {/* 状態テキスト（小さめの補助表示） */}
      {messageHint && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: size + 6,
            left: position.includes('left') ? 2 : 'auto',
            right: position.includes('right') ? 2 : 'auto',
            bgcolor: 'background.paper',
            px: 0.8,
            py: 0.2,
            borderRadius: 1,
            boxShadow: 1,
            color: 'text.secondary',
            pointerEvents: 'none',
            maxWidth: 160,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {messageHint}
        </Typography>
      )}
    </Box>
  );
};

export default AnimatedAICharacter;
