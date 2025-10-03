import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Stack,
  Button,
  Typography,
  Paper,
  Tab,
  Tabs,
  Chip,
  Autocomplete,
  TextField,
  IconButton,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import ClearIcon from '@mui/icons-material/Clear';
import ReactMarkdown from 'react-markdown';

import { MultiMemo } from './MultiMemoManager';

export interface MemoEditorProps {
  memo?: MultiMemo; // memo がない場合は新規作成モード
  projectId?: number;
  onSave: (payload: Partial<MultiMemo>) => Promise<void>;
  onCancel?: () => void;
  enablePreview?: boolean; // default true
  availableTags?: string[]; // 既存タグの候補
}

/**
 * シンプルなtextarea実装をベースにしたメモエディタ
 * 外部コードのアイデアを既存プロジェクトに適応
 */
export const MemoEditor: React.FC<MemoEditorProps> = ({
  memo,
  projectId,
  onSave,
  onCancel,
  enablePreview = true,
  availableTags = [],
}) => {
  const [markdown, setMarkdown] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [dirty, setDirty] = useState(false);

  // memo propの変更を監視してstateを更新する
  useEffect(() => {
    if (memo) {
      // 既存メモの読み込み
      const title = memo.title || '';
      const content = memo.content || '';
      
      // 保存ロジック（1行目がtitle）と対称的に、titleとcontentを改行で結合して表示
      const fullText = title && content ? `${title}\n${content}` : title || content;
      
      setMarkdown(fullText);
      setTags(memo.tags ?? []);
      setDirty(false); // 初期読み込み時は「未保存」ではない
    } else {
      // 新規メモの場合
      setMarkdown('');
      setTags([]);
      setDirty(false);
    }
  }, [memo]); // memoオブジェクトが変更されたときにこのフックを実行
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [saving, setSaving] = useState(false);
  
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const isNew = !memo?.id;

  // Markdownからタイトルと本文を抽出
  const extractTitleAndContent = (md: string) => {
    const lines = md.trim().split('\n');
    const firstLine = lines[0] || '';
    
    // 最初の行が # で始まる場合はタイトルとして扱う
    if (firstLine.startsWith('# ')) {
      const title = firstLine.substring(2).trim();
      const content = lines.slice(1).join('\n').trim();
      return { title, content };
    } else {
      // # がない場合は最初の行をタイトル、残りを本文とする
      const title = firstLine.trim();
      const content = lines.slice(1).join('\n').trim();
      return { title, content };
    }
  };

  // ハッシュタグ自動検出
  const extractHashtags = (text: string): string[] => {
    const hashtagRegex = /#([^\s#]+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  };

  const contentHashtags = extractHashtags(markdown);
  const allAvailableTags = [...new Set([...availableTags, ...contentHashtags, ...tags])];

  // textareaの高さ自動調整（外部コードのアイデアを採用）
  useEffect(() => {
    const el = textAreaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [markdown]);

  // キーボードショートカット (Ctrl+S / Cmd+S) の設定
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (dirty) {
          handleSave();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dirty, markdown, tags]);

  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = '保存されていない変更があります。本当にページを離れますか？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  // 手動保存
  const handleSave = async () => {
    const { title, content } = extractTitleAndContent(markdown);
    
    if (!title.trim()) {
      alert('タイトルを入力してください（最初の行）');
      return;
    }

    try {
      setSaving(true);
      await onSave({
        id: memo?.id,
        title: title.trim(),
        content,
        tags: [...new Set([...tags, ...contentHashtags])],
        project_id: projectId,
        created_at: memo?.created_at,
        updated_at: new Date().toISOString(),
      });
      setDirty(false);
    } catch (err) {
      console.error('Save error:', err);
      alert('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  // クリア機能
  const handleClear = () => {
    if (dirty) {
      if (!confirm('保存されていない変更があります。本当にクリアしますか？')) {
        return;
      }
    } else if (!confirm('入力内容をクリアしますか？')) {
      return;
    }
    setMarkdown('');
    setTags([]);
    setDirty(false);
  };

  const { title } = extractTitleAndContent(markdown);

  // 編集画面（シンプルなtextarea実装）
  const EditorFields = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* ツールバー */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h6" sx={{ flex: 1 }}>
          {isNew ? '新しいメモ' : 'メモを編集'}
        </Typography>
        <Tooltip title="内容をクリア">
          <IconButton onClick={handleClear} size="small">
            <ClearIcon />
          </IconButton>
        </Tooltip>
        <Tooltip title={dirty ? "保存 (Ctrl+S)" : "変更なし"}>
          <IconButton onClick={handleSave} size="small" color={dirty ? "primary" : "default"} disabled={saving || !dirty}>
            <SaveIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* タグ入力 */}
      <Autocomplete
        multiple
        freeSolo
        options={allAvailableTags}
        value={tags}
        onChange={(_, newValue) => {
          setTags(newValue);
          setDirty(true);
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="タグ"
            placeholder="タグを選択または入力..."
            size="small"
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <>
                  <LocalOfferIcon sx={{ mr: 1, color: 'action.active' }} />
                  {params.InputProps.startAdornment}
                </>
              ),
            }}
          />
        )}
        renderTags={(tagValue, getTagProps) =>
          tagValue.map((option, index) => (
            <Chip
              label={option}
              {...getTagProps({ index })}
              key={option}
              size="small"
              color={contentHashtags.includes(option) ? 'secondary' : 'default'}
            />
          ))
        }
        size="small"
      />

      {/* メイン入力エリア（シンプルなtextarea） */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <textarea
          ref={textAreaRef}
          value={markdown}
          onChange={(e) => {
            setMarkdown(e.target.value);
            setDirty(true);
          }}
          placeholder={`# メモのタイトル

メモの内容をMarkdown形式で入力できます...

## 例
- リスト項目
- **太字** や *斜体* も使えます
- #ハッシュタグ も自動認識されます`}
          style={{
            width: '100%',
            height: '100%',
            minHeight: '300px',
            padding: '16px',
            border: '1px solid #ccc',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            resize: 'none',
            outline: 'none',
            backgroundColor: 'transparent',
          }}
          autoFocus={isNew}
        />
      </Box>

      {/* ハッシュタグ表示 */}
      {contentHashtags.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            ハッシュタグ検出: {contentHashtags.join(', ')}
          </Typography>
        </Box>
      )}
    </Box>
  );

  // プレビュー画面
  const PreviewPane = (
    <Paper variant="outlined" sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        {title || 'タイトル (未入力)'}
      </Typography>
      
      {/* タグ表示 */}
      {[...new Set([...tags, ...contentHashtags])].length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
            {[...new Set([...tags, ...contentHashtags])].map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                color={contentHashtags.includes(tag) ? 'secondary' : 'primary'}
                variant="outlined"
              />
            ))}
          </Stack>
        </Box>
      )}
      
      <ReactMarkdown>{markdown || '*ここに内容が表示されます*'}</ReactMarkdown>
    </Paper>
  );

  return (
    <Box sx={{ height: '70vh', display: 'flex', flexDirection: 'column', gap: 1 }}>
      {/* タブ切替 */}
      {enablePreview && (
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab value="edit" icon={<EditIcon />} label="編集" iconPosition="start" />
          <Tab value="preview" icon={<VisibilityIcon />} label="プレビュー" iconPosition="start" />
        </Tabs>
      )}

      {/* メインビュー */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'edit' ? EditorFields : PreviewPane}
      </Box>

      {/* アクションボタン */}
      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
        <Box>
          {/* 保存状態表示 */}
          <Typography variant="caption" color={dirty ? 'warning.main' : 'success.main'}>
            {saving
              ? '保存中...'
              : dirty
              ? '未保存の変更があります'
              : isNew ? '新規メモ' : '保存済み'}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1}>
          {onCancel && (
            <Button 
              variant="outlined" 
              startIcon={<CancelIcon />} 
              onClick={() => {
                if (dirty) {
                  const confirmed = confirm('保存されていない変更があります。本当にキャンセルしますか？');
                  if (!confirmed) return;
                }
                onCancel();
              }}
            >
              キャンセル
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || !dirty}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default MemoEditor;
