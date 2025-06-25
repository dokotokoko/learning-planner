import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Chip,
  Stack,
  Grid,
  IconButton,
  Alert,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Sort as SortIcon,
  DeleteSweep as ClearAllIcon,
} from '@mui/icons-material';

interface MyTagsProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
}

const MyTags: React.FC<MyTagsProps> = ({
  tags,
  onTagsChange,
  placeholder = "例: 音楽、映画、読書、スポーツ",
  maxTags = 50,
}) => {
  const [newTag, setNewTag] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info' | 'warning', text: string } | null>(null);

  // メッセージ表示用のヘルパー
  const showMessage = (type: 'success' | 'error' | 'info' | 'warning', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // 単一タグ追加
  const handleAddTag = () => {
    const trimmedTag = newTag.trim();
    if (!trimmedTag) return;

    if (tags.includes(trimmedTag)) {
      showMessage('warning', '既に存在しています');
      return;
    }

    if (tags.length >= maxTags) {
      showMessage('warning', `タグは最大${maxTags}個まで追加できます`);
      return;
    }

    onTagsChange([...tags, trimmedTag]);
    setNewTag('');
    showMessage('success', `'${trimmedTag}'を追加しました`);
  };

  // タグ削除
  const handleDeleteTag = (tagToDelete: string) => {
    onTagsChange(tags.filter(tag => tag !== tagToDelete));
    showMessage('success', `'${tagToDelete}'を削除しました`);
  };

  // 並び替え
  const handleSort = () => {
    const sortedTags = [...tags].sort();
    onTagsChange(sortedTags);
    showMessage('success', '並び替えました');
  };

  // 全削除
  const handleClearAll = () => {
    if (confirmClear) {
      onTagsChange([]);
      setEditMode(false);
      setConfirmClear(false);
      showMessage('success', '全て削除しました');
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  // キーボードイベント処理
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleAddTag();
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      {/* メッセージ表示 */}
      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* 左側：タグ追加 */}
        <Grid item xs={12} md={6}>
          <Stack spacing={2}>
            <TextField
              fullWidth
              size="small"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              disabled={tags.length >= maxTags}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddTag}
              disabled={!newTag.trim() || tags.length >= maxTags}
              fullWidth
            >
              追加
            </Button>
          </Stack>
        </Grid>

        {/* 右側：タグ一覧 */}
        <Grid item xs={12} md={6}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {tags.length} / {maxTags} 個
            </Box>
            {tags.length > 0 && (
              <Button
                variant={editMode ? "contained" : "outlined"}
                startIcon={editMode ? <SaveIcon /> : <EditIcon />}
                onClick={() => {
                  if (editMode) {
                    showMessage('success', '編集を完了しました');
                  }
                  setEditMode(!editMode);
                  setConfirmClear(false);
                }}
                size="small"
              >
                {editMode ? '完了' : '編集'}
              </Button>
            )}
          </Stack>

          {tags.length > 0 ? (
            <Box>
              {/* タグ一覧 */}
              <Box sx={{ mb: 2, maxHeight: 300, overflowY: 'auto' }}>
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {tags.map((tag, index) => (
                    <Chip
                      key={`${tag}-${index}`}
                      label={tag}
                      color="primary"
                      variant="outlined"
                      onDelete={editMode ? () => handleDeleteTag(tag) : undefined}
                      sx={{ mb: 0.5 }}
                    />
                  ))}
                </Stack>
              </Box>

              {/* 編集モード時の操作ボタン */}
              {editMode && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      startIcon={<SortIcon />}
                      onClick={handleSort}
                      size="small"
                    >
                      並び替え
                    </Button>
                    <Button
                      variant="outlined"
                      color={confirmClear ? "error" : "warning"}
                      startIcon={<ClearAllIcon />}
                      onClick={handleClearAll}
                      size="small"
                    >
                      {confirmClear ? '本当に削除' : '全削除'}
                    </Button>
                  </Stack>
                                      {confirmClear && (
                      <Box sx={{ mt: 1, fontSize: '0.75rem', color: 'error.main' }}>
                        もう一度押すと全削除されます
                      </Box>
                    )}
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
              <Box sx={{ fontSize: '0.875rem' }}>タグがありません</Box>
            </Box>
          )}
        </Grid>
      </Grid>
    </Paper>
  );
};

export default MyTags; 