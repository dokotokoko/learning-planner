import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Menu,
  MenuItem,
  InputAdornment,
  useTheme,
  useMediaQuery,
  Autocomplete,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Label as TagIcon,
  Folder as ProjectIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import Fuse from 'fuse.js';
import { debounce } from 'lodash';
import { useNavigate } from 'react-router-dom';

import MemoCard from './MemoCard';
import MemoEditor from './MemoEditor';
import ProjectSelector from './ProjectSelector';

// 型定義
export interface MultiMemo {
  id: number;
  title: string;
  content: string;
  tags: string[];
  project_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: number;
  title: string;
  description?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  memo_count: number;
}

interface MultiMemoManagerProps {
  userId: string;
  projectId?: number;
  onMemosChange?: (memos: MultiMemo[]) => void;
}

type ViewMode = 'grid' | 'list';
type SortBy = 'updated_at' | 'created_at' | 'title';
type SortOrder = 'asc' | 'desc';

const MultiMemoManager: React.FC<MultiMemoManagerProps> = ({
  userId,
  projectId,
  onMemosChange,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();

  // State管理
  const [memos, setMemos] = useState<MultiMemo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<number | null>(projectId || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('updated_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MultiMemo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // メニューアンカー
  const [filterMenuAnchor, setFilterMenuAnchor] = useState<null | HTMLElement>(null);
  const [sortMenuAnchor, setSortMenuAnchor] = useState<null | HTMLElement>(null);

  // ドラッグ&ドロップ
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // メモ一覧の取得
  const fetchMemos = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth-token');
      const endpoint = selectedProject 
        ? `/projects/${selectedProject}/memos`
        : '/memos';
      
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('メモの取得に失敗しました');
      
      const data = await response.json();
      setMemos(data);
      onMemosChange?.(data);
    } catch (error) {
      console.error('Error fetching memos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedProject, onMemosChange]);

  // プロジェクト一覧の取得
  const fetchProjects = useCallback(async () => {
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('プロジェクトの取得に失敗しました');
      
      const data = await response.json();
      setProjects(data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  }, []);

  // 初期化
  useEffect(() => {
    fetchMemos();
    fetchProjects();
  }, [fetchMemos, fetchProjects]);

  // 検索とフィルタリング
  const fuseOptions = {
    keys: ['title', 'content', 'tags'],
    threshold: 0.3,
  };
  
  const fuse = useMemo(() => new Fuse(memos, fuseOptions), [memos]);

  const filteredAndSortedMemos = useMemo(() => {
    let result = [...memos];

    // 検索フィルタ
    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      result = searchResults.map(item => item.item);
    }

    // タグフィルタ
    if (selectedTags.length > 0) {
      result = result.filter(memo =>
        selectedTags.every(tag => memo.tags.includes(tag))
      );
    }

    // ソート
    result.sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      if (sortBy === 'title') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        const aDate = new Date(aValue);
        const bDate = new Date(bValue);
        return sortOrder === 'asc'
          ? aDate.getTime() - bDate.getTime()
          : bDate.getTime() - aDate.getTime();
      }
    });

    return result;
  }, [memos, searchQuery, selectedTags, sortBy, sortOrder, fuse]);

  // 全タグの取得
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    memos.forEach(memo => {
      memo.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [memos]);

  // デバウンスされた検索
  const debouncedSearch = useMemo(
    () => debounce((query: string) => setSearchQuery(query), 300),
    []
  );

  // メモ作成
  const handleCreateMemo = async (memoData: Partial<MultiMemo>) => {
    try {
      const token = localStorage.getItem('auth-token');
      const endpoint = selectedProject 
        ? `/projects/${selectedProject}/memos`
        : '/memos';
      
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...memoData,
          project_id: selectedProject,
        }),
      });

      if (!response.ok) throw new Error('メモの作成に失敗しました');
      
      await fetchMemos();
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating memo:', error);
    }
  };

  // メモ更新
  const handleUpdateMemo = async (memoId: number, memoData: Partial<MultiMemo>) => {
    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(memoData),
      });

      if (!response.ok) throw new Error('メモの更新に失敗しました');
      
      await fetchMemos();
      setEditingMemo(null);
    } catch (error) {
      console.error('Error updating memo:', error);
    }
  };

  // メモ削除
  const handleDeleteMemo = async (memoId: number) => {
    if (!confirm('このメモを削除しますか？')) return;

    try {
      const token = localStorage.getItem('auth-token');
      const apiBaseUrl = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/memos/${memoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('メモの削除に失敗しました');
      
      await fetchMemos();
    } catch (error) {
      console.error('Error deleting memo:', error);
    }
  };

  // ドラッグ&ドロップ処理
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setMemos((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  return (
    <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Typography variant="h5" fontWeight="bold">
            メモ一覧
          </Typography>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={(e) => setFilterMenuAnchor(e.currentTarget)}
              color={selectedTags.length > 0 ? 'primary' : 'default'}
            >
              <FilterIcon />
            </IconButton>
            <IconButton onClick={(e) => setSortMenuAnchor(e.currentTarget)}>
              <SortIcon />
            </IconButton>
            <IconButton 
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <ListViewIcon /> : <GridViewIcon />}
            </IconButton>
          </Stack>
        </Box>

        {/* 検索バー */}
        <TextField
          fullWidth
          placeholder="メモを検索..."
          onChange={(e) => debouncedSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* プロジェクト選択 */}
        <ProjectSelector
          projects={projects}
          selectedProject={selectedProject}
          onProjectChange={setSelectedProject}
        />

        {/* 選択中のタグ */}
        {selectedTags.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            {selectedTags.map(tag => (
              <Chip
                key={tag}
                label={tag}
                onDelete={() => setSelectedTags(prev => prev.filter(t => t !== tag))}
                size="small"
              />
            ))}
          </Stack>
        )}
      </Paper>

      {/* メモリスト */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredAndSortedMemos.map(memo => memo.id)}
            strategy={verticalListSortingStrategy}
          >
            <Box
              sx={{
                display: viewMode === 'grid' ? 'grid' : 'flex',
                flexDirection: viewMode === 'list' ? 'column' : undefined,
                gridTemplateColumns: isMobile 
                  ? '1fr' 
                  : 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: 2,
              }}
            >
              <AnimatePresence>
                {filteredAndSortedMemos.map(memo => (
                  <motion.div
                    key={memo.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <MemoCard
                      memo={memo}
                      viewMode={viewMode}
                      onEdit={setEditingMemo}
                      onDelete={handleDeleteMemo}
                      onTagClick={(tag) => {
                        if (!selectedTags.includes(tag)) {
                          setSelectedTags(prev => [...prev, tag]);
                        }
                      }}
                      onView={(memoId) => navigate(`/memo/${memoId}`)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </Box>
          </SortableContext>
        </DndContext>

        {filteredAndSortedMemos.length === 0 && !isLoading && (
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            justifyContent="center"
            sx={{ mt: 8 }}
          >
            <Typography variant="h6" color="textSecondary" gutterBottom>
              メモが見つかりません
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              新しいメモを作成してみましょう
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setIsCreateDialogOpen(true)}
            >
              メモを作成
            </Button>
          </Box>
        )}
      </Box>

      {/* FAB */}
      <Fab
        color="primary"
        aria-label="add memo"
        onClick={() => setIsCreateDialogOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>

      {/* フィルターメニュー */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={() => setFilterMenuAnchor(null)}
      >
        <Box sx={{ p: 2, minWidth: 200 }}>
          <Typography variant="subtitle2" gutterBottom>
            タグでフィルタ
          </Typography>
          <Autocomplete
            multiple
            options={allTags}
            value={selectedTags}
            onChange={(_, newValue) => setSelectedTags(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                size="small"
                placeholder="タグを選択..."
              />
            )}
            renderTags={(value, getTagProps) =>
              value.map((option, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={option}
                  variant="outlined"
                  label={option}
                  size="small"
                />
              ))
            }
          />
        </Box>
      </Menu>

      {/* ソートメニュー */}
      <Menu
        anchorEl={sortMenuAnchor}
        open={Boolean(sortMenuAnchor)}
        onClose={() => setSortMenuAnchor(null)}
      >
        <MenuItem onClick={() => { setSortBy('updated_at'); setSortOrder('desc'); setSortMenuAnchor(null); }}>
          更新日時（新しい順）
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('updated_at'); setSortOrder('asc'); setSortMenuAnchor(null); }}>
          更新日時（古い順）
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('created_at'); setSortOrder('desc'); setSortMenuAnchor(null); }}>
          作成日時（新しい順）
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('created_at'); setSortOrder('asc'); setSortMenuAnchor(null); }}>
          作成日時（古い順）
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('title'); setSortOrder('asc'); setSortMenuAnchor(null); }}>
          タイトル（A-Z）
        </MenuItem>
        <MenuItem onClick={() => { setSortBy('title'); setSortOrder('desc'); setSortMenuAnchor(null); }}>
          タイトル（Z-A）
        </MenuItem>
      </Menu>

      {/* メモ作成ダイアログ */}
      <Dialog
        open={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>新しいメモを作成</DialogTitle>
        <DialogContent>
          <MemoEditor
            key="create-memo"
            projectId={selectedProject || undefined}
            onSave={handleCreateMemo}
            onCancel={() => setIsCreateDialogOpen(false)}
            availableTags={allTags}
          />
        </DialogContent>
      </Dialog>

      {/* メモ編集ダイアログ */}
      <Dialog
        open={Boolean(editingMemo)}
        onClose={() => setEditingMemo(null)}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>メモを編集</DialogTitle>
        <DialogContent>
          {editingMemo && (
            <MemoEditor
              key={`edit-memo-${editingMemo.id}`}
              memo={editingMemo}
              projectId={editingMemo.project_id}
              onSave={(data) => handleUpdateMemo(editingMemo.id, data)}
              onCancel={() => setEditingMemo(null)}
              availableTags={allTags}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default MultiMemoManager; 