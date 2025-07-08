import React, { useState, useRef } from 'react';
import { Container, Typography, TextField, Button, Box, Paper, Grid, Card, CardContent, IconButton, Divider, Chip, Tab, Tabs } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import LocalActivityIcon from '@mui/icons-material/LocalActivity';
import PeopleIcon from '@mui/icons-material/People';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

interface Position {
  x: number;
  y: number;
}

interface MindMapNode {
  id: string;
  text: string;
  children: string[]; // 子ノードのID
  energy?: 'high' | 'medium' | 'low';
  engagement?: 'high' | 'medium' | 'low';
  notes?: string;
  position: Position;
  isDragging?: boolean;
}

interface JournalEntry {
  id: string;
  activity: string;
  time: string;
  people: string;
  energy: 'high' | 'medium' | 'low';
  engagement: 'high' | 'medium' | 'low';
  insights: string;
}

const MindMapGame: React.FC = () => {
  const [centralTopic, setCentralTopic] = useState('');
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [mindMapNodes, setMindMapNodes] = useState<Record<string, MindMapNode>>({});
  const [rootNodeId, setRootNodeId] = useState<string | null>(null);
  const [newNodeText, setNewNodeText] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [newJournalEntry, setNewJournalEntry] = useState<JournalEntry>({
    id: '',
    activity: '',
    time: '',
    people: '',
    energy: 'medium',
    engagement: 'medium',
    insights: '',
  });
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleSetupComplete = () => {
    if (centralTopic) {
      const rootId = `node-${Date.now()}`;
      const rootNode: MindMapNode = {
        id: rootId,
        text: centralTopic,
        children: [],
        position: { x: 50, y: 50 }, // 中央に配置
      };
      
      setMindMapNodes({ [rootId]: rootNode });
      setRootNodeId(rootId);
      setIsSetupComplete(true);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleAddChildNode = (parentId: string) => {
    if (!newNodeText) return;
    
    const parentNode = mindMapNodes[parentId];
    if (!parentNode) return;
    
    // 親ノードの周りにランダムな位置を計算
    const angle = Math.random() * Math.PI * 2;
    const distance = 150; // 親ノードからの距離
    const offsetX = Math.cos(angle) * distance;
    const offsetY = Math.sin(angle) * distance;
    
    const newNodeId = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNode: MindMapNode = {
      id: newNodeId,
      text: newNodeText,
      children: [],
      position: {
        x: parentNode.position.x + offsetX,
        y: parentNode.position.y + offsetY,
      },
    };
    
    // 親ノードの子リストを更新
    const updatedParentNode = {
      ...parentNode,
      children: [...parentNode.children, newNodeId],
    };
    
    setMindMapNodes({
      ...mindMapNodes,
      [parentId]: updatedParentNode,
      [newNodeId]: newNode,
    });
    
    setNewNodeText('');
    setSelectedNodeId(newNodeId);
  };

  const handleUpdateNodeText = (nodeId: string, text: string) => {
    if (!mindMapNodes[nodeId]) return;
    
    setMindMapNodes({
      ...mindMapNodes,
      [nodeId]: {
        ...mindMapNodes[nodeId],
        text,
      },
    });
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === rootNodeId || !mindMapNodes[nodeId]) return;
    
    // このノードを子として持つ親ノードを探す
    let parentNodeId: string | null = null;
    
    Object.entries(mindMapNodes).forEach(([id, node]) => {
      if (node.children.includes(nodeId)) {
        parentNodeId = id;
      }
    });
    
    if (!parentNodeId) return;
    
    // 親ノードの子リストからこのノードを削除
    const parentNode = mindMapNodes[parentNodeId];
    const updatedParentNode = {
      ...parentNode,
      children: parentNode.children.filter(id => id !== nodeId),
    };
    
    // このノードとその子孫を再帰的に削除するための関数
    const getNodesToDelete = (nodeId: string, nodesToDelete: string[] = []): string[] => {
      const node = mindMapNodes[nodeId];
      if (!node) return nodesToDelete;
      
      nodesToDelete.push(nodeId);
      
      node.children.forEach(childId => {
        getNodesToDelete(childId, nodesToDelete);
      });
      
      return nodesToDelete;
    };
    
    const nodesToDelete = getNodesToDelete(nodeId);
    
    // 新しいノードマップを作成
    const newMindMapNodes = { ...mindMapNodes };
    
    // 親ノードを更新
    newMindMapNodes[parentNodeId] = updatedParentNode;
    
    // 削除対象のノードを削除
    nodesToDelete.forEach(id => {
      delete newMindMapNodes[id];
    });
    
    setMindMapNodes(newMindMapNodes);
    
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(null);
    }
  };

  const handleSelectNode = (nodeId: string) => {
    setSelectedNodeId(nodeId === selectedNodeId ? null : nodeId);
  };

  // ドラッグ開始
  const handleNodeDragStart = (e: React.MouseEvent<HTMLDivElement>, nodeId: string) => {
    if (!mapContainerRef.current) return;
    
    e.stopPropagation();
    
    const node = mindMapNodes[nodeId];
    if (!node) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;
    
    setDragOffset({ x: offsetX, y: offsetY });
    setDraggedNodeId(nodeId);
    
    setMindMapNodes({
      ...mindMapNodes,
      [nodeId]: {
        ...node,
        isDragging: true,
      },
    });
  };

  // ドラッグ中
  const handleNodeDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!draggedNodeId || !mapContainerRef.current) return;
    
    const node = mindMapNodes[draggedNodeId];
    if (!node) return;
    
    const containerRect = mapContainerRef.current.getBoundingClientRect();
    const x = e.clientX - containerRect.left - dragOffset.x;
    const y = e.clientY - containerRect.top - dragOffset.y;
    
    setMindMapNodes({
      ...mindMapNodes,
      [draggedNodeId]: {
        ...node,
        position: { x, y },
      },
    });
  };

  // ドラッグ終了
  const handleNodeDragEnd = () => {
    if (!draggedNodeId) return;
    
    const node = mindMapNodes[draggedNodeId];
    if (!node) return;
    
    setMindMapNodes({
      ...mindMapNodes,
      [draggedNodeId]: {
        ...node,
        isDragging: false,
      },
    });
    
    setDraggedNodeId(null);
  };

  // マインドマップ上のマウス移動
  const handleMapMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggedNodeId) {
      handleNodeDrag(e);
    }
  };

  // マインドマップ上のマウスアップ
  const handleMapMouseUp = () => {
    if (draggedNodeId) {
      handleNodeDragEnd();
    }
  };

  const handleAddJournalEntry = () => {
    if (newJournalEntry.activity && newJournalEntry.time) {
      const entry: JournalEntry = {
        ...newJournalEntry,
        id: Date.now().toString(),
      };
      setJournalEntries([...journalEntries, entry]);
      setNewJournalEntry({
        id: '',
        activity: '',
        time: '',
        people: '',
        energy: 'medium',
        engagement: 'medium',
        insights: '',
      });
    }
  };

  const handleDeleteJournalEntry = (id: string) => {
    setJournalEntries(journalEntries.filter(entry => entry.id !== id));
  };

  // 2つのノード間の接続線を描画
  const renderConnection = (fromNodeId: string, toNodeId: string) => {
    const fromNode = mindMapNodes[fromNodeId];
    const toNode = mindMapNodes[toNodeId];
    
    if (!fromNode || !toNode) return null;
    
    // 線の色と太さを設定
    const isSelected = selectedNodeId === fromNodeId || selectedNodeId === toNodeId;
    const lineColor = isSelected ? '#1976d2' : '#aaa';
    const lineWidth = isSelected ? 2 : 1;
    
    return (
      <svg
        key={`${fromNodeId}-${toNodeId}`}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      >
        <line
          x1={fromNode.position.x}
          y1={fromNode.position.y}
          x2={toNode.position.x}
          y2={toNode.position.y}
          stroke={lineColor}
          strokeWidth={lineWidth}
        />
      </svg>
    );
  };

  // ノードを描画
  const renderNode = (nodeId: string) => {
    const node = mindMapNodes[nodeId];
    if (!node) return null;
    
    const isRoot = nodeId === rootNodeId;
    const isSelected = nodeId === selectedNodeId;
    
    return (
      <Box
        key={nodeId}
        sx={{
          position: 'absolute',
          left: node.position.x,
          top: node.position.y,
          transform: 'translate(-50%, -50%)',
          zIndex: node.isDragging ? 100 : 10,
          cursor: 'move',
          transition: node.isDragging ? 'none' : 'all 0.2s ease',
        }}
        onMouseDown={(e) => handleNodeDragStart(e, nodeId)}
        onClick={(e) => {
          e.stopPropagation();
          handleSelectNode(nodeId);
        }}
      >
        <Paper
          elevation={isSelected ? 8 : 2}
          sx={{
            p: 2,
            borderRadius: isRoot ? '50%' : 2,
            width: isRoot ? 120 : 'auto',
            height: isRoot ? 120 : 'auto',
            minWidth: isRoot ? 120 : 150,
            bgcolor: isRoot ? 'primary.main' : 'background.paper',
            border: isSelected ? '2px solid #1976d2' : 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {isRoot ? (
            <Typography
              variant="h6"
              align="center"
              sx={{ color: 'white', wordBreak: 'break-word' }}
            >
              {node.text}
            </Typography>
          ) : (
            <>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                <DragIndicatorIcon fontSize="small" sx={{ color: 'text.secondary', mr: 1 }} />
                <TextField
                  fullWidth
                  size="small"
                  value={node.text}
                  onChange={(e) => handleUpdateNodeText(nodeId, e.target.value)}
                  variant="standard"
                  InputProps={{
                    disableUnderline: !isSelected,
                  }}
                  sx={{ 
                    '& .MuiInputBase-input': {
                      fontWeight: isSelected ? 'bold' : 'normal',
                    }
                  }}
                />
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteNode(nodeId);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
              
              {node.energy && (
                <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                  <Chip 
                    size="small" 
                    label={`エネルギー: ${
                      node.energy === 'high' ? '高' : 
                      node.energy === 'medium' ? '中' : '低'
                    }`}
                    color={
                      node.energy === 'high' ? 'success' : 
                      node.energy === 'medium' ? 'primary' : 'error'
                    }
                    variant="outlined"
                  />
                  <Chip 
                    size="small" 
                    label={`没頭度: ${
                      node.engagement === 'high' ? '高' : 
                      node.engagement === 'medium' ? '中' : '低'
                    }`}
                    color={
                      node.engagement === 'high' ? 'success' : 
                      node.engagement === 'medium' ? 'primary' : 'error'
                    }
                    variant="outlined"
                  />
                </Box>
              )}
              
              {node.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  メモ: {node.notes}
                </Typography>
              )}
            </>
          )}
        </Paper>
        
        {isSelected && (
          <Paper
            elevation={2}
            sx={{
              p: 1,
              mt: 1,
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <TextField
              fullWidth
              size="small"
              label="新しい子ノード"
              value={newNodeText}
              onChange={(e) => setNewNodeText(e.target.value)}
              variant="outlined"
              placeholder="新しいアイデアを入力..."
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => handleAddChildNode(nodeId)}
              disabled={!newNodeText}
              sx={{ mt: 1 }}
            >
              子ノードを追加
            </Button>
          </Paper>
        )}
      </Box>
    );
  };

  // すべての接続線を描画
  const renderAllConnections = () => {
    const connections: JSX.Element[] = [];
    
    Object.values(mindMapNodes).forEach(node => {
      node.children.forEach(childId => {
        const connection = renderConnection(node.id, childId);
        if (connection) {
          connections.push(connection);
        }
      });
    });
    
    return connections;
  };

  const getEnergyColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'success';
      case 'medium':
        return 'primary';
      case 'low':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          マインドマップ × Good Time Journal
        </Typography>
        <Typography variant="body1" color="text.secondary" align="center" paragraph>
          思考を視覚化し、良い時間の記録を組み合わせた手法です。
        </Typography>

        {!isSetupComplete ? (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              中心となるテーマを設定
            </Typography>
            <TextField
              fullWidth
              label="中心テーマ"
              value={centralTopic}
              onChange={(e) => setCentralTopic(e.target.value)}
              variant="outlined"
              margin="normal"
              placeholder="例: 私の興味・関心"
            />
            <Button
              variant="contained"
              onClick={handleSetupComplete}
              sx={{ mt: 2 }}
              disabled={!centralTopic}
              fullWidth
            >
              テーマを設定してスタート
            </Button>
          </Box>
        ) : (
          <Box sx={{ mt: 4 }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={activeTab} onChange={handleTabChange} aria-label="framework tabs">
                <Tab label="マインドマップ" />
                <Tab label="Good Time Journal" />
              </Tabs>
            </Box>
            
            {activeTab === 0 && (
              <>
                <Typography variant="body2" color="text.secondary" paragraph>
                  ノードをドラッグして自由に配置できます。ノードをクリックすると子ノードを追加できます。
                </Typography>
                
                <Box
                  ref={mapContainerRef}
                  sx={{
                    position: 'relative',
                    width: '100%',
                    height: 600,
                    border: '1px dashed #ccc',
                    borderRadius: 2,
                    overflow: 'hidden',
                    userSelect: 'none',
                    cursor: draggedNodeId ? 'grabbing' : 'default',
                  }}
                  onMouseMove={handleMapMouseMove}
                  onMouseUp={handleMapMouseUp}
                  onMouseLeave={handleMapMouseUp}
                  onClick={() => setSelectedNodeId(null)}
                >
                  {/* 接続線を描画 */}
                  {renderAllConnections()}
                  
                  {/* ノードを描画 */}
                  {Object.keys(mindMapNodes).map(nodeId => renderNode(nodeId))}
                </Box>
              </>
            )}
            
            {activeTab === 1 && (
              <>
                <Typography variant="h6" gutterBottom>
                  Good Time Journal
                </Typography>
                
                <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle1" gutterBottom>
                    新しいエントリーを追加
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="活動内容"
                        value={newJournalEntry.activity}
                        onChange={(e) => setNewJournalEntry({...newJournalEntry, activity: e.target.value})}
                        variant="outlined"
                        margin="normal"
                        placeholder="何をしていましたか？"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="時間・場所"
                        value={newJournalEntry.time}
                        onChange={(e) => setNewJournalEntry({...newJournalEntry, time: e.target.value})}
                        variant="outlined"
                        margin="normal"
                        placeholder="いつ、どこで？"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="一緒にいた人"
                        value={newJournalEntry.people}
                        onChange={(e) => setNewJournalEntry({...newJournalEntry, people: e.target.value})}
                        variant="outlined"
                        margin="normal"
                        placeholder="誰と一緒でしたか？"
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          エネルギーレベル
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip 
                            label="高" 
                            color={newJournalEntry.energy === 'high' ? 'success' : 'default'} 
                            onClick={() => setNewJournalEntry({...newJournalEntry, energy: 'high'})}
                            variant={newJournalEntry.energy === 'high' ? 'filled' : 'outlined'}
                          />
                          <Chip 
                            label="中" 
                            color={newJournalEntry.energy === 'medium' ? 'primary' : 'default'} 
                            onClick={() => setNewJournalEntry({...newJournalEntry, energy: 'medium'})}
                            variant={newJournalEntry.energy === 'medium' ? 'filled' : 'outlined'}
                          />
                          <Chip 
                            label="低" 
                            color={newJournalEntry.energy === 'low' ? 'error' : 'default'} 
                            onClick={() => setNewJournalEntry({...newJournalEntry, energy: 'low'})}
                            variant={newJournalEntry.energy === 'low' ? 'filled' : 'outlined'}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Box sx={{ mt: 2 }}>
                        <Typography variant="body2" gutterBottom>
                          没頭度
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Chip 
                            label="高" 
                            color={newJournalEntry.engagement === 'high' ? 'success' : 'default'} 
                            onClick={() => setNewJournalEntry({...newJournalEntry, engagement: 'high'})}
                            variant={newJournalEntry.engagement === 'high' ? 'filled' : 'outlined'}
                          />
                          <Chip 
                            label="中" 
                            color={newJournalEntry.engagement === 'medium' ? 'primary' : 'default'} 
                            onClick={() => setNewJournalEntry({...newJournalEntry, engagement: 'medium'})}
                            variant={newJournalEntry.engagement === 'medium' ? 'filled' : 'outlined'}
                          />
                          <Chip 
                            label="低" 
                            color={newJournalEntry.engagement === 'low' ? 'error' : 'default'} 
                            onClick={() => setNewJournalEntry({...newJournalEntry, engagement: 'low'})}
                            variant={newJournalEntry.engagement === 'low' ? 'filled' : 'outlined'}
                          />
                        </Box>
                      </Box>
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="気づき・洞察"
                        value={newJournalEntry.insights}
                        onChange={(e) => setNewJournalEntry({...newJournalEntry, insights: e.target.value})}
                        variant="outlined"
                        margin="normal"
                        placeholder="この活動から何を学びましたか？"
                        multiline
                        rows={2}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddJournalEntry}
                        disabled={!newJournalEntry.activity || !newJournalEntry.time}
                        fullWidth
                      >
                        エントリーを追加
                      </Button>
                    </Grid>
                  </Grid>
                </Paper>

                <Grid container spacing={3}>
                  {journalEntries.map((entry) => (
                    <Grid item xs={12} key={entry.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Typography variant="h6" gutterBottom>
                              {entry.activity}
                            </Typography>
                            <IconButton 
                              color="error" 
                              onClick={() => handleDeleteJournalEntry(entry.id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Box>
                          
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccessTimeIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                <Typography variant="body2">{entry.time}</Typography>
                              </Box>
                            </Grid>
                            {entry.people && (
                              <Grid item xs={12} md={4}>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                  <PeopleIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                                  <Typography variant="body2">{entry.people}</Typography>
                                </Box>
                              </Grid>
                            )}
                          </Grid>
                          
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Chip 
                              icon={<EmojiEmotionsIcon fontSize="small" />}
                              label={`エネルギー: ${
                                entry.energy === 'high' ? '高' : 
                                entry.energy === 'medium' ? '中' : '低'
                              }`}
                              color={getEnergyColor(entry.energy)}
                              size="small"
                            />
                            <Chip 
                              icon={<LocalActivityIcon fontSize="small" />}
                              label={`没頭度: ${
                                entry.engagement === 'high' ? '高' : 
                                entry.engagement === 'medium' ? '中' : '低'
                              }`}
                              color={getEnergyColor(entry.engagement)}
                              size="small"
                            />
                          </Box>
                          
                          {entry.insights && (
                            <>
                              <Divider sx={{ my: 2 }} />
                              <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                <LightbulbIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary', mt: 0.5 }} />
                                <Typography variant="body2">
                                  <strong>気づき:</strong> {entry.insights}
                                </Typography>
                              </Box>
                            </>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                  
                  {journalEntries.length === 0 && (
                    <Grid item xs={12}>
                      <Typography variant="body2" color="text.secondary" align="center">
                        エントリーを追加して、良い時間の記録を始めましょう。
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </>
            )}
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default MindMapGame; 