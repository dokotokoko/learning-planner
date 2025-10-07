import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Typography,
  Paper,
  Container,
  Alert,
  CircularProgress,
  Fade,
  TextField,
} from '@mui/material';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { useAuthStore } from '../../stores/authStore';
import AIChat from '../MemoChat/AIChat';
import BubbleCanvas from './BubbleCanvas';
import FocusExploration from './FocusExploration';
import QuestionCandidateComponent from './QuestionCandidate';
import QuestionFinalization from './QuestionFinalization';
import { 
  BubbleNode, 
  Cluster, 
  QuestionSeed, 
  QuestionCandidate, 
  FinalQuestion,
  InquiryStep 
} from './types';

const STEPS: InquiryStep[] = [
  {
    step: 1,
    title: '興味・関心を広げる',
    description: 'あなたの興味や関心のあるキーワードを自由に入力して、探究の種を見つけましょう',
    isCompleted: false,
  },
  {
    step: 2,
    title: '中心テーマを決める',
    description: '集まったキーワードから、今日深めたいテーマを1つ選びます',
    isCompleted: false,
  },
  {
    step: 3,
    title: '問いを育てる',
    description: 'AIと対話しながら、あなたの問いを具体的にしていきます',
    isCompleted: false,
  },
  {
    step: 4,
    title: '自分の問いを決定',
    description: '最終的な探究の問いを決定します',
    isCompleted: false,
  },
];

const InquiryExplorer: React.FC = () => {
  const { user } = useAuthStore();
  const [activeStep, setActiveStep] = useState(0);
  const [isAIOpen, setIsAIOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Step 1: Bubble Canvas state
  const [bubbleNodes, setBubbleNodes] = useState<BubbleNode[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  
  // Step 2: Focus state
  const [centerKeywordId, setCenterKeywordId] = useState<string | null>(null);
  const [questionSeeds, setQuestionSeeds] = useState<QuestionSeed[]>([]);
  
  // Step 3: Question candidates state
  const [questionCandidates, setQuestionCandidates] = useState<QuestionCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  
  // Step 4: Final question state
  const [finalQuestion, setFinalQuestion] = useState<FinalQuestion | null>(null);

  // AI Chat messages for context
  const [aiContext, setAiContext] = useState('');

  // API base URL
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Step 1: Add new bubble node
  const handleAddNode = useCallback((text: string) => {
    const newNode: BubbleNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      x: 400 + Math.random() * 200 - 100,
      y: 300 + Math.random() * 200 - 100,
      createdAt: new Date(),
    };
    setBubbleNodes(prev => [...prev, newNode]);
  }, []);

  // Step 1: Delete bubble node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setBubbleNodes(prev => prev.filter(node => node.id !== nodeId));
    // Also remove from clusters
    setClusters(prev => 
      prev.map(cluster => ({
        ...cluster,
        nodeIds: cluster.nodeIds.filter(id => id !== nodeId)
      })).filter(cluster => cluster.nodeIds.length > 0)
    );
  }, []);

  // Step 1: Select node and get AI suggestions
  const handleSelectNode = useCallback(async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    const node = bubbleNodes.find(n => n.id === nodeId);
    if (!node) return;

    // Get AI suggestions for related keywords
    try {
      setIsLoading(true);
      const response = await fetch(`${apiBaseUrl}/api/inquiry/related-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({ keyword: node.text }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedKeywords(data.suggestions || []);
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      // Fallback suggestions
      setSuggestedKeywords([
        `${node.text}の歴史`,
        `${node.text}と社会`,
        `${node.text}の未来`,
        `${node.text}と環境`,
        `${node.text}の課題`,
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [bubbleNodes, apiBaseUrl, user]);

  // Step 1: Create cluster
  const handleCreateCluster = useCallback((nodeIds: string[], name: string) => {
    const newCluster: Cluster = {
      id: `cluster-${Date.now()}`,
      name,
      nodeIds,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
    };
    setClusters(prev => [...prev, newCluster]);
  }, []);

  // Step 1: AI Suggest handler
  const handleAISuggest = useCallback(async (keyword: string) => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/inquiry/related-words`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({ keyword }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestedKeywords(data.suggestions || []);
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      // Fallback suggestions
      setSuggestedKeywords([
        `${keyword}について`,
        `${keyword}の影響`,
        `${keyword}と私`,
        `${keyword}の価値`,
      ]);
    }
  }, [apiBaseUrl, user]);

  // Add suggested keyword as new node
  const handleAddSuggestedKeyword = useCallback((keyword: string) => {
    handleAddNode(keyword);
    setSuggestedKeywords(prev => prev.filter(k => k !== keyword));
  }, [handleAddNode]);

  // Step 2: Select center keyword
  const handleSelectCenterKeyword = useCallback((nodeId: string) => {
    setCenterKeywordId(nodeId);
    const node = bubbleNodes.find(n => n.id === nodeId);
    if (node) {
      // Update node to mark as center
      setBubbleNodes(prev => prev.map(n => ({
        ...n,
        isCenter: n.id === nodeId,
      })));
      
      // Move to next step
      setActiveStep(2);
      
      // Update AI context
      setAiContext(`ユーザーが選んだ中心キーワード: ${node.text}`);
    }
  }, [bubbleNodes]);

  // Handle step navigation
  const handleNext = useCallback(() => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
    }
  }, [activeStep]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
    }
  }, [activeStep]);

  const handleReset = useCallback(() => {
    setActiveStep(0);
    setBubbleNodes([]);
    setClusters([]);
    setSelectedNodeId(null);
    setSuggestedKeywords([]);
    setCenterKeywordId(null);
    setQuestionSeeds([]);
    setQuestionCandidates([]);
    setFinalQuestion(null);
    setAiContext('');
  }, []);

  // Step 3: Generate question candidates
  const handleGenerateCandidates = useCallback(async (seedId: string) => {
    const seed = questionSeeds.find(s => s.id === seedId);
    if (!seed) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/inquiry/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          question: seed.content,
          context: {
            centerKeyword: bubbleNodes.find(n => n.id === centerKeywordId)?.text,
            allKeywords: bubbleNodes.map(n => n.text),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Generate 3 different types of candidates
        const newCandidates: QuestionCandidateType[] = data.suggestions.map((suggestion: string, index: number) => ({
          id: `candidate-${Date.now()}-${index}`,
          originalSeed: seed,
          content: suggestion,
          type: ['paraphrase', 'focus', 'method'][index] as 'paraphrase' | 'focus' | 'method',
          scores: data.scores,
          comment: data.comment,
        }));
        
        setQuestionCandidates(prev => [...prev.filter(c => c.originalSeed.id !== seedId), ...newCandidates]);
      }
    } catch (error) {
      console.error('Generate candidates error:', error);
      // Fallback candidates
      const fallbackCandidates: QuestionCandidateType[] = [
        {
          id: `candidate-${Date.now()}-0`,
          originalSeed: seed,
          content: `${seed.content}について、より具体的に調べてみると？`,
          type: 'paraphrase',
          scores: { subjectivity: 70, explorability: 75, scope: 65, resolution: 60 },
          comment: 'より具体的にすることで探究しやすくなります。',
        },
      ];
      setQuestionCandidates(prev => [...prev.filter(c => c.originalSeed.id !== seedId), ...fallbackCandidates]);
    }
  }, [apiBaseUrl, user, questionSeeds, bubbleNodes, centerKeywordId]);

  // Step 3: Update candidate content
  const handleUpdateCandidate = useCallback((candidateId: string, content: string) => {
    setQuestionCandidates(prev => prev.map(c => 
      c.id === candidateId ? { ...c, content } : c
    ));
  }, []);

  // Step 3: Evaluate candidate
  const handleEvaluateCandidate = useCallback(async (candidateId: string) => {
    const candidate = questionCandidates.find(c => c.id === candidateId);
    if (!candidate) return;

    try {
      const response = await fetch(`${apiBaseUrl}/api/inquiry/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          question: candidate.content,
          context: {
            centerKeyword: bubbleNodes.find(n => n.id === centerKeywordId)?.text,
            allKeywords: bubbleNodes.map(n => n.text),
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setQuestionCandidates(prev => prev.map(c =>
          c.id === candidateId ? {
            ...c,
            scores: data.scores,
            comment: data.comment,
          } : c
        ));
      }
    } catch (error) {
      console.error('Evaluate candidate error:', error);
    }
  }, [apiBaseUrl, user, questionCandidates, bubbleNodes, centerKeywordId]);

  // AI message handler
  const handleAIMessage = useCallback(async (message: string, context: string) => {
    // This will be connected to the backend conversation agent
    try {
      const response = await fetch(`${apiBaseUrl}/api/inquiry/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.id}`,
        },
        body: JSON.stringify({
          message,
          context: {
            step: activeStep + 1,
            centerKeyword: bubbleNodes.find(n => n.id === centerKeywordId)?.text,
            allKeywords: bubbleNodes.map(n => n.text),
            clusters,
            questionSeeds,
            context,
          },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // If AI found question seeds, add them
        if (data.question_seeds && activeStep === 1) {
          const newSeeds: QuestionSeed[] = data.question_seeds.map((seed: any) => ({
            id: `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content: seed.content,
            sourceKeyword: seed.sourceKeyword || bubbleNodes.find(n => n.id === centerKeywordId)?.text || '',
            category: seed.category || 'other',
            createdAt: new Date(),
          }));
          setQuestionSeeds(prev => [...prev, ...newSeeds]);
        }
        
        return data.response;
      }
    } catch (error) {
      console.error('AI chat error:', error);
    }
    
    // Fallback response
    return `「${message}」について考えています。もう少し詳しく教えていただけますか？`;
  }, [apiBaseUrl, user, activeStep, bubbleNodes, centerKeywordId, clusters, questionSeeds]);

  // Render content based on active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Step 1: Bubble Canvas
        return (
          <BubbleCanvas
            nodes={bubbleNodes}
            clusters={clusters}
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onSelectNode={handleSelectNode}
            onCreateCluster={handleCreateCluster}
            onAISuggest={handleAISuggest}
            selectedNodeId={selectedNodeId}
            suggestedKeywords={suggestedKeywords}
            onAddSuggestedKeyword={handleAddSuggestedKeyword}
          />
        );
        
      case 1: // Step 2: Focus
        return (
          <FocusExploration
            bubbleNodes={bubbleNodes}
            centerKeywordId={centerKeywordId}
            onSelectCenter={handleSelectCenterKeyword}
            questionSeeds={questionSeeds}
            onAddQuestionSeed={(seed) => setQuestionSeeds(prev => [...prev, seed])}
            onNext={handleNext}
          />
        );
        
      case 2: // Step 3: Question Development
        return (
          <QuestionCandidateComponent
            questionSeeds={questionSeeds}
            questionCandidates={questionCandidates}
            onGenerateCandidates={handleGenerateCandidates}
            onUpdateCandidate={handleUpdateCandidate}
            onSelectCandidate={(id) => setSelectedCandidateId(id)}
            onEvaluateCandidate={handleEvaluateCandidate}
            onNext={handleNext}
            selectedCandidateId={selectedCandidateId}
          />
        );
        
      case 3: // Step 4: Finalize
        return (
          <QuestionFinalization
            bubbleNodes={bubbleNodes}
            centerKeywordId={centerKeywordId}
            questionSeeds={questionSeeds}
            questionCandidates={questionCandidates}
            selectedCandidateId={selectedCandidateId}
            finalQuestion={finalQuestion}
            onUpdateFinalQuestion={(question) => {
              setFinalQuestion(prev => ({ 
                ...prev!, 
                content: question,
                keywords: bubbleNodes.map(n => n.text),
                questionSeeds,
                candidates: questionCandidates,
                createdAt: new Date(),
              }));
            }}
            onSaveFinalQuestion={setFinalQuestion}
            onComplete={() => {
              alert('探究の問いが決定されました！');
              // ここで保存処理やリダイレクトを実行
            }}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <Container maxWidth={false} sx={{ height: '100vh', py: 2 }}>
      <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h4" gutterBottom>
            探究の問いを見つける
          </Typography>
          <Stepper activeStep={activeStep}>
            {STEPS.map((step) => (
              <Step key={step.step}>
                <StepLabel>{step.title}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Box>
        
        {/* Main Content Area */}
        <Box sx={{ flex: 1, overflow: 'hidden' }}>
          <PanelGroup direction="horizontal">
            {/* Left Panel: Main Workspace */}
            <Panel defaultSize={65} minSize={50}>
              <Box sx={{ height: '100%', p: 2, overflow: 'auto' }}>
                {renderStepContent()}
              </Box>
            </Panel>
            
            {/* Resize Handle */}
            <PanelResizeHandle />
            
            {/* Right Panel: AI Chat */}
            <Panel defaultSize={35} minSize={25}>
              <Box sx={{ height: '100%', borderLeft: 1, borderColor: 'divider' }}>
                <AIChat
                  pageId={`inquiry-step-${activeStep + 1}`}
                  title="AI探究サポート"
                  initialMessage={
                    activeStep === 0
                      ? 'こんにちは！探究の問いを一緒に見つけていきましょう。まずは、あなたが興味のあることや気になることを教えてください。'
                      : activeStep === 1 && centerKeywordId
                      ? `「${bubbleNodes.find(n => n.id === centerKeywordId)?.text}」について深めていきましょう。このキーワードが気になる理由や、関連する出来事を教えてください。`
                      : 'どのようなことでお手伝いできますか？'
                  }
                  currentMemoContent={aiContext}
                  onMessageSend={handleAIMessage}
                  persistentMode={true}
                  enableSmartNotifications={false}
                />
              </Box>
            </Panel>
          </PanelGroup>
        </Box>
        
        {/* Footer Navigation */}
        <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={handleReset}>最初から</Button>
          <Box>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              戻る
            </Button>
            <Button
              variant="contained"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && bubbleNodes.length === 0) ||
                (activeStep === 1 && !centerKeywordId) ||
                activeStep === STEPS.length - 1
              }
            >
              次へ
            </Button>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default InquiryExplorer;