import React, { useState } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Grid, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';

interface TreeNode {
  id: string;
  content: string;
  children: TreeNode[];
}

const LogicTreeGame: React.FC = () => {
  const [mainProblem, setMainProblem] = useState('');
  const [treeData, setTreeData] = useState<TreeNode>({
    id: 'root',
    content: '',
    children: [],
  });
  const [isStarted, setIsStarted] = useState(false);

  const handleStart = () => {
    setTreeData({
      id: 'root',
      content: mainProblem,
      children: [],
    });
    setIsStarted(true);
  };

  const handleAddChild = (parentId: string) => {
    const newNode: TreeNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content: '',
      children: [],
    };

    const addChildToNode = (node: TreeNode): TreeNode => {
      if (node.id === parentId) {
        return {
          ...node,
          children: [...node.children, newNode],
        };
      }

      return {
        ...node,
        children: node.children.map(child => addChildToNode(child)),
      };
    };

    setTreeData(addChildToNode(treeData));
  };

  const handleUpdateNodeContent = (nodeId: string, content: string) => {
    const updateNodeInTree = (node: TreeNode): TreeNode => {
      if (node.id === nodeId) {
        return {
          ...node,
          content,
        };
      }

      return {
        ...node,
        children: node.children.map(child => updateNodeInTree(child)),
      };
    };

    setTreeData(updateNodeInTree(treeData));
  };

  const handleDeleteNode = (nodeId: string, parentId: string) => {
    const deleteNodeFromParent = (node: TreeNode): TreeNode => {
      if (node.id === parentId) {
        return {
          ...node,
          children: node.children.filter(child => child.id !== nodeId),
        };
      }

      return {
        ...node,
        children: node.children.map(child => deleteNodeFromParent(child)),
      };
    };

    setTreeData(deleteNodeFromParent(treeData));
  };

  // ツリーの深さを計算
  const getTreeDepth = (node: TreeNode): number => {
    if (node.children.length === 0) {
      return 0;
    }
    return 1 + Math.max(...node.children.map(child => getTreeDepth(child)));
  };

  // ノードの幅を計算（末端ノードの数）
  const getNodeWidth = (node: TreeNode): number => {
    if (node.children.length === 0) {
      return 1;
    }
    return node.children.reduce((sum, child) => sum + getNodeWidth(child), 0);
  };

  const renderNode = (node: TreeNode, parentId: string | null = null, level = 0, index = 0, totalSiblings = 1) => {
    const nodeWidth = getNodeWidth(node);
    const childrenTotalWidth = node.children.reduce((sum, child) => sum + getNodeWidth(child), 0);
    
    // 子ノードの最大数に基づいて幅を調整（コンパクトにするため）
    const widthFactor = level === 0 ? 100 : Math.min(100, 70 / Math.max(1, node.children.length));
    
    return (
      <Box
        key={node.id}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          width: level === 0 ? '100%' : `${widthFactor}%`,
          maxWidth: level === 0 ? '100%' : '300px',
        }}
      >
        {/* 親ノードとの接続線 */}
        {parentId && (
          <Box
            sx={{
              position: 'absolute',
              top: -20,
              left: '50%',
              height: 20,
              width: 2,
              bgcolor: 'grey.400',
              zIndex: 0,
            }}
          />
        )}
        
        {/* ノード本体 */}
        <Paper
          elevation={2}
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: level === 0 ? 'primary.light' : 'background.paper',
            width: level === 0 ? '50%' : '90%',
            maxWidth: 250,
            zIndex: 1,
            position: 'relative',
          }}
        >
          <Grid container spacing={1} alignItems="center">
            <Grid item xs>
              {level === 0 ? (
                <Typography variant="h6">{node.content}</Typography>
              ) : (
                <TextField
                  fullWidth
                  size="small"
                  value={node.content}
                  onChange={(e) => handleUpdateNodeContent(node.id, e.target.value)}
                  placeholder={`レベル ${level} の要素`}
                  variant="outlined"
                />
              )}
            </Grid>
            <Grid item>
              <IconButton 
                color="primary" 
                onClick={() => handleAddChild(node.id)}
                size="small"
              >
                <AddIcon />
              </IconButton>
              {parentId && (
                <IconButton 
                  color="error" 
                  onClick={() => handleDeleteNode(node.id, parentId)}
                  size="small"
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Grid>
          </Grid>
        </Paper>
        
        {/* 子ノードへの接続線（横線） */}
        {node.children.length > 0 && (
          <Box
            sx={{
              position: 'absolute',
              top: 'calc(50% + 20px)',
              left: '10%',
              width: '80%',
              height: 2,
              bgcolor: 'grey.400',
              zIndex: 0,
            }}
          />
        )}
        
        {/* 子ノード */}
        {node.children.length > 0 && (
          <Box
            sx={{
              display: 'flex',
              width: '100%',
              mt: 4,
              justifyContent: 'space-around',
              flexWrap: node.children.length > 3 ? 'wrap' : 'nowrap', // 子ノードが多い場合は折り返す
              gap: 2,
            }}
          >
            {node.children.map((child, childIndex) => (
              <Box
                key={child.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: node.children.length > 3 ? 'calc(33% - 16px)' : 'auto', // 3つ以上の場合は3列に
                  minWidth: '150px',
                  position: 'relative',
                  mb: node.children.length > 3 ? 4 : 0, // 折り返した場合は下にマージンを追加
                }}
              >
                {renderNode(child, node.id, level + 1, childIndex, node.children.length)}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    );
  };

  return (
    <Container maxWidth={false} sx={{ mt: 4, mb: 4, px: { xs: 2, md: 4 } }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          ロジックツリー／Issue Tree
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          問題を構造的に分解し、原因や解決策を整理するためのツールです。
        </Typography>

        {!isStarted ? (
          <Box sx={{ mt: 4 }}>
            <TextField
              fullWidth
              label="メインの問題や課題"
              value={mainProblem}
              onChange={(e) => setMainProblem(e.target.value)}
              variant="outlined"
              margin="normal"
              placeholder="例: なぜ売上が減少しているのか？"
            />
            <Button
              variant="contained"
              onClick={handleStart}
              sx={{ mt: 2 }}
              disabled={!mainProblem}
              fullWidth
            >
              ロジックツリーを作成する
            </Button>
          </Box>
        ) : (
          <Box sx={{ mt: 4 }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              「+」ボタンをクリックして要素を追加し、ツリーを構築していきましょう。
            </Typography>
            <Box sx={{ 
              overflowX: 'auto', 
              width: '100%', 
              height: 'calc(100vh - 300px)', // 画面高さに合わせて調整
              minHeight: 600,
              p: 2,
              border: '1px dashed #ccc',
              borderRadius: 2,
            }}>
              <Box sx={{ 
                minWidth: 800,
                width: '100%',
                height: '100%',
                display: 'flex',
                justifyContent: 'center',
                pt: 4,
              }}>
                {renderNode(treeData)}
              </Box>
            </Box>
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="outlined" onClick={() => setIsStarted(false)}>
                最初からやり直す
              </Button>
              <Button variant="contained">
                完了
              </Button>
            </Box>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default LogicTreeGame; 