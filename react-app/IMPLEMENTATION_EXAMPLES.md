# 実装例とサンプルコード

※ この引き継ぎ書はClaude 4によって自動生成されたものです。開発者によるレビューはまだ行えていないことをご了承ください。

## 🚀 Step 1: テーマ設定機能の実装例

### 1. 新しいコンポーネントの作成

```typescript
// src/components/ThemeSelector.tsx
import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Chip,
  Button,
  Paper,
  Grid,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

interface Interest {
  id: string;
  text: string;
  category: string;
}

interface ThemeSelectorProps {
  onThemeSelected: (theme: string) => void;
}

const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onThemeSelected }) => {
  const [interests, setInterests] = useState<Interest[]>([]);
  const [currentInterest, setCurrentInterest] = useState('');

  const handleAddInterest = () => {
    if (currentInterest.trim()) {
      const newInterest: Interest = {
        id: Date.now().toString(),
        text: currentInterest.trim(),
        category: 'user-input', // AI分析で後で更新
      };
      setInterests([...interests, newInterest]);
      setCurrentInterest('');
    }
  };

  const handleRemoveInterest = (id: string) => {
    setInterests(interests.filter(interest => interest.id !== id));
  };

  return (
    <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom fontWeight={600}>
        あなたの興味を教えてください
      </Typography>
      
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="興味のあることを入力してください"
          value={currentInterest}
          onChange={(e) => setCurrentInterest(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddInterest()}
          sx={{ mb: 2 }}
        />
        <Button variant="contained" onClick={handleAddInterest}>
          追加
        </Button>
      </Box>

      <AnimatePresence>
        {interests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Typography variant="h6" gutterBottom>
              あなたの興味
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
              {interests.map((interest) => (
                <motion.div
                  key={interest.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Chip
                    label={interest.text}
                    onDelete={() => handleRemoveInterest(interest.id)}
                    color="primary"
                  />
                </motion.div>
              ))}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>

      {interests.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="contained"
            size="large"
            onClick={() => onThemeSelected('AI分析中...')}
            sx={{ mt: 2 }}
          >
            AIにテーマを提案してもらう
          </Button>
        </motion.div>
      )}
    </Paper>
  );
};

export default ThemeSelector;
```

### 2. Step1ページでの使用例

```typescript
// src/pages/Step1Page.tsx
import React, { useState } from 'react';
import { Container, Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import ThemeSelector from '../components/ThemeSelector';
import AIChat from '../components/AIChat';

const Step1Page: React.FC = () => {
  const [phase, setPhase] = useState<'input' | 'chat' | 'confirmation'>('input');
  const [selectedTheme, setSelectedTheme] = useState<string>('');

  const handleThemeSelected = (theme: string) => {
    setSelectedTheme(theme);
    setPhase('chat');
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Typography variant="h4" gutterBottom fontWeight={600}>
          Step 1: テーマ設定
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          あなたの興味から探究テーマを決めましょう
        </Typography>

        {phase === 'input' && (
          <ThemeSelector onThemeSelected={handleThemeSelected} />
        )}

        {phase === 'chat' && (
          <AIChat
            initialMessage="あなたの興味を分析して、探究テーマを提案しますね！"
            onThemeConfirmed={(theme) => {
              setSelectedTheme(theme);
              setPhase('confirmation');
            }}
          />
        )}

        {phase === 'confirmation' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <Typography variant="h5" gutterBottom>
              決定されたテーマ: {selectedTheme}
            </Typography>
            {/* 次のステップへのナビゲーション */}
          </motion.div>
        )}
      </motion.div>
    </Container>
  );
};

export default Step1Page;
```

## 🤖 AIチャット機能の実装例

### 1. チャットコンポーネント

```typescript
// src/components/AIChat.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
} from '@mui/material';
import { Send, Psychology } from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
}

interface AIChatProps {
  initialMessage?: string;
  onThemeConfirmed?: (theme: string) => void;
}

const AIChat: React.FC<AIChatProps> = ({ initialMessage, onThemeConfirmed }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessage) {
      setMessages([{
        id: '1',
        text: initialMessage,
        sender: 'ai',
        timestamp: new Date(),
      }]);
    }
  }, [initialMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    // AI応答のシミュレーション（実際のAPI呼び出しに置き換える）
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateAIResponse(inputText),
        sender: 'ai',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1500);
  };

  const generateAIResponse = (userInput: string): string => {
    // 実際のAI APIに置き換える
    const responses = [
      "それは興味深いですね！もう少し詳しく教えてください。",
      "なるほど、その分野について探究してみましょう。",
      "素晴らしいテーマになりそうです！",
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  return (
    <Paper sx={{ height: 500, display: 'flex', flexDirection: 'column' }}>
      {/* メッセージエリア */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Box
                sx={{
                  display: 'flex',
                  mb: 2,
                  justifyContent: message.sender === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {message.sender === 'ai' && (
                  <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
                    <Psychology />
                  </Avatar>
                )}
                
                <Paper
                  sx={{
                    p: 2,
                    maxWidth: '70%',
                    bgcolor: message.sender === 'user' ? 'primary.main' : 'grey.100',
                    color: message.sender === 'user' ? 'white' : 'text.primary',
                  }}
                >
                  <Typography>{message.text}</Typography>
                </Paper>
              </Box>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {isLoading && (
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Avatar sx={{ mr: 1, bgcolor: 'primary.main' }}>
              <Psychology />
            </Avatar>
            <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
              <Typography>AI が考えています...</Typography>
            </Paper>
          </Box>
        )}
        
        <div ref={messagesEndRef} />
      </Box>

      {/* 入力エリア */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            placeholder="メッセージを入力..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          />
          <IconButton 
            color="primary" 
            onClick={handleSendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Send />
          </IconButton>
        </Box>
      </Box>
    </Paper>
  );
};

export default AIChat;
```

## 📊 データストアの拡張例

### 1. 学習データ用ストア

```typescript
// src/stores/learningStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '../lib/supabase';

interface Interest {
  id: string;
  text: string;
  category: string;
  created_at: Date;
}

interface Goal {
  id: string;
  interest_id: string;
  description: string;
  criteria: string[];
  created_at: Date;
}

interface LearningPlan {
  id: string;
  goal_id: string;
  activities: Activity[];
  timeline: string;
  created_at: Date;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  estimated_time: number;
  priority: 'high' | 'medium' | 'low';
}

interface LearningState {
  currentStep: number;
  interests: Interest[];
  selectedGoal: Goal | null;
  learningPlan: LearningPlan | null;
  
  // Actions
  setCurrentStep: (step: number) => void;
  addInterest: (interest: Omit<Interest, 'id' | 'created_at'>) => void;
  setGoal: (goal: Omit<Goal, 'id' | 'created_at'>) => void;
  setLearningPlan: (plan: Omit<LearningPlan, 'id' | 'created_at'>) => void;
  saveToDatabase: () => Promise<void>;
  loadFromDatabase: (userId: string) => Promise<void>;
}

export const useLearningStore = create<LearningState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      interests: [],
      selectedGoal: null,
      learningPlan: null,

      setCurrentStep: (step) => set({ currentStep: step }),

      addInterest: (interestData) => {
        const newInterest: Interest = {
          ...interestData,
          id: Date.now().toString(),
          created_at: new Date(),
        };
        set((state) => ({
          interests: [...state.interests, newInterest],
        }));
      },

      setGoal: (goalData) => {
        const newGoal: Goal = {
          ...goalData,
          id: Date.now().toString(),
          created_at: new Date(),
        };
        set({ selectedGoal: newGoal });
      },

      setLearningPlan: (planData) => {
        const newPlan: LearningPlan = {
          ...planData,
          id: Date.now().toString(),
          created_at: new Date(),
        };
        set({ learningPlan: newPlan });
      },

      saveToDatabase: async () => {
        const { interests, selectedGoal, learningPlan } = get();
        
        try {
          // Supabaseにデータを保存
          if (interests.length > 0) {
            await supabase.from('interests').upsert(
              interests.map(interest => ({
                id: interest.id,
                user_id: 'current-user-id', // 実際のユーザーIDに置き換え
                interest: interest.text,
                category: interest.category,
              }))
            );
          }

          if (selectedGoal) {
            await supabase.from('goals').upsert({
              id: selectedGoal.id,
              user_id: 'current-user-id',
              interest_id: selectedGoal.interest_id,
              goal: selectedGoal.description,
            });
          }

          // 他のデータも同様に保存
        } catch (error) {
          console.error('データ保存エラー:', error);
        }
      },

      loadFromDatabase: async (userId: string) => {
        try {
          // Supabaseからデータを取得
          const { data: interestsData } = await supabase
            .from('interests')
            .select('*')
            .eq('user_id', userId);

          if (interestsData) {
            const interests: Interest[] = interestsData.map(item => ({
              id: item.id,
              text: item.interest,
              category: item.category || 'general',
              created_at: new Date(item.created_at),
            }));
            set({ interests });
          }

          // 他のデータも同様に取得
        } catch (error) {
          console.error('データ読み込みエラー:', error);
        }
      },
    }),
    {
      name: 'learning-storage',
    }
  )
);
```

## 🎨 高度なアニメーション例

### 1. ページ遷移アニメーション

```typescript
// src/components/PageTransition.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: React.ReactNode;
}

const pageVariants = {
  initial: {
    opacity: 0,
    x: '-100vw',
    scale: 0.8,
  },
  in: {
    opacity: 1,
    x: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    x: '100vw',
    scale: 1.2,
  },
};

const pageTransition = {
  type: 'tween',
  ease: 'anticipate',
  duration: 0.5,
};

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
```

### 2. ステップ進捗アニメーション

```typescript
// src/components/AnimatedStepProgress.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { CheckCircle, RadioButtonUnchecked } from '@mui/icons-material';

interface Step {
  number: number;
  title: string;
  completed: boolean;
}

interface AnimatedStepProgressProps {
  steps: Step[];
  currentStep: number;
}

const AnimatedStepProgress: React.FC<AnimatedStepProgressProps> = ({
  steps,
  currentStep,
}) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
          >
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
              }}
            >
              <motion.div
                animate={{
                  scale: step.number === currentStep ? 1.2 : 1,
                  color: step.completed ? '#4caf50' : step.number === currentStep ? '#2196f3' : '#9e9e9e',
                }}
                transition={{ duration: 0.3 }}
              >
                {step.completed ? (
                  <CheckCircle sx={{ fontSize: 40 }} />
                ) : (
                  <RadioButtonUnchecked sx={{ fontSize: 40 }} />
                )}
              </motion.div>
              
              <Typography
                variant="caption"
                sx={{
                  mt: 1,
                  fontWeight: step.number === currentStep ? 600 : 400,
                  color: step.completed ? 'success.main' : step.number === currentStep ? 'primary.main' : 'text.secondary',
                }}
              >
                {step.title}
              </Typography>
            </Box>
          </motion.div>

          {index < steps.length - 1 && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
            >
              <Box
                sx={{
                  width: 60,
                  height: 2,
                  bgcolor: step.completed ? 'success.main' : 'grey.300',
                  mx: 2,
                  transformOrigin: 'left',
                }}
              />
            </motion.div>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default AnimatedStepProgress;
```

## 🔧 カスタムフックの例

### 1. API通信用フック

```typescript
// src/hooks/useAPI.ts
import { useState, useCallback } from 'react';

interface APIState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

export function useAPI<T>() {
  const [state, setState] = useState<APIState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState({ data: null, loading: true, error: null });
    
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      setState({ data: null, loading: false, error: errorMessage });
      throw error;
    }
  }, []);

  return { ...state, execute };
}

// 使用例
const MyComponent = () => {
  const { data, loading, error, execute } = useAPI<string[]>();

  const fetchThemes = () => {
    execute(async () => {
      const response = await fetch('/api/themes');
      return response.json();
    });
  };

  return (
    <div>
      <button onClick={fetchThemes}>テーマを取得</button>
      {loading && <p>読み込み中...</p>}
      {error && <p>エラー: {error}</p>}
      {data && <ul>{data.map(theme => <li key={theme}>{theme}</li>)}</ul>}
    </div>
  );
};
```

### 2. フォーム管理用フック

```typescript
// src/hooks/useForm.ts
import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  validate?: (values: T) => Partial<Record<keyof T, string>>;
  onSubmit: (values: T) => Promise<void> | void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validate,
  onSubmit,
}: UseFormOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    // エラーをクリア
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  }, [errors]);

  const handleSubmit = useCallback(async () => {
    if (validate) {
      const validationErrors = validate(values);
      setErrors(validationErrors);
      
      if (Object.keys(validationErrors).length > 0) {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isSubmitting,
    setValue,
    handleSubmit,
    reset,
  };
}
```

これらの実装例を参考に、段階的に機能を追加していくことができます。まずは基本的なフォームから始めて、徐々にAI機能やアニメーションを追加していくことをお勧めします。 