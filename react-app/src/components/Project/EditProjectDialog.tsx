import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';

interface Project {
  id: number;
  theme: string;
  question?: string;
  hypothesis?: string;
}

interface EditProjectDialogProps {
  open: boolean;
  project: Project | null;
  onClose: () => void;
  onSubmit: (projectId: number, data: {
    theme: string;
    question?: string;
    hypothesis?: string;
  }) => void;
}

const EditProjectDialog: React.FC<EditProjectDialogProps> = ({
  open,
  project,
  onClose,
  onSubmit,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [formData, setFormData] = useState({
    theme: '',
    question: '',
    hypothesis: '',
  });

  const [errors, setErrors] = useState({
    theme: '',
  });

  // プロジェクトデータで初期化
  useEffect(() => {
    if (project) {
      setFormData({
        theme: project.theme || '',
        question: project.question || '',
        hypothesis: project.hypothesis || '',
      });
    }
  }, [project]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // テーマのバリデーション
    if (field === 'theme') {
      setErrors(prev => ({
        ...prev,
        theme: value.trim() ? '' : 'テーマは必須です',
      }));
    }
  };

  const handleSubmit = () => {
    if (!project) return;

    // バリデーション
    const newErrors = {
      theme: formData.theme.trim() ? '' : 'テーマは必須です',
    };

    setErrors(newErrors);

    if (newErrors.theme) {
      return;
    }

    // データ送信
    const submitData = {
      theme: formData.theme.trim(),
      question: formData.question.trim() || undefined,
      hypothesis: formData.hypothesis.trim() || undefined,
    };

    onSubmit(project.id, submitData);
    handleClose();
  };

  const handleClose = () => {
    setErrors({
      theme: '',
    });
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle>
        <Typography variant="h5" fontWeight="bold">
          プロジェクト編集
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          探究学習のテーマと研究の方向性を編集してください
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 2 }}>
          {/* テーマ（必須） */}
          <TextField
            fullWidth
            label="テーマ"
            placeholder="例：AI技術の社会への影響"
            value={formData.theme}
            onChange={(e) => handleInputChange('theme', e.target.value)}
            error={Boolean(errors.theme)}
            helperText={errors.theme || '探究したいテーマを入力してください（必須）'}
            required
            sx={{ mb: 3 }}
            multiline
            rows={2}
          />

          {/* 問い（任意） */}
          <TextField
            fullWidth
            label="問い"
            placeholder="例：AIは私たちの生活をどのように変えるのか？"
            value={formData.question}
            onChange={(e) => handleInputChange('question', e.target.value)}
            helperText="研究で明らかにしたい問いを設定してください（任意）"
            sx={{ mb: 3 }}
            multiline
            rows={3}
          />

          {/* 仮説（任意） */}
          <TextField
            fullWidth
            label="仮説"
            placeholder="例：AIは効率性を向上させる一方で、雇用問題を引き起こす可能性がある"
            value={formData.hypothesis}
            onChange={(e) => handleInputChange('hypothesis', e.target.value)}
            helperText="現時点での仮説や予想を記入してください（任意）"
            sx={{ mb: 2 }}
            multiline
            rows={3}
          />

          <Box
            sx={{
              backgroundColor: 'info.light',
              borderRadius: 1,
              p: 2,
              mt: 2,
            }}
          >
            <Typography variant="body2" color="info.dark">
              💡 ヒント：探究を進めながら、問いや仮説は何度でも見直すことができます。
              新しい発見があったら、いつでも更新してください。
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} color="inherit">
          キャンセル
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.theme.trim()}
        >
          更新
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditProjectDialog; 