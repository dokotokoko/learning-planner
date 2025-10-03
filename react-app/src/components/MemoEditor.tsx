import React, { useState, useCallback, useRef, memo, useEffect } from 'react';
import { TextField, Box, useTheme, useMediaQuery, IconButton, Tooltip, Typography } from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

interface MemoEditorProps {
  initialContent: string;
  onContentChange: (content: string) => void;
  onSave: (content: string) => void;
  placeholder?: string;
}

const MemoEditor: React.FC<MemoEditorProps> = memo(({
  initialContent,
  onContentChange,
  onSave,
  placeholder
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 遅延初期化でstateを設定（再マウント時に自動的に初期化される）
  const [content, setContent] = useState(() => initialContent);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setContent(newContent);
    
    // 親コンポーネントに通知
    onContentChange(newContent);
    
    // 未保存フラグを設定
    if (newContent !== initialContent) {
      setHasUnsavedChanges(true);
    } else {
      setHasUnsavedChanges(false);
    }
  }, [onContentChange, initialContent]);
  
  // 手動保存
  const handleSave = useCallback(() => {
    if (hasUnsavedChanges) {
      onSave(content);
      setHasUnsavedChanges(false);
    }
  }, [content, onSave, hasUnsavedChanges]);

  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      handleSave();
    }
  }, [handleSave]);
  
  // ページ離脱時の警告
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '保存されていない変更があります。本当にページを離れますか？';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
  
  return (
    <Box sx={{ 
      flex: 1,
      overflow: 'auto',
      p: 3,
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* 保存ステータスと保存ボタン */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 2,
        minHeight: '40px'
      }}>
        <Typography variant="caption" color={hasUnsavedChanges ? 'warning.main' : 'success.main'}>
          {hasUnsavedChanges ? '未保存の変更があります' : '保存済み'}
        </Typography>
        <Tooltip title={hasUnsavedChanges ? "保存 (Ctrl+S)" : "変更なし"} arrow>
          <span>
            <IconButton 
              onClick={handleSave} 
              size="small" 
              color={hasUnsavedChanges ? "primary" : "default"}
              disabled={!hasUnsavedChanges}
            >
              <SaveIcon />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      
      <TextField
        multiline
        fullWidth
        minRows={isMobile ? 18 : 28}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        variant="standard"
        sx={{
          flex: 1,
          '& .MuiInputBase-root': {
            padding: 0,
          },
          '& .MuiInput-underline:before': {
            display: 'none',
          },
          '& .MuiInput-underline:after': {
            display: 'none',
          },
        }}
      />
    </Box>
  );
});

MemoEditor.displayName = 'MemoEditor';

export default MemoEditor;