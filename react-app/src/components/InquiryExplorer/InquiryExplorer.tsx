import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Fade,
  TextField,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  Card,
  CardContent,
  CardActions,
  Divider,
} from '@mui/material';
import {
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  RestartAlt as RestartIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  Add as AddIcon,
  AutoAwesome as SuggestIcon,
  GroupWork as ClusterIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/authStore';
import AIChat from '../MemoChat/AIChat';
import InfiniteCanvas from './InfiniteCanvas';
import WhiteboardBubbles from './WhiteboardBubbles';
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
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [canvasTransform, setCanvasTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [inputKeyword, setInputKeyword] = useState('');
  const [selectedForCluster, setSelectedForCluster] = useState<Set<string>>(new Set());
  const [clusterName, setClusterName] = useState('');
  
  // Step 1: Bubble Canvas state
  const [bubbleNodes, setBubbleNodes] = useState<BubbleNode[]>([]);
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [suggestedKeywords, setSuggestedKeywords] = useState<string[]>([]);
  
  // Step 2: Focus state
  const [centerKeywordId, setCenterKeywordId] = useState<string | null>(null);
  const [questionSeeds, setQuestionSeeds] = useState<QuestionSeed[]>([]);
  const [questionInput, setQuestionInput] = useState('');
  
  // Step 3: Question candidates state
  const [questionCandidates, setQuestionCandidates] = useState<QuestionCandidate[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [candidateEdit, setCandidateEdit] = useState<{ [key: string]: string }>({});
  
  // Step 4: Final question state
  const [finalQuestion, setFinalQuestion] = useState<FinalQuestion | null>(null);
  const [finalQuestionText, setFinalQuestionText] = useState('');

  // AI Chat messages for context
  const [aiContext, setAiContext] = useState('');

  // API base URL
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Step positions on canvas
  const stepPositions = [
    { x: 400, y: 300 },    // Step 1
    { x: 1200, y: 300 },   // Step 2
    { x: 400, y: 900 },    // Step 3
    { x: 1200, y: 900 },   // Step 4
  ];

  // Step 1: Add new bubble node with animation
  const handleAddNode = useCallback((text: string) => {
    const position = stepPositions[0];
    // Create a spiral or random position for new bubbles
    const angle = (bubbleNodes.length * 137.5) * (Math.PI / 180); // Golden angle
    const radius = 50 + bubbleNodes.length * 15;
    const newNode: BubbleNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      x: position.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 50,
      y: position.y + Math.sin(angle) * radius + (Math.random() - 0.5) * 50,
      createdAt: new Date(),
    };
    setBubbleNodes(prev => [...prev, newNode]);
    setInputKeyword('');
    
    // Visual feedback - flash effect or animation could be added here
    // Auto-generate AI suggestions for the new keyword
    if (bubbleNodes.length % 3 === 0) { // Every 3rd bubble, suggest related keywords
      setTimeout(() => {
        setSuggestedKeywords([
          `${text}の未来`,
          `${text}と私`,
          `${text}の歴史`,
        ]);
      }, 500);
    }
  }, [bubbleNodes]);

  // Step 1: Delete bubble node
  const handleDeleteNode = useCallback((nodeId: string) => {
    setBubbleNodes(prev => prev.filter(node => node.id !== nodeId));
    setClusters(prev => 
      prev.map(cluster => ({
        ...cluster,
        nodeIds: cluster.nodeIds.filter(id => id !== nodeId)
      })).filter(cluster => cluster.nodeIds.length > 0)
    );
  }, []);

  // Step 1: Select node and get AI suggestions
  const handleSelectNode = useCallback(async (nodeId: string) => {
    if (activeStep === 0) {
      // Step 1: Multi-select for clustering
      if (selectedForCluster.has(nodeId)) {
        setSelectedForCluster(prev => {
          const newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
      } else {
        setSelectedForCluster(prev => new Set(prev).add(nodeId));
      }
      
      // Get AI suggestions for single selection
      if (selectedForCluster.size === 0) {
        setSelectedNodeId(nodeId);
        const node = bubbleNodes.find(n => n.id === nodeId);
        if (!node) return;

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
          setSuggestedKeywords([
            `${node.text}の歴史`,
            `${node.text}と社会`,
            `${node.text}の未来`,
          ]);
        } finally {
          setIsLoading(false);
        }
      }
    } else if (activeStep === 1) {
      // Step 2: Select center keyword
      setCenterKeywordId(nodeId);
      const node = bubbleNodes.find(n => n.id === nodeId);
      if (node) {
        setBubbleNodes(prev => prev.map(n => ({
          ...n,
          isCenter: n.id === nodeId,
        })));
        setAiContext(`ユーザーが選んだ中心キーワード: ${node.text}`);
      }
    }
  }, [activeStep, bubbleNodes, selectedForCluster, apiBaseUrl, user]);

  // Update node position
  const handleUpdateNodePosition = useCallback((nodeId: string, x: number, y: number) => {
    setBubbleNodes(prev => prev.map(node => 
      node.id === nodeId ? { ...node, x, y } : node
    ));
  }, []);

  // Create cluster
  const handleCreateCluster = useCallback(() => {
    if (selectedForCluster.size > 1 && clusterName.trim()) {
      const newCluster: Cluster = {
        id: `cluster-${Date.now()}`,
        name: clusterName,
        nodeIds: Array.from(selectedForCluster),
        color: '#' + Math.floor(Math.random()*16777215).toString(16),
      };
      setClusters(prev => [...prev, newCluster]);
      setSelectedForCluster(new Set());
      setClusterName('');
    }
  }, [selectedForCluster, clusterName]);

  // Add suggested keyword
  const handleAddSuggestedKeyword = useCallback((keyword: string) => {
    handleAddNode(keyword);
    setSuggestedKeywords(prev => prev.filter(k => k !== keyword));
  }, [handleAddNode]);

  // Step 2: Add question seed
  const handleAddQuestionSeed = useCallback(() => {
    if (!questionInput.trim() || !centerKeywordId) return;
    
    const centerNode = bubbleNodes.find(n => n.id === centerKeywordId);
    if (!centerNode) return;

    const newSeed: QuestionSeed = {
      id: `seed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: questionInput.trim(),
      sourceKeyword: centerNode.text,
      category: 'other',
      createdAt: new Date(),
    };
    
    setQuestionSeeds(prev => [...prev, newSeed]);
    setQuestionInput('');
  }, [questionInput, centerKeywordId, bubbleNodes]);

  // Step 3: Generate question candidates
  const handleGenerateCandidates = useCallback(async (seedId: string) => {
    const seed = questionSeeds.find(s => s.id === seedId);
    if (!seed) return;

    try {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        const newCandidates: QuestionCandidate[] = [
          {
            id: `candidate-${Date.now()}-1`,
            originalSeed: seed,
            content: `なぜ${seed.content}のか？`,
            type: 'paraphrase',
            scores: { subjectivity: 70, explorability: 75, scope: 65, resolution: 60 },
            comment: 'より具体的にすることで探究しやすくなります。',
          },
          {
            id: `candidate-${Date.now()}-2`,
            originalSeed: seed,
            content: `${seed.content}はどのように変化してきたか？`,
            type: 'focus',
            scores: { subjectivity: 80, explorability: 85, scope: 70, resolution: 75 },
            comment: '歴史的な視点を加えることで深い探究が可能です。',
          },
        ];
        setQuestionCandidates(prev => [...prev.filter(c => c.originalSeed.id !== seedId), ...newCandidates]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Generate candidates error:', error);
      setIsLoading(false);
    }
  }, [questionSeeds]);

  // Handle step navigation
  const handleNext = useCallback(() => {
    if (activeStep < STEPS.length - 1) {
      setActiveStep(prev => prev + 1);
      // Auto-focus to next step area
      const nextPosition = stepPositions[activeStep + 1];
      setCanvasTransform({
        x: -nextPosition.x + window.innerWidth / 2,
        y: -nextPosition.y + window.innerHeight / 2,
        scale: 1,
      });
    }
  }, [activeStep]);

  const handleBack = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(prev => prev - 1);
      const prevPosition = stepPositions[activeStep - 1];
      setCanvasTransform({
        x: -prevPosition.x + window.innerWidth / 2,
        y: -prevPosition.y + window.innerHeight / 2,
        scale: 1,
      });
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
    setCanvasTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // AI message handler
  const handleAIMessage = useCallback(async (message: string, context: string) => {
    // Fallback response
    return `「${message}」について考えています。もう少し詳しく教えていただけますか？`;
  }, []);

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      {/* Infinite Canvas */}
      <InfiniteCanvas
        backgroundColor="#fafafa"
        gridEnabled={true}
        minZoom={0.3}
        maxZoom={2}
        onTransformChange={setCanvasTransform}
        initialTransform={canvasTransform}
      >
        {/* Main Canvas Content */}
        <svg
          style={{
            width: '2000px',
            height: '1400px',
          }}
        >
          {/* Step Areas */}
          {stepPositions.map((pos, index) => (
            <g key={index} transform={`translate(${pos.x}, ${pos.y})`}>
              <rect
                x="-350"
                y="-250"
                width="700"
                height="500"
                fill="white"
                stroke={activeStep === index ? '#2196f3' : '#e0e0e0'}
                strokeWidth={activeStep === index ? 3 : 2}
                rx="16"
                opacity={activeStep === index ? 1 : 0.5}
                filter="drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))"
                cursor={activeStep !== index ? 'pointer' : 'default'}
                onClick={() => {
                  if (activeStep !== index) {
                    // Allow jumping to previous steps
                    if (index < activeStep || 
                        (index === 1 && bubbleNodes.length >= 3) ||
                        (index === 2 && centerKeywordId) ||
                        (index === 3 && questionCandidates.length > 0)) {
                      setActiveStep(index);
                      const position = stepPositions[index];
                      setCanvasTransform({
                        x: -position.x + window.innerWidth / 2,
                        y: -position.y + window.innerHeight / 2,
                        scale: 1,
                      });
                    }
                  }
                }}
              />
              <text
                x="0"
                y="-220"
                textAnchor="middle"
                fontSize="24"
                fontWeight="bold"
                fill={activeStep === index ? '#1976d2' : '#999'}
                pointerEvents="none"
              >
                Step {index + 1}: {STEPS[index].title}
              </text>
              <text
                x="0"
                y="-195"
                textAnchor="middle"
                fontSize="14"
                fill={activeStep === index ? '#666' : '#aaa'}
                pointerEvents="none"
              >
                {STEPS[index].description}
              </text>
              
              {/* Step completion indicator */}
              {((index === 0 && bubbleNodes.length >= 3) ||
                (index === 1 && centerKeywordId) ||
                (index === 2 && questionCandidates.length > 0) ||
                (index === 3 && finalQuestion)) && (
                <circle
                  cx="320"
                  cy="-220"
                  r="10"
                  fill="#4caf50"
                />
              )}
            </g>
          ))}

          {/* Connection Arrows */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={activeStep > 0 ? '#4caf50' : '#ccc'}
              />
            </marker>
          </defs>
          
          <path
            d="M 750 300 L 850 300"
            stroke={activeStep >= 1 ? '#4caf50' : '#ccc'}
            strokeWidth="3"
            fill="none"
            markerEnd="url(#arrowhead)"
            strokeDasharray={activeStep < 1 ? "5,5" : "0"}
          />
          
          <path
            d="M 1200 550 L 1200 600 L 750 600 L 750 650"
            stroke={activeStep >= 2 ? '#4caf50' : '#ccc'}
            strokeWidth="3"
            fill="none"
            markerEnd="url(#arrowhead)"
            strokeDasharray={activeStep < 2 ? "5,5" : "0"}
          />
          
          <path
            d="M 750 900 L 850 900"
            stroke={activeStep >= 3 ? '#4caf50' : '#ccc'}
            strokeWidth="3"
            fill="none"
            markerEnd="url(#arrowhead)"
            strokeDasharray={activeStep < 3 ? "5,5" : "0"}
          />

          {/* Bubbles */}
          {bubbleNodes.length > 0 && (
            <WhiteboardBubbles
              nodes={bubbleNodes}
              clusters={clusters}
              onSelectNode={handleSelectNode}
              onDeleteNode={handleDeleteNode}
              onUpdateNodePosition={handleUpdateNodePosition}
              selectedNodeId={activeStep === 0 ? (selectedForCluster.size > 0 ? null : selectedNodeId) : centerKeywordId}
              centerX={stepPositions[activeStep <= 1 ? activeStep : 0].x}
              centerY={stepPositions[activeStep <= 1 ? activeStep : 0].y}
              width={600}
              height={400}
            />
          )}
          
          {/* Show selected nodes for clustering */}
          {activeStep === 0 && selectedForCluster.size > 0 && (
            <g>
              {Array.from(selectedForCluster).map(nodeId => {
                const node = bubbleNodes.find(n => n.id === nodeId);
                if (!node) return null;
                return (
                  <circle
                    key={`selected-${nodeId}`}
                    cx={node.x}
                    cy={node.y}
                    r="35"
                    fill="none"
                    stroke="#2196f3"
                    strokeWidth="3"
                    strokeDasharray="5,5"
                    pointerEvents="none"
                    opacity="0.7"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      values="0;10"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </circle>
                );
              })}
            </g>
          )}
        </svg>

        {/* Floating Controls for Clustering */}
        {activeStep === 0 && selectedForCluster.size > 1 && (
          <foreignObject x={50} y={450} width={350} height={100}>
            <Card sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.98)' }}>
              <CardContent sx={{ p: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <TextField
                    size="small"
                    placeholder="グループ名"
                    value={clusterName}
                    onChange={(e) => setClusterName(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleCreateCluster();
                    }}
                  />
                  <Button
                    size="small"
                    startIcon={<ClusterIcon />}
                    onClick={handleCreateCluster}
                    disabled={!clusterName.trim()}
                  >
                    グループ化 ({selectedForCluster.size}個)
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </foreignObject>
        )}

        {activeStep === 1 && (
          <foreignObject x={850} y={450} width={700} height={150}>
            <Card sx={{ p: 2, backgroundColor: 'rgba(255, 255, 255, 0.98)' }}>
              <CardContent>
                <Stack spacing={2}>
                  {!centerKeywordId ? (
                    <Alert severity="info">
                      バブルをクリックして中心となるキーワードを選択してください
                    </Alert>
                  ) : (
                    <Alert severity="success">
                      中心キーワード: 「{bubbleNodes.find(n => n.id === centerKeywordId)?.text}」を選択中
                    </Alert>
                  )}
                  {questionSeeds.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">問いの種:</Typography>
                      <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                        {questionSeeds.map(seed => (
                          <Chip key={seed.id} label={seed.content} size="small" />
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </foreignObject>
        )}

        {activeStep === 2 && (
          <foreignObject x={50} y={1000} width={700} height={250}>
            <Card sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.98)', maxHeight: 250, overflow: 'auto' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">問いの種を発展させる</Typography>
                  {questionSeeds.map(seed => (
                    <Box key={seed.id}>
                      <Typography variant="body2" gutterBottom>
                        {seed.content}
                      </Typography>
                      <Button
                        size="small"
                        onClick={() => handleGenerateCandidates(seed.id)}
                        disabled={isLoading}
                      >
                        候補を生成
                      </Button>
                      <Divider sx={{ my: 1 }} />
                    </Box>
                  ))}
                  
                  {questionCandidates.length > 0 && (
                    <>
                      <Typography variant="h6">生成された候補</Typography>
                      {questionCandidates.map(candidate => (
                        <Card key={candidate.id} variant="outlined">
                          <CardContent>
                            <Typography variant="body2">{candidate.content}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {candidate.comment}
                            </Typography>
                          </CardContent>
                        </Card>
                      ))}
                    </>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </foreignObject>
        )}

        {activeStep === 3 && (
          <foreignObject x={850} y={1000} width={700} height={200}>
            <Card sx={{ p: 3, backgroundColor: 'rgba(255, 255, 255, 0.98)' }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="h6">最終的な問いを決定</Typography>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    placeholder="あなたの探究の問いを入力してください"
                    value={finalQuestionText}
                    onChange={(e) => setFinalQuestionText(e.target.value)}
                  />
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                      if (finalQuestionText.trim()) {
                        setFinalQuestion({
                          content: finalQuestionText,
                          keywords: bubbleNodes.map(n => n.text),
                          questionSeeds,
                          candidates: questionCandidates,
                          createdAt: new Date(),
                        });
                        alert('探究の問いが決定されました！');
                      }
                    }}
                    disabled={!finalQuestionText.trim()}
                  >
                    問いを決定
                  </Button>
                  {finalQuestion && (
                    <Alert severity="success">
                      決定した問い: {finalQuestion.content}
                    </Alert>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </foreignObject>
        )}
      </InfiniteCanvas>

      {/* Progress Bar Overlay */}
      <Paper
        sx={{
          position: 'absolute',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          p: 2,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          minWidth: 600,
        }}
      >
        <Stack spacing={2}>
          <Typography variant="h5" align="center">
            探究の問いを見つける
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(activeStep / (STEPS.length - 1)) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Stack direction="row" justifyContent="space-between">
            {STEPS.map((step, index) => (
              <Chip
                key={step.step}
                label={`${index + 1}. ${step.title}`}
                color={index === activeStep ? 'primary' : 'default'}
                variant={index === activeStep ? 'filled' : 'outlined'}
                size="small"
              />
            ))}
          </Stack>
        </Stack>
      </Paper>

      {/* Bottom Controls Bar */}
      <Paper
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          px: 3,
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.1)',
          borderTop: '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%' }}>
          {/* Navigation Controls */}
          <Tooltip title="最初から">
            <IconButton onClick={handleReset}>
              <RestartIcon />
            </IconButton>
          </Tooltip>
          
          <Button
            startIcon={<BackIcon />}
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
            size="small"
          >
            戻る
          </Button>
          
          <Button
            endIcon={<NextIcon />}
            variant="contained"
            onClick={handleNext}
            disabled={
              (activeStep === 0 && bubbleNodes.length < 3) ||
              (activeStep === 1 && !centerKeywordId) ||
              (activeStep === 2 && questionCandidates.length === 0) ||
              activeStep === STEPS.length - 1
            }
            size="small"
            sx={{ minWidth: 100 }}
          >
            次へ
          </Button>

          <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

          {/* Step-specific Input Area */}
          {activeStep === 0 && (
            <>
              <TextField
                fullWidth
                placeholder="興味・関心のあることを入力してください（例：宇宙、料理、プログラミング）"
                value={inputKeyword}
                onChange={(e) => setInputKeyword(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && inputKeyword.trim()) {
                    handleAddNode(inputKeyword.trim());
                  }
                }}
                sx={{
                  '& .MuiInputBase-root': {
                    borderRadius: 8,
                    backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  },
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => inputKeyword.trim() && handleAddNode(inputKeyword.trim())}
                      disabled={!inputKeyword.trim()}
                      sx={{
                        backgroundColor: 'primary.main',
                        color: 'white',
                        '&:hover': { backgroundColor: 'primary.dark' },
                        '&.Mui-disabled': { backgroundColor: 'action.disabledBackground' },
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                  ),
                }}
              />
              
              {/* AI Suggestions Chips */}
              {suggestedKeywords.length > 0 && (
                <Fade in>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'nowrap', overflow: 'auto', maxWidth: 400 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center', mr: 1 }}>
                      関連:
                    </Typography>
                    {suggestedKeywords.slice(0, 3).map((keyword, i) => (
                      <Chip
                        key={i}
                        label={keyword}
                        size="small"
                        onClick={() => handleAddSuggestedKeyword(keyword)}
                        icon={<SuggestIcon fontSize="small" />}
                        color="primary"
                        variant="outlined"
                        sx={{ 
                          flexShrink: 0,
                          cursor: 'pointer',
                          '&:hover': { 
                            backgroundColor: 'primary.light',
                            color: 'white',
                          },
                        }}
                      />
                    ))}
                  </Stack>
                </Fade>
              )}
            </>
          )}

          {activeStep === 1 && centerKeywordId && (
            <TextField
              fullWidth
              placeholder="選んだキーワードについて、どんなことを知りたいですか？"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddQuestionSeed();
                }
              }}
              sx={{
                '& .MuiInputBase-root': {
                  borderRadius: 8,
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                },
              }}
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={handleAddQuestionSeed}
                    disabled={!questionInput.trim()}
                    sx={{
                      backgroundColor: 'primary.main',
                      color: 'white',
                      '&:hover': { backgroundColor: 'primary.dark' },
                      '&.Mui-disabled': { backgroundColor: 'action.disabledBackground' },
                    }}
                  >
                    <AddIcon />
                  </IconButton>
                ),
              }}
            />
          )}

          {activeStep === 2 && (
            <Typography variant="body2" color="text.secondary">
              問いの種をクリックして候補を生成してください
            </Typography>
          )}

          {activeStep === 3 && (
            <Typography variant="body2" color="text.secondary">
              最終的な探究の問いを入力してください
            </Typography>
          )}
        </Stack>
      </Paper>

      {/* AI Chat Toggle */}
      <Tooltip title="AI探究サポート">
        <IconButton
          sx={{
            position: 'absolute',
            bottom: 100,
            right: 24,
            backgroundColor: 'primary.main',
            color: 'white',
            '&:hover': { backgroundColor: 'primary.dark' },
            width: 56,
            height: 56,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          }}
          onClick={() => setIsAIOpen(!isAIOpen)}
        >
          <ChatIcon />
        </IconButton>
      </Tooltip>

      {/* AI Chat Panel */}
      {isAIOpen && (
        <Fade in>
          <Paper
            sx={{
              position: 'absolute',
              right: 24,
              top: 100,
              bottom: 100,
              width: 400,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
            }}
          >
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">AI探究サポート</Typography>
              <IconButton size="small" onClick={() => setIsAIOpen(false)}>
                <CloseIcon />
              </IconButton>
            </Box>
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <AIChat
                pageId={`inquiry-step-${activeStep + 1}`}
                title=""
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
          </Paper>
        </Fade>
      )}
    </Box>
  );
};

export default InquiryExplorer;