import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Chip,
  Stack,
  Autocomplete,
  Paper,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Preview as PreviewIcon,
  Edit as EditIcon,
  Tag as TagIcon,
} from '@mui/icons-material';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import ReactMarkdown from 'react-markdown';
import { debounce } from 'lodash';

import { MultiMemo } from './MultiMemoManager';

interface MemoEditorProps {
  memo?: MultiMemo;
  onSave: (memoData: Partial<MultiMemo>) => void;
  onCancel: () => void;
  availableTags: string[];
}

const MemoEditor: React.FC<MemoEditorProps> = ({
  memo,
  onSave,
  onCancel,
  availableTags,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [title, setTitle] = useState(memo?.title || '');
  const [content, setContent] = useState(memo?.content || '');
  const [tags, setTags] = useState<string[]>(memo?.tags || []);
  const [currentTab, setCurrentTab] = useState(0); // 0: エディット, 1: プレビュー
  const [isDirty, setIsDirty] = useState(false);

  // 自動保存のデバウンス
  const debouncedSave = useCallback(
    debounce(() => {
      if (memo && isDirty) {
        onSave({
          title,
          content,
          tags,
        });
        setIsDirty(false);
      }
    }, 2000),
    [title, content, tags, memo, isDirty, onSave]
  );

  // 内容変更時の処理
  useEffect(() => {
    if (memo) {
      setIsDirty(true);
      debouncedSave();
    }
  }, [title, content, tags, memo, debouncedSave]);

  // ハッシュタグの自動抽出
  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#([^\s#]+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };

  // 内容からハッシュタグを抽出してタグに追加
  useEffect(() => {
    const extractedTags = extractHashtags(content);
    if (extractedTags.length > 0) {
      setTags(prev => {
        const newTags = [...new Set([...prev, ...extractedTags])];
        return newTags;
      });
    }
  }, [content]);

  // 保存処理
  const handleSave = () => {
    if (!title.trim()) {
      alert('タイトルを入力してください');
      return;
    }

    onSave({
      title: title.trim(),
      content,
      tags,
    });
  };

  // Markdownツールバー
  const insertMarkdown = (prefix: string, suffix: string = '') => {
    const textarea = document.getElementById('memo-content') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const newText = prefix + selectedText + suffix;
    
    setContent(
      content.substring(0, start) + newText + content.substring(end)
    );

    // カーソル位置を調整
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  const MarkdownToolbar = () => (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertMarkdown('**', '**')}
      >
        Bold
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertMarkdown('*', '*')}
      >
        Italic
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertMarkdown('# ')}
      >
        H1
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertMarkdown('## ')}
      >
        H2
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertMarkdown('- ')}
      >
        List
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertMarkdown('[', '](url)')}
      >
        Link
      </Button>
      <Button
        size="small"
        variant="outlined"
        onClick={() => insertMarkdown('`', '`')}
      >
        Code
      </Button>
    </Stack>
  );

  // デスクトップレイアウト（分割ビュー）
  if (!isMobile) {
    return (
      <Box sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
        {/* タイトル入力 */}
        <TextField
          fullWidth
          placeholder="メモのタイトル..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          variant="outlined"
          sx={{ mb: 2 }}
          autoFocus
        />

        {/* タグ入力 */}
        <Autocomplete
          multiple
          freeSolo
          options={availableTags}
          value={tags}
          onChange={(_, newValue) => setTags(newValue as string[])}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="タグを追加..."
              InputProps={{
                ...params.InputProps,
                startAdornment: <TagIcon sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
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
          sx={{ mb: 2 }}
        />

        {/* エディター・プレビュー分割ビュー */}
        <Box sx={{ flexGrow: 1, border: 1, borderColor: 'divider', borderRadius: 1 }}>
          <PanelGroup direction="horizontal">
            {/* エディター */}
            <Panel defaultSize={50} minSize={30}>
              <Box sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Typography variant="subtitle2" gutterBottom>
                  エディター
                </Typography>
                <MarkdownToolbar />
                <TextField
                  id="memo-content"
                  multiline
                  placeholder="メモの内容をMarkdownで記述..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  variant="outlined"
                  sx={{
                    flexGrow: 1,
                    '& .MuiInputBase-root': {
                      height: '100%',
                      alignItems: 'flex-start',
                    },
                    '& .MuiInputBase-input': {
                      height: '100% !important',
                      overflowY: 'auto !important',
                    },
                  }}
                />
              </Box>
            </Panel>

            <PanelResizeHandle style={{ width: '2px', backgroundColor: theme.palette.divider }} />

            {/* プレビュー */}
            <Panel defaultSize={50} minSize={30}>
              <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                <Typography variant="subtitle2" gutterBottom>
                  プレビュー
                </Typography>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2,
                    height: 'calc(100% - 32px)',
                    overflow: 'auto',
                    backgroundColor: 'background.default',
                  }}
                >
                  <ReactMarkdown>
                    {content || '*プレビューはここに表示されます*'}
                  </ReactMarkdown>
                </Paper>
              </Box>
            </Panel>
          </PanelGroup>
        </Box>

        {/* アクションボタン */}
        <Stack direction="row" spacing={2} sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            onClick={onCancel}
            startIcon={<CancelIcon />}
          >
            キャンセル
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            startIcon={<SaveIcon />}
            disabled={!title.trim()}
          >
            保存
          </Button>
        </Stack>

        {memo && isDirty && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
            未保存の変更があります（自動保存まで数秒）
          </Typography>
        )}
      </Box>
    );
  }

  // モバイルレイアウト（タブ切り替え）
  return (
    <Box sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
      {/* タイトル入力 */}
      <TextField
        fullWidth
        placeholder="メモのタイトル..."
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        variant="outlined"
        sx={{ mb: 2 }}
        autoFocus
      />

      {/* タグ入力 */}
      <Autocomplete
        multiple
        freeSolo
        options={availableTags}
        value={tags}
        onChange={(_, newValue) => setTags(newValue as string[])}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="タグを追加..."
            InputProps={{
              ...params.InputProps,
              startAdornment: <TagIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
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
        sx={{ mb: 2 }}
      />

      {/* タブ */}
      <Tabs
        value={currentTab}
        onChange={(_, newValue) => setCurrentTab(newValue)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab icon={<EditIcon />} label="エディット" />
        <Tab icon={<PreviewIcon />} label="プレビュー" />
      </Tabs>

      {/* タブコンテンツ */}
      <Box sx={{ flexGrow: 1, p: 2 }}>
        {currentTab === 0 ? (
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <MarkdownToolbar />
            <TextField
              id="memo-content"
              multiline
              placeholder="メモの内容をMarkdownで記述..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              variant="outlined"
              sx={{
                flexGrow: 1,
                '& .MuiInputBase-root': {
                  height: '100%',
                  alignItems: 'flex-start',
                },
                '& .MuiInputBase-input': {
                  height: '100% !important',
                  overflowY: 'auto !important',
                },
              }}
            />
          </Box>
        ) : (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              height: '100%',
              overflow: 'auto',
              backgroundColor: 'background.default',
            }}
          >
            <ReactMarkdown>
              {content || '*プレビューはここに表示されます*'}
            </ReactMarkdown>
          </Paper>
        )}
      </Box>

      {/* アクションボタン */}
      <Stack direction="row" spacing={2} sx={{ p: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          startIcon={<CancelIcon />}
        >
          キャンセル
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={<SaveIcon />}
          disabled={!title.trim()}
        >
          保存
        </Button>
      </Stack>

      {memo && isDirty && (
        <Typography variant="caption" color="warning.main" sx={{ px: 2, pb: 1 }}>
          未保存の変更があります（自動保存まで数秒）
        </Typography>
      )}
    </Box>
  );
};

export default MemoEditor; 