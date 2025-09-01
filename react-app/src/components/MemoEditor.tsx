import React, { useState, useCallback, useRef, memo } from 'react';
import { TextField, Box, useTheme, useMediaQuery } from '@mui/material';

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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const handleChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    setContent(newContent);
    
    // 親コンポーネントに通知
    onContentChange(newContent);
    
    // デバウンス保存（イベント駆動）
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    saveTimeoutRef.current = setTimeout(() => {
      onSave(newContent);
      saveTimeoutRef.current = null;
    }, 2000);
  }, [onContentChange, onSave]);
  
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      // 即座に保存
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      onSave(content);
    }
  }, [content, onSave]);
  
  // コンポーネントアンマウント時のクリーンアップ
  React.useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);
  
  return (
    <Box sx={{ 
      flex: 1,
      overflow: 'auto',
      p: 3,
    }}>
      <TextField
        multiline
        fullWidth
        minRows={isMobile ? 20 : 30}
        value={content}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        variant="standard"
        sx={{
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