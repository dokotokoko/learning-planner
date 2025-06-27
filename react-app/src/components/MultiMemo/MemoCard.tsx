import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Chip,
  Stack,
  Box,
  Menu,
  MenuItem,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIcon,
  Schedule as TimeIcon,
  Folder as ProjectIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { MultiMemo } from './MultiMemoManager';

interface MemoCardProps {
  memo: MultiMemo;
  viewMode: 'grid' | 'list';
  onEdit: (memo: MultiMemo) => void;
  onDelete: (memoId: number) => void;
  onTagClick: (tag: string) => void;
  onView: (memoId: number) => void;
}

const MemoCard: React.FC<MemoCardProps> = ({
  memo,
  viewMode,
  onEdit,
  onDelete,
  onTagClick,
  onView,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: memo.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleCardClick = () => {
    onView(memo.id);
  };

  // メモ内容のプレビュー（最初の100文字）
  const getContentPreview = (content: string): string => {
    const cleanContent = content.replace(/[#*`\[\]]/g, '').trim();
    return cleanContent.length > 100 
      ? cleanContent.substring(0, 100) + '...'
      : cleanContent;
  };

  // ハッシュタグの検出
  const extractHashtags = (content: string): string[] => {
    const hashtagRegex = /#([^\s#]+)/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };

  const hashtagsInContent = extractHashtags(memo.content);
  const allTags = [...new Set([...memo.tags, ...hashtagsInContent])];

  return (
    <Card
      ref={setNodeRef}
      style={style}
      onClick={handleCardClick}
      sx={{
        cursor: isDragging ? 'grabbing' : 'pointer',
        height: viewMode === 'list' ? 'auto' : 280,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        '&:hover': {
          boxShadow: theme.shadows[8],
          transform: isDragging ? undefined : 'translateY(-2px)',
        },
        transition: 'all 0.3s ease',
      }}
    >
      {/* ドラッグハンドル */}
      <Box
        {...attributes}
        {...listeners}
        sx={{
          position: 'absolute',
          top: 8,
          left: 8,
          zIndex: 1,
          opacity: 0.3,
          '&:hover': { opacity: 1 },
        }}
      >
        <DragIcon fontSize="small" />
      </Box>

      <CardContent sx={{ flexGrow: 1, pt: 5 }}>
        {/* タイトル */}
        <Typography
          variant="h6"
          component="h3"
          gutterBottom
          sx={{
            fontWeight: 'bold',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {memo.title}
        </Typography>

        {/* 内容プレビュー */}
        <Typography
          variant="body2"
          color="textSecondary"
          sx={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: viewMode === 'grid' ? 4 : 2,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.5,
            mb: 2,
          }}
        >
          {getContentPreview(memo.content)}
        </Typography>

        {/* タグ */}
        {allTags.length > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: 'wrap', gap: 0.5 }}>
            {allTags.slice(0, viewMode === 'grid' ? 3 : 5).map((tag, index) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  onTagClick(tag);
                }}
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              />
            ))}
            {allTags.length > (viewMode === 'grid' ? 3 : 5) && (
              <Chip
                label={`+${allTags.length - (viewMode === 'grid' ? 3 : 5)}`}
                size="small"
                variant="outlined"
                sx={{
                  height: 20,
                  fontSize: '0.7rem',
                }}
              />
            )}
          </Stack>
        )}

        {/* メタ情報 */}
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1} alignItems="center">
            <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            <Typography variant="caption" color="textSecondary">
              {format(new Date(memo.updated_at), 'M/d HH:mm', { locale: ja })}
            </Typography>
          </Stack>
          
          {memo.project_id && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <ProjectIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
              <Typography variant="caption" color="textSecondary">
                プロジェクト
              </Typography>
            </Stack>
          )}
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
        <Box />
        
        <IconButton
          size="small"
          onClick={(e) => setMenuAnchor(e.currentTarget)}
        >
          <MoreIcon />
        </IconButton>
      </CardActions>

      {/* アクションメニュー */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
        onClick={(e) => e.stopPropagation()}
      >
        <MenuItem
          onClick={() => {
            onEdit(memo);
            setMenuAnchor(null);
          }}
        >
          <EditIcon sx={{ mr: 1, fontSize: 20 }} />
          編集
        </MenuItem>
        <MenuItem
          onClick={() => {
            onDelete(memo.id);
            setMenuAnchor(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1, fontSize: 20 }} />
          削除
        </MenuItem>
      </Menu>
    </Card>
  );
};

export default MemoCard; 