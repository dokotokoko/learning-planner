import React from 'react';
import { motion } from 'framer-motion';
import { Box, Typography } from '@mui/material';

export type CharacterState = 'idle' | 'thinking' | 'speaking';

interface AnimatedAICharacterProps {
  state: CharacterState;
  messageHint?: string; // 任意: 状態テキスト
}

// シンプルな丸顔キャラクタ。目と口をアニメーションさせる
const AnimatedAICharacter: React.FC<AnimatedAICharacterProps> = ({ state, messageHint }) => {
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';

  return (
    <Box
      sx={{
        position: 'absolute',
        left: 12,
        bottom: 12,
        width: 68,
        height: 68,
        borderRadius: '50%',
        background: (theme) => theme.palette.mode === 'dark' ? '#1e2a38' : '#eaf2ff',
        boxShadow: 3,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none',
        pointerEvents: 'none', // クリックを透過
        zIndex: 2,
      }}
      aria-label="AIキャラクタ"
    >
      {/* 顔 */}
      <motion.div
        style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: 'linear-gradient(180deg, #ffffff, #dbe9ff)',
          border: '2px solid #b3ccff',
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
          style={{ position: 'absolute', top: 18, left: 14, width: 8, height: 8, borderRadius: '50%', background: '#334155' }}
          animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 1, 1] }}
          transition={{ duration: isThinking ? 1.2 : 2.5, repeat: isThinking ? Infinity : Infinity, repeatDelay: 1.8 }}
        />
        <motion.div
          style={{ position: 'absolute', top: 18, right: 14, width: 8, height: 8, borderRadius: '50%', background: '#334155' }}
          animate={{ scaleY: isThinking ? [1, 0.2, 1] : [1, 1, 1] }}
          transition={{ duration: isThinking ? 1.2 : 2.5, repeat: isThinking ? Infinity : Infinity, repeatDelay: 1.8, delay: 0.1 }}
        />

        {/* 口 */}
        <motion.div
          style={{ position: 'absolute', bottom: 12, left: 20, right: 20, height: 10, borderRadius: 8, background: '#64748b' }}
          animate={{ height: isSpeaking ? [8, 14, 8] : isThinking ? 6 : 8 }}
          transition={{ duration: isSpeaking ? 0.4 : 0.8, repeat: isSpeaking ? Infinity : 0, ease: 'easeInOut' }}
        />

        {/* 思考中のフローティングドット */}
        {isThinking && (
          <Box sx={{ position: 'absolute', top: -10, right: -8 }}>
            <motion.div
              style={{ width: 6, height: 6, borderRadius: '50%', background: '#94a3b8', marginBottom: 2 }}
              animate={{ y: [0, -6, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              style={{ width: 4, height: 4, borderRadius: '50%', background: '#b0bccd' }}
              animate={{ y: [0, -4, 0], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            />
          </Box>
        )}
      </motion.div>

      {/* 状態テキスト（小さめの補助表示） */}
      {messageHint && (
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: 74,
            left: 2,
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

