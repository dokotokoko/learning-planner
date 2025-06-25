// react-app/src/pages/StepPage.tsx
import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Box, 
  Typography, 
  Paper, 
  Button, 
  TextField, 
  Alert,
  Card,
  CardContent,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  LightbulbOutlined as IdeaIcon,
  TipsAndUpdates as ThemeIcon,
  TrackChanges as GoalIcon,
  Assignment as PlanIcon,
  Assessment as ReviewIcon,
  Note as NoteIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import StepProgressBar from '../components/Layout/StepProgressBar';
import WorkspaceWithAI from '../components/MemoChat/WorkspaceWithAI';
import AIChat from '../components/MemoChat/AIChat';
import { useAuthStore } from '../stores/authStore';
import { LayoutContext } from '../components/Layout/Layout';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useTheme } from '@mui/material';

const StepPage: React.FC = () => {
  const { stepNumber } = useParams<{ stepNumber: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { sidebarOpen, onSidebarToggle } = useContext(LayoutContext);
  const muiTheme = useTheme();
  const currentStep = parseInt(stepNumber || '1');

  const [theme, setTheme] = useState('');
  const [goal, setGoal] = useState('');
  const [workContent, setWorkContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [isMemoOpen, setIsMemoOpen] = useState(false);
  const [hasStepAutoMessage, setHasStepAutoMessage] = useState(false);
  const [isStep2MemoOpen, setIsStep2MemoOpen] = useState(false);
  const [forceRefreshChat, setForceRefreshChat] = useState(false);
  const [previousStep, setPreviousStep] = useState(currentStep);
  
  const [step1Theme, setStep1Theme] = useState(''); // Step1で入力した探究テーマ
  const [step2Theme, setStep2Theme] = useState(''); // Step2で考えた探究テーマ
  const [step3Theme, setStep3Theme] = useState(''); // Step3で考えた探究テーマ
  const [step4Theme, setStep4Theme] = useState(''); // Step4で考えた探究テーマ

  // ステップ変更時のチャットリフレッシュ処理
  useEffect(() => {
    if (previousStep !== currentStep) {
      // 実際にステップが変更された場合のみチャットをリフレッシュ
      setForceRefreshChat(true);
      setTimeout(() => setForceRefreshChat(false), 100);
      setPreviousStep(currentStep);
    }
  }, [currentStep, previousStep]);

  // データの初期ロード
  useEffect(() => {
    const loadData = async () => {
      try {
        // Step1で保存されたテーマを読み込み
        const savedTheme = localStorage.getItem('step-1-theme');
        if (savedTheme && currentStep >= 2) {
          setTheme(savedTheme);
        }
        
        // Step2以降では、前のステップで保存されたテーマを読み込み
        if (currentStep === 3) {
          const step2SavedTheme = localStorage.getItem('step-2-theme');
          if (step2SavedTheme) {
            setTheme(step2SavedTheme);
          }
        } else if (currentStep === 4) {
          const step3SavedTheme = localStorage.getItem('step-3-theme');
          if (step3SavedTheme) {
            setTheme(step3SavedTheme);
          }
        }
        
        // 既存の作業内容を読み込み
        const savedContent = localStorage.getItem(`step-${currentStep}-content`);
        if (savedContent) {
          setWorkContent(savedContent);
        }
        
        // 各ステップのテーマを読み込み
        if (currentStep === 1) {
          const savedTheme = localStorage.getItem('step-1-theme');
          if (savedTheme) {
            setStep1Theme(savedTheme);
          }
        } else if (currentStep === 2) {
          const savedTheme = localStorage.getItem('step-2-theme');
          if (savedTheme) {
            setStep2Theme(savedTheme);
          }
        } else if (currentStep === 3) {
          const savedTheme = localStorage.getItem('step-3-theme');
          if (savedTheme) {
            setStep3Theme(savedTheme);
          }
        } else if (currentStep === 4) {
          const savedTheme = localStorage.getItem('step-4-theme');
          if (savedTheme) {
            setStep4Theme(savedTheme);
          }
        }
        
        // 各ステップでの自動初期メッセージ送信をチェック
        const autoMessageSent = localStorage.getItem(`step${currentStep}-auto-message-sent`);
        setHasStepAutoMessage(!!autoMessageSent);
      } catch (error) {
        console.error('データ読み込みエラー:', error);
        setError('データの読み込みに失敗しました');
      }
    };

    loadData();
  }, [currentStep, user]);

  // Step2以降でテーマが読み込まれた時の自動初期メッセージ送信とLLMとの対話開始
  useEffect(() => {
    if (currentStep >= 2 && theme && !hasStepAutoMessage) {
      const initStepAIChat = async () => {
        try {
          let initialMessage = '';
          switch (currentStep) {
            case 2:
              initialMessage = generateStep2InitialMessage(theme);
              break;
            case 3:
              initialMessage = generateStep3InitialMessage(theme);
              break;
            case 4:
              initialMessage = generateStep4InitialMessage(theme);
              break;
          }
          
          // LLMからの初期応答を生成
          const aiResponse = await handleAIMessage(
            `初期設定: 探究テーマ「${theme}」について${
              currentStep === 2 ? '深める対話' : 
              currentStep === 3 ? '自分事として捉える対話' : 
              '社会と繋がる対話'
            }を開始します。`,
            ''
          );
          
          // 自動メッセージ送信済みフラグを設定
          localStorage.setItem(`step${currentStep}-auto-message-sent`, 'true');
          localStorage.setItem(`step${currentStep}-initial-ai-response`, aiResponse);
          setHasStepAutoMessage(true);
        } catch (error) {
          console.error(`Step${currentStep} AI初期化エラー:`, error);
        }
      };

      initStepAIChat();
    }
  }, [currentStep, theme, hasStepAutoMessage]);

  // 各ステップの初期メッセージを生成
  const generateStep2InitialMessage = (userTheme: string): string => {
    return `こんにちは！あなたの探究テーマ「${userTheme}」について、多角的な視点から深く考察していきましょう。

まず、このテーマについて以下の観点から一緒に考えてみませんか：

• このテーマの背景や歴史はどのようなものでしょうか？
• 現在どのような研究や取り組みが行われていますか？
• このテーマに関連する異なる立場や考え方はありますか？
• このテーマの未来の可能性や課題は何でしょうか？

お気軽にお話しください！`;
  };

  const generateStep3InitialMessage = (userTheme: string): string => {
    return `こんにちは！Step2で深く考察した探究テーマ「${userTheme}」を、もっと身近で自分事として捉えられる問いに発展させていきましょう。

まず、以下について一緒に考えてみませんか：

1. このテーマに関連して、あなた自身が実際に経験したことはありますか？
2. 家族や友人、身近な人たちとこのテーマの関連はありますか？
3. このテーマについて、あなたが特に「なぜ？」「どうして？」と感じる部分はありますか？
4. 将来の自分にとって、このテーマはどのような意味を持ちそうですか？

お気軽にお話しください！`;
  };

  const generateStep4InitialMessage = (userTheme: string): string => {
    return `お疲れ様でした！これまでのステップで、あなたの探究テーマ「${userTheme}」がより深く、そして自分事として捉えられるようになりましたね。

最後に、このテーマを社会全体の課題や他の人々の関心と結びつけて考えてみましょう。

以下について一緒に考えてみませんか：

1. あなたのテーマは、現在の社会でどのような課題と関連していますか？
2. このテーマについて、他の同世代の人たちはどのように感じていると思いますか？
3. あなたの探究が進んだ時、どのような人たちの役に立てるでしょうか？
4. このテーマを通じて、社会にどのような変化や影響を与えたいですか？

お気軽にお話しください！`;
  };

  // AI応答の処理（FastAPI バックエンド経由）
  const handleAIMessage = async (message: string, workContent: string): Promise<string> => {
    try {
      // ユーザーIDを取得
      let userId = null;
      
      // auth-storageからユーザーIDを取得
      const authData = localStorage.getItem('auth-storage');
      if (authData) {
        try {
          const parsed = JSON.parse(authData);
          if (parsed.state?.user?.id) {
            userId = parsed.state.user.id;
          }
        } catch (e) {
          console.error('認証データの解析に失敗:', e);
        }
      }

      if (!userId) {
        throw new Error('ユーザーIDが見つかりません。再ログインしてください。');
      }

      // FastAPI バックエンドに接続
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userId}`,
        },
        body: JSON.stringify({
          message: message,
          page: `step_${currentStep}`,
          context: `現在のステップ: Step ${currentStep}
探究テーマ: ${theme || '（未設定）'}
学習目標: ${goal || '（未設定）'}`
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error) {
      console.error('AI API エラー:', error);
      
      // フォールバック：ローカル応答
      return new Promise((resolve) => {
        setTimeout(() => {
          let response = '';
          
          switch (currentStep) {
            case 1:
              response = `「${message}」について考えてみますね。\n\n興味を探究テーマに発展させるには、以下の点を考えてみてください：\n\n1. なぜそれに興味を持ったのか？\n2. その分野で解決したい問題は何か？\n3. 他の人も関心を持ちそうな課題は何か？\n\n${workContent ? 'ワークスペースの内容' : '思いついたこと'}を具体的なテーマに絞り込んでいきましょう！`;
              break;
            case 2:
              // Step2では深める対話
              if (message.includes('背景') || message.includes('歴史')) {
                response = `なるほど、「${theme}」の背景や歴史について興味があるのですね。\n\n歴史的な視点から見ると、このテーマはどのような変遷を辿ってきたのでしょうか？また、現在までの発展過程で、どのような転換点や重要な出来事があったと思いますか？\n\n${workContent ? 'ワークスペースに記録した内容も参考にしながら' : '思いついたことを整理しながら'}、一緒に深めていきましょう！`;
              } else if (message.includes('研究') || message.includes('取り組み')) {
                response = `素晴らしい着眼点ですね！現在の研究や取り組みについて考えることで、このテーマの最前線が見えてきます。\n\nでは、さらに視点を広げて考えてみませんか：\n• 異なる立場の人々（研究者、実践者、利用者など）は、このテーマをどのように捉えているでしょうか？\n• 賛成の意見と反対の意見、それぞれどのような根拠があるでしょうか？\n\n多角的な視点から考えることで、より深い理解に繋がります。`;
              } else if (message.includes('立場') || message.includes('考え方') || message.includes('視点')) {
                response = `とても重要な観点ですね！異なる立場や考え方を理解することで、テーマの複雑さと豊かさが見えてきます。\n\n最後に、未来の視点も加えて考えてみましょう：\n• このテーマは将来どのような方向に発展していく可能性がありますか？\n• 10年後、20年後にはどのような課題や機会が生まれるでしょうか？\n• あなた自身は、このテーマの未来にどのように関わっていけるでしょうか？\n\n未来への展望を含めて、テーマを多面的に捉えてみてください。`;
              } else {
                response = `「${message}」について詳しく教えてくださり、ありがとうございます。\n\nこれまでの対話を通じて、「${theme}」についてより深く、多角的に考察できましたね。\n\n次のステップでは、このテーマをあなた自身の経験や価値観と結びつけて、より身近で自分事として捉えられる問いを考えていきます。\n\nワークスペースに今回の気づきや考えを整理して、準備ができたら次のステップに進んでください！`;
              }
              break;
            case 3:
              // Step3では自分事の問いづくり
              if (message.includes('経験') || message.includes('体験')) {
                response = `素晴らしいですね！あなたの経験と「${theme}」との繋がりが見えてきました。\n\nその経験から生まれる疑問や問いを考えてみませんか：\n• その経験を通じて、「なぜ？」「どうして？」と感じたことはありますか？\n• 同じような経験をした他の人たちも、同じように感じるでしょうか？\n• その経験をもっと良いものにするには、何が必要だと思いますか？\n\n体験から生まれる問いは、探究の原動力になります。`;
              } else if (message.includes('価値観') || message.includes('大切') || message.includes('信念')) {
                response = `あなたの価値観とテーマとの関連がとても興味深いですね。\n\n価値観に基づいた問いを立ててみましょう：\n• あなたが大切にしていることと、このテーマはどのように繋がっていますか？\n• 理想的な状態と現実との間に、どのようなギャップがありますか？\n• あなたの価値観から見て、このテーマで最も重要な課題は何でしょうか？\n\n価値観に根ざした問いは、持続的な探究の動機となります。`;
              } else if (message.includes('将来') || message.includes('夢') || message.includes('目標')) {
                response = `将来への想いとテーマとの関連、とても重要な視点ですね。\n\n将来を見据えた問いを考えてみましょう：\n• あなたの将来の夢や目標に向けて、このテーマはどのような意味を持ちますか？\n• このテーマを通じて、将来のあなたはどのような価値を提供できるでしょうか？\n• 理想の未来を実現するために、このテーマで解決すべき課題は何ですか？\n\n未来への展望が、探究の方向性を明確にしてくれます。`;
              } else {
                response = `「${message}」について、とても深く考えてくださっていますね。\n\nこれまでの対話を通じて、「${theme}」があなた自身の経験や価値観、将来への想いと深く結びついてきました。\n\nワークスペースに「自分事の問い」をまとめて、次のステップで社会との繋がりを考えていきましょう。きっと、より意義深い探究テーマになりますよ！`;
              }
              break;
            case 4:
              // Step4では社会と繋がるテーマにする
              if (message.includes('社会') || message.includes('課題') || message.includes('問題')) {
                response = `社会課題との関連について考えてくださったのですね。とても重要な視点です。\n\nさらに具体的に考えてみましょう：\n• この社会課題は、どのような人々に影響を与えていますか？\n• あなたの探究によって、その課題の解決にどのように貢献できるでしょうか？\n• 同世代の仲間たちも、この課題について関心を持ってくれるでしょうか？\n\n社会への具体的な貢献の道筋が見えてくると、探究の意義がより明確になります。`;
              } else if (message.includes('同世代') || message.includes('仲間') || message.includes('友人')) {
                response = `同世代の視点、とても大切ですね！あなたの探究が多くの人に響く可能性を感じます。\n\n他者への影響を考えてみましょう：\n• あなたの探究結果を、同世代の人たちにどのように伝えたいですか？\n• この探究を通じて、どのような気づきや変化を他の人にもたらしたいですか？\n• あなたの探究が、社会全体にどのような波及効果をもたらす可能性がありますか？\n\n他者との共有や影響を考えることで、探究の社会的価値が高まります。`;
              } else if (message.includes('役に立つ') || message.includes('貢献') || message.includes('価値')) {
                response = `素晴らしい！社会への貢献意識が明確になってきましたね。\n\n実社会での応用可能性を考えてみましょう：\n• あなたの探究は、将来どのような職業や分野で活かせるでしょうか？\n• 実際に実現可能な取り組みとして、どのようなアクションが考えられますか？\n• この探究を継続的な社会貢献活動に発展させるには、どうすればよいでしょうか？\n\n具体的な実現方法を考えることで、探究の実践的価値が見えてきます。`;
              } else {
                response = `「${message}」について、とても深く考えてくださっていますね。\n\n素晴らしいです！これまでの4つのステップを通じて、あなたの探究テーマ「${theme}」が：\n\n• 多角的な視点から深く考察され\n• あなた自身の経験や価値観と結びつき\n• 社会課題や他者への貢献と繋がる\n\n意義深いテーマに発展しました。\n\nワークスペースに最終的な「社会と繋がるテーマ」をまとめて、探究学習のスタート準備を完了させましょう！`;
              }
              break;
            default:
              response = 'ご質問ありがとうございます。詳しくお答えします。';
          }
          
          resolve(response);
        }, 1500);
      });
    }
  };

  const stepContent = {
    1: {
      title: 'Step 1: 探究テーマを入力',
      description: '興味から探究テーマを具体化しましょう',
      workPlaceholder: `あなたの興味や関心について自由に書いてください...

【ガイダンス】
以下の観点から探究テーマを考えてみましょう：

■ 興味・関心の領域
• 社会問題や身近な疑問・課題
• 将来の夢や目標に関連するテーマ
• これまでに学んできた中で特に興味を持ったこと
• 最近気になっているニュースや出来事

■ テーマの絞り込み
• なぜそれに興味を持ったのか？
• その分野で解決したい問題は何か？
• 他の人も関心を持ちそうな課題は何か？
• 実際に調査・研究できそうな範囲か？

■ 最終的なテーマ（例）
• 「AIによるメタ認知支援」
• 「地域活性化とSNSの関係性」
• 「学習効率を高める環境デザイン」

右下のAIボタンから質問・相談ができます。`,
      aiButtonText: 'テーマ設定AI',
      initialMessage: `こんにちは！探究学習のテーマ設定をお手伝いします。

まずは、あなたが興味を持っていることについて教えてください。どんな小さなことでも構いません。

例えば：
• 最近気になっているニュース
• 将来やってみたい仕事
• 解決したいと思う身近な問題
• 趣味や好きなこと

ワークスペースに思いついたことを書きながら、お気軽にお話しください！`,
    },
    2: {
      title: 'Step 2: 深める対話',
      description: 'AIとの対話を通じて探究テーマを多角的な視点から深く考察しましょう',
      workPlaceholder: 'AI対話を通じて考えたことや新たな気づきを記録してください...',
      aiButtonText: 'AI',
      initialMessage: '', // 動的に設定される
    },
    3: {
      title: 'Step 3: 自分事の問いを立てる',
      description: '探究テーマを自分自身の経験や価値観と結びつけ、内発的動機を高めましょう',
      workPlaceholder: `AIとの対話を通じて考えた「自分事の問い」を記録してください...

【ガイダンス】
以下の観点から自分事の問いを考えてみましょう：

■ 個人的な経験との関連
• 過去の体験や経験との結びつき
• 家族や友人との関係性
• 今までの学習や活動での気づき

■ 価値観・信念との関連
• 大切にしている価値観
• 将来の夢や目標との関係
• 解決したい身近な課題

■ 現在の生活との関連
• 日常生活での疑問や問題
• 学校や地域での課題
• 将来への不安や期待

AIアシスタントが自分事の問いづくりをサポートします。`,
      aiButtonText: 'AI',
      initialMessage: '', // 動的に設定される
    },
    4: {
      title: 'Step 4: 社会と繋がるテーマにする',
      description: '個人的な関心を社会課題や実社会の文脈と結びつけ、探究の社会的意義を明確化しましょう',
      workPlaceholder: `AIとの対話を通じて考えた「社会と繋がるテーマ」を記録してください...

【ガイダンス】
以下の観点から社会的な視点を考えてみましょう：

■ 社会課題との関連
• 現在の社会問題や課題との関係
• 地域コミュニティでの課題
• 世代を超えた共通の関心事

■ 他者への影響・貢献
• 同世代の仲間への影響
• 社会に与えられる価値
• 解決できる問題や改善点

■ 実社会での応用可能性
• 将来の職業や進路との関連
• 実際に実現可能な取り組み
• 継続的な社会貢献の可能性

■ 多様な視点からの検討
• 異なる立場の人々の視点
• 国際的・グローバルな視点
• 持続可能性の観点

AIアシスタントが社会との繋がりを見つけることをサポートします。`,
      aiButtonText: 'AI',
      initialMessage: '', // 動的に設定される
    },
  };

  const content = stepContent[currentStep as keyof typeof stepContent];

  // データ保存処理
  const handleSave = async () => {
    try {
      // LocalStorageに保存
      localStorage.setItem(`step-${currentStep}-content`, workContent);
      // TODO: Supabaseに保存
      console.log(`Step ${currentStep} saved:`, workContent);
      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);
    } catch (error) {
      console.error('保存エラー:', error);
      setError('保存に失敗しました');
    }
  };

  // ナビゲーション
  const handleNext = () => {
    // 各ステップでテーマの入力をチェック
    if (currentStep === 1) {
      if (!step1Theme.trim()) {
        setError('探究テーマを入力してから次へ進んでください');
        return;
      }
      // テーマを保存
      localStorage.setItem('step-1-theme', step1Theme);
      setTheme(step1Theme);
      // Step2の自動メッセージフラグをリセット
      localStorage.removeItem('step2-auto-message-sent');
    } else if (currentStep === 2) {
      if (!step2Theme.trim()) {
        setError('このステップで考えた探究テーマを入力してから次へ進んでください');
        return;
      }
      // Step2のテーマを保存
      localStorage.setItem('step-2-theme', step2Theme);
      setTheme(step2Theme);
      // Step3の自動メッセージフラグをリセット
      localStorage.removeItem('step3-auto-message-sent');
      // 現在のフラグもリセット
      setHasStepAutoMessage(false);
    } else if (currentStep === 3) {
      if (!step3Theme.trim()) {
        setError('このステップで考えた探究テーマを入力してから次へ進んでください');
        return;
      }
      // Step3のテーマを保存
      localStorage.setItem('step-3-theme', step3Theme);
      setTheme(step3Theme);
      // Step4の自動メッセージフラグをリセット
      localStorage.removeItem('step4-auto-message-sent');
      // 現在のフラグもリセット
      setHasStepAutoMessage(false);
    } else if (currentStep === 4) {
      if (!step4Theme.trim()) {
        setError('最終的な探究テーマを入力してから完了してください');
        return;
      }
      // Step4のテーマを保存
      localStorage.setItem('step-4-theme', step4Theme);
      // Step4の場合、ホームに戻る
      navigate('/home');
      return;
    }
    
    // 現在の内容を保存してから次へ
    handleSave();
    
    if (currentStep < 4) {
      navigate(`/step/${currentStep + 1}`);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      navigate(`/step/${currentStep - 1}`);
    }
  };

  return (
    <Box sx={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      {/* ホバー表示のProgressBar */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 'auto',
          minWidth: '400px',
          height: '80px', // ホバーコンテンツが表示される十分な高さ
          backgroundColor: 'transparent',
          zIndex: 1200,
          cursor: 'pointer',
          '&:hover': {
            '& [data-progress-bar]': {
              backgroundColor: 'background.paper',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
            },
            '& [data-hover-content]': {
              opacity: 1,
              transform: 'translateX(-50%) translateY(0)',
            },
          },
        }}
      >
        {/* プログレスバーコンテナ */}
        <Box
          data-progress-bar
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.05)',
            borderRadius: '0 0 16px 16px',
            transition: 'all 0.3s ease',
            overflow: 'hidden',
          }}
        >
          {/* プログレスバー（進捗表示） */}
          <Box
            sx={{
              height: '100%',
              backgroundColor: 'primary.main',
              width: `${(currentStep / 4) * 100}%`,
              transition: 'width 0.3s ease',
            }}
          />
        </Box>
        
        {/* ホバー時に表示される詳細情報 */}
        <Box
          data-hover-content
          sx={{
            opacity: 0,
            transform: 'translateX(-50%) translateY(-10px)',
            transition: 'all 0.3s ease',
            px: 2.5,
            py: 1.5,
            position: 'absolute',
            top: '10px',
            left: '50%',
            backgroundColor: 'background.paper',
            borderRadius: '12px',
            pointerEvents: 'none', // ホバーコンテンツがマウスイベントを妨害しないようにする
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)',
            whiteSpace: 'nowrap',
            minWidth: 'max-content',
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, textAlign: 'center', fontSize: '0.9rem' }}>
            {content?.title}
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            pointerEvents: 'auto', // StepProgressBarはクリック可能にする
            '& .MuiBox-root': {
              transform: 'scale(0.85)',
            }
          }}>
            <StepProgressBar 
              currentStep={currentStep} 
              onStepClick={(step) => navigate(`/step/${step}`)}
              clickable
              compact
            />
          </Box>
        </Box>
      </Box>

      {/* メインワークスペース */}
      <Box sx={{ flex: 1, mt: '12px' }}>
        {currentStep === 1 ? (
          /* Step1専用UI */
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            {/* ヘッダー */}
            <Box sx={{ 
              borderBottom: 1, 
              borderColor: 'divider',
              p: 3,
              backgroundColor: 'background.paper',
            }}>
              <Typography variant="h5" fontWeight={600} gutterBottom>
                {content?.title}
              </Typography>
              {content?.description && (
                <Typography variant="body2" color="text.secondary">
                  {content?.description}
                </Typography>
              )}
            </Box>

            {/* Step1メインコンテンツ */}
            <Box sx={{ flex: 1, p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* テーマ入力エリア */}
              <Box sx={{ p: 3, backgroundColor: 'background.paper', borderRadius: 1 }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  探究テーマを決めましょう
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  あなたが興味を持っている分野から、探究したいテーマを1つ決めてください
                </Typography>
                <TextField
                  fullWidth
                  value={step1Theme}
                  onChange={(e) => setStep1Theme(e.target.value)}
                  placeholder="例：AIによるメタ認知支援、地域活性化とSNSの関係性、学習効率を高める環境デザイン"
                  variant="outlined"
                  sx={{ mb: 2 }}
                />
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary">
                    興味のある分野や解決したい問題を具体的に表現してみてください
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {step1Theme.length} 文字
                  </Typography>
                </Stack>
              </Box>

              {/* 思考整理エリア（メモ帳機能付き） */}
              {isMemoOpen ? (
                /* メモ帳分割表示 */
                <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'background.paper', borderRadius: 1 }}>
                  <PanelGroup direction="horizontal" style={{ height: '100%' }}>
                    {/* ガイダンスパネル */}
                    <Panel defaultSize={60} minSize={40} maxSize={80}>
                      <Box sx={{ height: '100%', p: 3, overflow: 'auto' }}>
                                      <Typography variant="h6" gutterBottom>
                思考の整理
              </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          テーマを決めるために、以下について考えてみましょう
                        </Typography>

                        <Stack spacing={2}>
                          <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              興味・関心の領域
                            </Typography>
                            <List dense>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 20 }}>
                                  <Typography variant="body2">•</Typography>
                                </ListItemIcon>
                                <ListItemText primary="社会問題や身近な疑問・課題" primaryTypographyProps={{ variant: 'body2' }} />
                              </ListItem>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 20 }}>
                                  <Typography variant="body2">•</Typography>
                                </ListItemIcon>
                                <ListItemText primary="将来の夢や目標に関連するテーマ" primaryTypographyProps={{ variant: 'body2' }} />
                              </ListItem>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 20 }}>
                                  <Typography variant="body2">•</Typography>
                                </ListItemIcon>
                                <ListItemText primary="これまでに学んできた中で特に興味を持ったこと" primaryTypographyProps={{ variant: 'body2' }} />
                              </ListItem>
                            </List>
                          </Box>

                          <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
                            <Typography variant="subtitle2" gutterBottom>
                              テーマの絞り込み
                            </Typography>
                            <List dense>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 20 }}>
                                  <Typography variant="body2">•</Typography>
                                </ListItemIcon>
                                <ListItemText primary="なぜそれに興味を持ったのか？" primaryTypographyProps={{ variant: 'body2' }} />
                              </ListItem>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 20 }}>
                                  <Typography variant="body2">•</Typography>
                                </ListItemIcon>
                                <ListItemText primary="その分野で解決したい問題は何か？" primaryTypographyProps={{ variant: 'body2' }} />
                              </ListItem>
                              <ListItem sx={{ py: 0 }}>
                                <ListItemIcon sx={{ minWidth: 20 }}>
                                  <Typography variant="body2">•</Typography>
                                </ListItemIcon>
                                <ListItemText primary="実際に調査・研究できそうな範囲か？" primaryTypographyProps={{ variant: 'body2' }} />
                              </ListItem>
                            </List>
                          </Box>
                        </Stack>
                      </Box>
                    </Panel>

                    {/* リサイズハンドル */}
                    <PanelResizeHandle>
                      <Box
                        sx={{
                          width: '1px',
                          height: '100%',
                          backgroundColor: 'divider',
                          cursor: 'col-resize',
                        }}
                      />
                    </PanelResizeHandle>

                    {/* メモ帳パネル */}
                    <Panel defaultSize={40} minSize={20} maxSize={60}>
                      <Box sx={{ 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        backgroundColor: 'background.default',
                      }}>
                        {/* メモ入力エリア */}
                        <Box sx={{ 
                          flex: 1, 
                          p: 2,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          position: 'relative',
                        }}>
                          {/* 閉じるボタン */}
                          <IconButton 
                            onClick={() => setIsMemoOpen(false)} 
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              right: 8,
                              zIndex: 1,
                              backgroundColor: 'background.paper',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                          >
                            <CloseIcon />
                          </IconButton>
                          
                          <TextField
                            multiline
                            fullWidth
                            rows={8}
                            value={workContent}
                            onChange={(e) => setWorkContent(e.target.value)}
                            placeholder={`思考の整理や一時的なメモを自由に書いてください...

例：
• 思いついたアイデア
• 調べたいこと
• 重要なポイント
• 質問したいこと`}
                            variant="outlined"
                            sx={{
                              flex: 1,
                              '& .MuiOutlinedInput-root': {
                                height: '100%',
                                alignItems: 'flex-start',
                                '& textarea': {
                                  height: '100% !important',
                                  overflow: 'auto !important',
                                },
                              },
                            }}
                          />

                          {/* メモツールバー */}
                          <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                            <Stack direction="row" spacing={1}>
                              <Button
                                variant="text"
                                size="small"
                                startIcon={<SaveIcon />}
                                onClick={handleSave}
                                disabled={!workContent.trim()}
                              >
                                保存
                              </Button>
                              <Button
                                variant="text"
                                size="small"
                                startIcon={<ClearIcon />}
                                onClick={() => setWorkContent('')}
                              >
                                クリア
                              </Button>
                            </Stack>
                            <Typography variant="caption" color="text.secondary">
                              {workContent.length} 文字
                            </Typography>
                          </Stack>

                          {savedSuccessfully && (
                            <Alert severity="success" sx={{ mt: 1 }}>
                              メモが保存されました！
                            </Alert>
                          )}
                        </Box>
                      </Box>
                    </Panel>
                  </PanelGroup>
                </Box>
              ) : (
                /* ガイダンスのみ表示 */
                <Box sx={{ flex: 1, p: 3, overflow: 'auto', backgroundColor: 'background.paper', borderRadius: 1 }}>
                  <Typography variant="h6" gutterBottom>
                    思考の整理（右上の「メモ帳」ボタンでメモを取りながら考えることができます）
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    テーマを決めるために、以下について考えてみましょう
                  </Typography>
                  
                  <Stack spacing={3}>
                    <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                        興味・関心の領域
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon><IdeaIcon color="primary" /></ListItemIcon>
                          <ListItemText 
                            primary="社会問題や身近な疑問・課題" 
                            secondary="環境問題、教育格差、高齢化社会など"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><GoalIcon color="primary" /></ListItemIcon>
                          <ListItemText 
                            primary="将来の夢や目標に関連するテーマ" 
                            secondary="なりたい職業や取り組みたい分野"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><ThemeIcon color="primary" /></ListItemIcon>
                          <ListItemText 
                            primary="これまでに学んできた中で特に興味を持ったこと" 
                            secondary="授業や読書、体験から得た興味"
                          />
                        </ListItem>
                      </List>
                    </Box>

                    <Box sx={{ p: 2, backgroundColor: 'background.default', borderRadius: 1 }}>
                      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                        テーマの絞り込み
                      </Typography>
                      <List>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText 
                            primary="なぜそれに興味を持ったのか？" 
                            secondary="きっかけや理由を明確にしましょう"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText 
                            primary="その分野で解決したい問題は何か？" 
                            secondary="具体的な課題を見つけましょう"
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemIcon><CheckIcon color="success" /></ListItemIcon>
                          <ListItemText 
                            primary="実際に調査・研究できそうな範囲か？" 
                            secondary="現実的に取り組める規模を考えましょう"
                          />
                        </ListItem>
                      </List>
                    </Box>
                  </Stack>
                </Box>
              )}

              {/* 次のステップボタン */}
              <Box sx={{ display: 'flex', justifyContent: 'center', pt: 2 }}>
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleNext}
                  disabled={!step1Theme.trim()}
                  sx={{ minWidth: 200, py: 1.5 }}
                >
                  次のステップへ進む
                </Button>
              </Box>
            </Box>
          </Box>
        ) : (
          /* Step2以降のワークスペース */
          <WorkspaceWithAI
            pageId={`step-${currentStep}`}
            title={content?.title || 'ワークスペース'}
            description={content?.description}
            placeholder={content?.workPlaceholder || 'ここに内容を入力してください...'}
            value={workContent}
            onChange={setWorkContent}
            onSave={handleSave}
            onMessageSend={handleAIMessage}
            initialMessage={(() => {
              if (!theme) return 'Step1で探究テーマを設定してから進んでください。';
              switch (currentStep) {
                case 2: return generateStep2InitialMessage(theme);
                case 3: return generateStep3InitialMessage(theme);
                case 4: return generateStep4InitialMessage(theme);
                default: return '';
              }
            })()}
            initialAIResponse={localStorage.getItem(`step${currentStep}-initial-ai-response`) || undefined}
            aiButtonText={content?.aiButtonText}
            isAIOpen={isMemoOpen}
            onAIOpenChange={setIsMemoOpen}
            showFabButton={false}
            useAIChat={currentStep >= 2} // Step2以降でAIChatを使用
            autoStartAI={currentStep >= 2 && !!theme} // Step2以降でテーマがある場合に自動開始
            isMemoOpen={isStep2MemoOpen} // メモ帳状態
            onMemoOpenChange={setIsStep2MemoOpen} // メモ帳状態変更
            forceRefreshChat={forceRefreshChat} // チャット強制リフレッシュ
            currentStep={currentStep} // 現在のステップ
            stepTheme={(() => {
              switch (currentStep) {
                case 2: return step2Theme;
                case 3: return step3Theme;
                case 4: return step4Theme;
                default: return '';
              }
            })()} // ステップのテーマ
            onStepThemeChange={(theme) => {
              switch (currentStep) {
                case 2: setStep2Theme(theme); break;
                case 3: setStep3Theme(theme); break;
                case 4: setStep4Theme(theme); break;
              }
            }} // ステップのテーマ変更
            // ナビゲーション関連
            onNext={handleNext}
            onPrevious={handlePrevious}
            showPrevious={currentStep > 1}
            showNext={true}
            nextButtonText={currentStep < 4 ? '次へ' : '完了'}
          />
        )}
      </Box>

      {/* エラー・成功メッセージ */}
      {error && (
        <Alert 
          severity="error" 
          onClose={() => setError(null)}
          sx={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            minWidth: 300,
          }}
        >
          {error}
        </Alert>
      )}

      {savedSuccessfully && (
        <Alert 
          severity="success"
          sx={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1001,
            minWidth: 300,
          }}
        >
          保存されました！
        </Alert>
      )}
    </Box>
  );
};

export default StepPage;