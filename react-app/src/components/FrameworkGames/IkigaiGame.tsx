import React, { useState, useRef } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Grid, Card, CardContent, IconButton, Chip } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PublicIcon from '@mui/icons-material/Public';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface IkigaiItem {
  id: string;
  text: string;
  categories: ('love' | 'good' | 'world' | 'paid')[];
  position?: { x: number, y: number };
  isDragging?: boolean;
}

interface Position {
  x: number;
  y: number;
}

const IkigaiGame: React.FC = () => {
  const [items, setItems] = useState<IkigaiItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<('love' | 'good' | 'world' | 'paid')[]>([]);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const matrixRef = useRef<HTMLDivElement>(null);

  const handleAddItem = () => {
    if (newItemText && selectedCategories.length > 0) {
      const newItem: IkigaiItem = {
        id: Date.now().toString(),
        text: newItemText,
        categories: [...selectedCategories],
        position: { x: 50, y: 50 }, // デフォルト位置（中央）
      };
      setItems([...items, newItem]);
      setNewItemText('');
      setSelectedCategories([]);
    }
  };

  const handleDeleteItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleToggleCategory = (category: 'love' | 'good' | 'world' | 'paid') => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(c => c !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const getItemsByCategories = (categories: ('love' | 'good' | 'world' | 'paid')[]) => {
    return items.filter(item => 
      categories.every(category => item.categories.includes(category))
    );
  };

  const getCategoryColor = (category: 'love' | 'good' | 'world' | 'paid') => {
    switch (category) {
      case 'love':
        return 'error';
      case 'good':
        return 'success';
      case 'world':
        return 'info';
      case 'paid':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getCategoryIcon = (category: 'love' | 'good' | 'world' | 'paid') => {
    switch (category) {
      case 'love':
        return <FavoriteIcon fontSize="small" />;
      case 'good':
        return <EmojiEventsIcon fontSize="small" />;
      case 'world':
        return <PublicIcon fontSize="small" />;
      case 'paid':
        return <AttachMoneyIcon fontSize="small" />;
      default:
        return <FavoriteIcon fontSize="small" />;
    }
  };

  const getCategoryLabel = (category: 'love' | 'good' | 'world' | 'paid') => {
    switch (category) {
      case 'love':
        return '好きなこと';
      case 'good':
        return '得意なこと';
      case 'world':
        return '世界が求めること';
      case 'paid':
        return '報酬が得られること';
      default:
        return '';
    }
  };

  // ドラッグ開始
  const handleDragStart = (e: React.MouseEvent<HTMLDivElement>, id: string) => {
    const item = items.find(item => item.id === id);
    if (!item) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggedItemId(id);
    
    // ドラッグ中のアイテムを更新
    setItems(items.map(item => 
      item.id === id ? { ...item, isDragging: true } : item
    ));
  };

  // ドラッグ中
  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedItemId || !matrixRef.current) return;
    
    const matrixRect = matrixRef.current.getBoundingClientRect();
    const x = ((e.clientX - matrixRect.left - dragOffset.x) / matrixRect.width) * 100;
    const y = ((e.clientY - matrixRect.top - dragOffset.y) / matrixRect.height) * 100;
    
    // 範囲内に制限
    const boundedX = Math.max(0, Math.min(100, x));
    const boundedY = Math.max(0, Math.min(100, y));
    
    setItems(items.map(item => 
      item.id === draggedItemId 
        ? { ...item, position: { x: boundedX, y: boundedY } } 
        : item
    ));
  };

  // ドラッグ終了
  const handleDragEnd = () => {
    setDraggedItemId(null);
    setItems(items.map(item => 
      item.isDragging ? { ...item, isDragging: false } : item
    ));
  };

  // マトリクス上のマウス移動
  const handleMatrixMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedItemId) {
      handleDrag(e);
    }
  };

  // マトリクス上のマウスアップ
  const handleMatrixMouseUp = () => {
    if (draggedItemId) {
      handleDragEnd();
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          IKIGAIマトリクス
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          好き／得意／世界が求める／報酬の4つの要素から生きがいを見つける手法です。
        </Typography>

        <Paper variant="outlined" sx={{ p: 3, mt: 3, bgcolor: 'background.default' }}>
          <Typography variant="h6" gutterBottom>
            新しい項目を追加
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="活動や仕事、趣味など"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                variant="outlined"
                margin="normal"
                placeholder="例: プログラミング、料理、教えること..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                カテゴリー（複数選択可）
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                <Chip
                  icon={<FavoriteIcon fontSize="small" />}
                  label="好きなこと"
                  color={selectedCategories.includes('love') ? 'error' : 'default'}
                  onClick={() => handleToggleCategory('love')}
                  variant={selectedCategories.includes('love') ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<EmojiEventsIcon fontSize="small" />}
                  label="得意なこと"
                  color={selectedCategories.includes('good') ? 'success' : 'default'}
                  onClick={() => handleToggleCategory('good')}
                  variant={selectedCategories.includes('good') ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<PublicIcon fontSize="small" />}
                  label="世界が求めること"
                  color={selectedCategories.includes('world') ? 'info' : 'default'}
                  onClick={() => handleToggleCategory('world')}
                  variant={selectedCategories.includes('world') ? 'filled' : 'outlined'}
                />
                <Chip
                  icon={<AttachMoneyIcon fontSize="small" />}
                  label="報酬が得られること"
                  color={selectedCategories.includes('paid') ? 'warning' : 'default'}
                  onClick={() => handleToggleCategory('paid')}
                  variant={selectedCategories.includes('paid') ? 'filled' : 'outlined'}
                />
              </Box>
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddItem}
                disabled={!newItemText || selectedCategories.length === 0}
                fullWidth
              >
                追加
              </Button>
            </Grid>
          </Grid>
        </Paper>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            IKIGAIマトリクス
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            項目をドラッグして、マトリクス上の適切な位置に配置してください。
          </Typography>
          
          <Box 
            ref={matrixRef}
            sx={{ 
              position: 'relative', 
              width: '100%', 
              height: 500, 
              mt: 4,
              userSelect: 'none',
              cursor: draggedItemId ? 'grabbing' : 'default'
            }}
            onMouseMove={handleMatrixMouseMove}
            onMouseUp={handleMatrixMouseUp}
            onMouseLeave={handleMatrixMouseUp}
          >
            {/* 背景の円 */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: '2px dashed #f50057',
                opacity: 0.3,
                zIndex: 1,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: '2px dashed #4caf50',
                opacity: 0.3,
                zIndex: 1,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: '2px dashed #2196f3',
                opacity: 0.3,
                zIndex: 1,
              }}
            />
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                height: '80%',
                borderRadius: '50%',
                border: '2px dashed #ff9800',
                opacity: 0.3,
                zIndex: 1,
              }}
            />
            
            {/* カテゴリーラベル */}
            <Typography
              sx={{
                position: 'absolute',
                top: '10%',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'error.main',
                fontWeight: 'bold',
              }}
            >
              好きなこと
            </Typography>
            <Typography
              sx={{
                position: 'absolute',
                top: '50%',
                left: '10%',
                transform: 'translateY(-50%)',
                color: 'success.main',
                fontWeight: 'bold',
              }}
            >
              得意なこと
            </Typography>
            <Typography
              sx={{
                position: 'absolute',
                top: '50%',
                right: '10%',
                transform: 'translateY(-50%)',
                color: 'info.main',
                fontWeight: 'bold',
              }}
            >
              世界が求めること
            </Typography>
            <Typography
              sx={{
                position: 'absolute',
                bottom: '10%',
                left: '50%',
                transform: 'translateX(-50%)',
                color: 'warning.main',
                fontWeight: 'bold',
              }}
            >
              報酬が得られること
            </Typography>
            
            {/* 中心のIKIGAIラベル */}
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 100,
                height: 100,
                borderRadius: '50%',
                bgcolor: 'background.paper',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 3,
                zIndex: 2,
              }}
            >
              <Typography variant="h6" align="center" color="primary">
                IKIGAI
              </Typography>
            </Box>
            
            {/* ドラッグ可能なアイテム */}
            {items.map((item) => (
              <Box
                key={item.id}
                sx={{
                  position: 'absolute',
                  left: `${item.position?.x || 50}%`,
                  top: `${item.position?.y || 50}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: item.isDragging ? 100 : 10,
                  cursor: 'grab',
                  transition: item.isDragging ? 'none' : 'all 0.2s ease',
                  opacity: item.isDragging ? 0.8 : 1,
                  boxShadow: item.isDragging ? '0 8px 16px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                }}
                onMouseDown={(e) => handleDragStart(e, item.id)}
              >
                <Card 
                  variant="outlined" 
                  sx={{ 
                    width: 'auto',
                    minWidth: 120,
                    maxWidth: 200,
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <DragIndicatorIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" noWrap>
                        {item.text}
                      </Typography>
                      <IconButton 
                        size="small" 
                        sx={{ ml: 'auto', p: 0.5 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item.id);
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {item.categories.map((category) => (
                        <Chip
                          key={category}
                          icon={getCategoryIcon(category)}
                          label={getCategoryLabel(category)}
                          color={getCategoryColor(category)}
                          size="small"
                          variant="outlined"
                          sx={{ height: 24, '& .MuiChip-label': { fontSize: '0.7rem', px: 0.5 } }}
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            ))}
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            追加した項目一覧
          </Typography>
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid item xs={12} sm={6} md={4} key={item.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="body1">
                        {item.text}
                      </Typography>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteItem(item.id)}
                        size="small"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                      {item.categories.map((category) => (
                        <Chip
                          key={category}
                          icon={getCategoryIcon(category)}
                          label={getCategoryLabel(category)}
                          color={getCategoryColor(category)}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
            {items.length === 0 && (
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary" align="center">
                  項目を追加して、あなたのIKIGAIを見つけましょう。
                </Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default IkigaiGame;