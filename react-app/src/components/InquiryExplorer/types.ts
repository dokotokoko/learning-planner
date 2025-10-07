export interface BubbleNode {
  id: string;
  text: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  clusterId?: string;
  isCenter?: boolean;
  isSelected?: boolean;
  createdAt: Date;
}

export interface Cluster {
  id: string;
  name: string;
  nodeIds: string[];
  color: string;
}

export interface QuestionSeed {
  id: string;
  content: string;
  sourceKeyword: string;
  category: 'event' | 'person' | 'place' | 'emotion' | 'other';
  createdAt: Date;
}

export interface QuestionCandidate {
  id: string;
  originalSeed: QuestionSeed;
  content: string;
  type: 'paraphrase' | 'focus' | 'method';
  scores: QuestionScores;
  comment: string;
}

export interface QuestionScores {
  subjectivity: number;    // 主体性 (0-100)
  explorability: number;    // 探究可能性 (0-100)
  scope: number;           // スコープ (0-100)
  resolution: number;      // 解像度 (0-100)
}

export interface FinalQuestion {
  content: string;
  keywords: string[];
  questionSeeds: QuestionSeed[];
  candidates: QuestionCandidate[];
  createdAt: Date;
  userId?: string;
}

export interface InquiryStep {
  step: 1 | 2 | 3 | 4;
  title: string;
  description: string;
  isCompleted: boolean;
  data?: any;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface InquirySession {
  id: string;
  userId: string;
  currentStep: number;
  bubbleNodes: BubbleNode[];
  clusters: Cluster[];
  centerKeywordId?: string;
  questionSeeds: QuestionSeed[];
  questionCandidates: QuestionCandidate[];
  finalQuestion?: FinalQuestion;
  aiMessages: AIMessage[];
  createdAt: Date;
  updatedAt: Date;
}