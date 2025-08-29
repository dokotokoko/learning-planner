// FastAPI バックエンドと連携するためのAPIクライアント
import { API_BASE_URL } from '@/config/api';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// 型定義
export interface User {
  id: number;
  username: string;
  message: string;
}

export interface Interest {
  id: number;
  interest: string;
  created_at: string;
}

export interface Goal {
  id: number;
  goal: string;
  interest_id: number;
  created_at: string;
}

export interface LearningPlan {
  id: number;
  nextStep: string;
  goal_id: number;
  created_at: string;
}

export interface ChatMessage {
  message: string;
  memo_content?: string;
  context?: string;
}

export interface ChatResponse {
  response: string;
  timestamp: string;
}

export interface Memo {
  id: number;
  page_id: string;
  content: string;
  updated_at: string;
}

// =============================================================================
// 探究テーマ深掘りツリー API
// =============================================================================

export interface ThemeDeepDiveRequest {
  theme: string;
  parent_theme: string;
  depth: number;
  path: string[];
  user_interests: string[];
}

export interface ThemeDeepDiveResponse {
  suggestions: string[];
  context_info: {
    depth: number;
    path_length: number;
    user_interests_count: number;
    suggestions_count: number;
  };
}

// API クライアント
class ApiClient {
  private token: string | null = null;

  constructor() {
    // LocalStorageからトークンを取得
    this.token = localStorage.getItem('auth-token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      // 認証が必要なエンドポイントの場合はトークンを追加
      if (this.token && endpoint !== '/auth/login') {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'API request failed' };
      }

      return { data };
    } catch (error) {
      console.error('API request error:', error);
      return { error: 'Network error' };
    }
  }

  // 認証関連
  async login(username: string, access_code: string): Promise<ApiResponse<User>> {
    const result = await this.request<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, access_code }),
    });

    if (result.data) {
      // ログイン成功時はuser_idをトークンとして保存（簡易実装）
      this.token = result.data.id.toString();
      localStorage.setItem('auth-token', this.token);
    }

    return result;
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth-token');
  }

  // 興味関心関連
  async createInterest(interest: string): Promise<ApiResponse<Interest>> {
    return this.request<Interest>('/interests', {
      method: 'POST',
      body: JSON.stringify({ interest }),
    });
  }

  async getInterests(): Promise<ApiResponse<Interest[]>> {
    return this.request<Interest[]>('/interests');
  }

  // 学習目標関連
  async createGoal(interest: string, goal: string): Promise<ApiResponse<Goal>> {
    return this.request<Goal>('/goals', {
      method: 'POST',
      body: JSON.stringify({ interest, goal }),
    });
  }

  async getGoals(): Promise<ApiResponse<Goal[]>> {
    return this.request<Goal[]>('/goals');
  }

  // 学習計画関連
  async createLearningPlan(goal: string, nextStep: string): Promise<ApiResponse<LearningPlan>> {
    return this.request<LearningPlan>('/learning-plans', {
      method: 'POST',
      body: JSON.stringify({ goal, nextStep }),
    });
  }

  async getLearningPlans(): Promise<ApiResponse<LearningPlan[]>> {
    return this.request<LearningPlan[]>('/learning-plans');
  }

  // チャット関連
  async sendChatMessage(message: ChatMessage): Promise<ApiResponse<ChatResponse>> {
    return this.request<ChatResponse>('/chat', {
      method: 'POST',
      body: JSON.stringify(message),
    });
  }

  // メモ関連
  async saveMemo(page_id: string, content: string): Promise<ApiResponse<Memo>> {
    return this.request<Memo>('/memos', {
      method: 'POST',
      body: JSON.stringify({ page_id, content }),
    });
  }

  async getMemo(page_id: string): Promise<ApiResponse<Memo>> {
    return this.request<Memo>(`/memos/${page_id}`);
  }

  async getAllMemos(): Promise<ApiResponse<Memo[]>> {
    return this.request<Memo[]>('/memos');
  }

  async deleteMemoByPageId(page_id: string): Promise<ApiResponse<{message: string, page_id: string}>> {
    return this.request(`/memos/${page_id}`, {
      method: 'DELETE',
    });
  }

  // Project関連
  async createProject(name: string): Promise<ApiResponse<any>> {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async getProjects(): Promise<ApiResponse<any[]>> {
    return this.request('/projects');
  }

  async updateProject(id: string, name: string): Promise<ApiResponse<any>> {
    return this.request(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<any>> {
    return this.request(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  // Memo関連 (Project-based)
  async createMemo(project_id: string, title: string, content: string = ''): Promise<ApiResponse<any>> {
    return this.request('/memos', {
      method: 'POST',
      body: JSON.stringify({ project_id, title, content }),
    });
  }

  async getMemosByProject(project_id: string): Promise<ApiResponse<any[]>> {
    return this.request(`/memos?project_id=${project_id}`);
  }

  async updateMemo(id: string, title: string, content: string, order: number): Promise<ApiResponse<any>> {
    return this.request(`/memos/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content, order }),
    });
  }

  async deleteMemo(id: string): Promise<ApiResponse<any>> {
    return this.request(`/memos/${id}`, {
      method: 'DELETE',
    });
  }

  // ヘルスチェック
  async healthCheck(): Promise<ApiResponse<{message: string, version: string}>> {
    return this.request('/');
  }
}

// シングルトンインスタンス
export const apiClient = new ApiClient();

// React Query用のカスタムフック
export const useApi = () => {
  return apiClient;
};

// エラーハンドリング用のヘルパー
export const handleApiError = (error: string | undefined) => {
  if (error) {
    console.error('API Error:', error);
    // 必要に応じてトースト通知やエラー表示を行う
  }
};

export default apiClient;

// =============================================================================
// クエストシステム API
// =============================================================================

export interface Quest {
  id: number;
  title: string;
  description: string;
  category: 'creative' | 'research' | 'experiment' | 'communication';
  difficulty: 1 | 2 | 3;
  points: number;
  required_evidence: string;
  icon_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserQuest {
  id: number;
  user_id: number;
  quest_id: number;
  status: 'available' | 'in_progress' | 'completed';
  progress: number;
  quest: Quest;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface QuestSubmission {
  id: number;
  user_quest_id: number;
  quest_id: number;
  description: string;
  file_url?: string;
  reflection_data?: any;
  status: string;
  points_awarded: number;
  submitted_at: string;
}

export interface QuestStats {
  total_quests: number;
  available_quests: number;
  completed_quests: number;
  in_progress_quests: number;
  total_points: number;
}

export const questApi = {
  // クエスト一覧取得
  getQuests: async (category?: string, difficulty?: number): Promise<Quest[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty.toString());
    
    const response = await fetch(`${API_BASE_URL}/quests?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
    
    
    if (!response.ok) {
      throw new Error('Failed to fetch quests');
    }
    
    return response.json();
  },

  // 特定クエスト取得
  getQuest: async (questId: number): Promise<Quest> => {
    const response = await fetch(`${API_BASE_URL}/quests/${questId}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch quest');
    }
    
    return response.json();
  },

  // ユーザークエスト一覧取得
  getUserQuests: async (status?: string): Promise<UserQuest[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    
    const response = await fetch(`${API_BASE_URL}/user-quests?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user quests');
    }
    
    return response.json();
  },

  // クエスト開始
  startQuest: async (questId: number): Promise<UserQuest> => {
    const response = await fetch(`${API_BASE_URL}/user-quests/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
      body: JSON.stringify({ quest_id: questId }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to start quest');
    }
    
    return response.json();
  },

  // クエスト提出
  submitQuest: async (userQuestId: number, submissionData: {
    description: string;
    file_url?: string;
    reflection_data?: any;
  }): Promise<QuestSubmission> => {
    const response = await fetch(`${API_BASE_URL}/user-quests/${userQuestId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
      body: JSON.stringify(submissionData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to submit quest');
    }
    
    return response.json();
  },

  // 提出内容取得
  getQuestSubmission: async (userQuestId: number): Promise<QuestSubmission> => {
    const response = await fetch(`${API_BASE_URL}/user-quests/${userQuestId}/submission`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch quest submission');
    }
    
    return response.json();
  },

  // クエスト統計取得
  getQuestStats: async (): Promise<QuestStats> => {
    const response = await fetch(`${API_BASE_URL}/quest-stats`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch quest stats');
    }
    
    return response.json();
  },
};

export const themeDeepDiveApi = {
  generateSuggestions: async (request: ThemeDeepDiveRequest): Promise<ThemeDeepDiveResponse> => {
    const response = await fetch(`${API_BASE_URL}/framework-games/theme-deep-dive/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate suggestions');
    }
    
    return response.json();
  },
  
  saveSelection: async (theme: string, path: string[]): Promise<void> => {
    const response = await fetch(`${API_BASE_URL}/framework-games/theme-deep-dive/save-selection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`,
      },
      body: JSON.stringify({ theme, path }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save selection');
    }
  },
}; 