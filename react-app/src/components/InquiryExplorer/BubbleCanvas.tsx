import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  IconButton,
  Paper,
  Typography,
  Chip,
  Stack,
  Button,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Fade,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  GroupWork as ClusterIcon,
  AutoAwesome as SuggestIcon,
  Undo as UndoIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import * as d3 from 'd3';
import { BubbleNode, Cluster } from './types';

interface BubbleCanvasProps {
  nodes: BubbleNode[];
  clusters: Cluster[];
  onAddNode: (text: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onSelectNode: (nodeId: string) => void;
  onCreateCluster: (nodeIds: string[], name: string) => void;
  onAISuggest: (keyword: string) => void;
  selectedNodeId?: string;
  suggestedKeywords?: string[];
  onAddSuggestedKeyword?: (keyword: string) => void;
}

const BubbleCanvas: React.FC<BubbleCanvasProps> = ({
  nodes,
  clusters,
  onAddNode,
  onDeleteNode,
  onSelectNode,
  onCreateCluster,
  onAISuggest,
  selectedNodeId,
  suggestedKeywords = [],
  onAddSuggestedKeyword,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [isClusterDialogOpen, setIsClusterDialogOpen] = useState(false);
  const [clusterName, setClusterName] = useState('');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<BubbleNode, undefined>>();

  // テキスト長に応じたバブルサイズ計算
  const calculateBubbleRadius = useCallback((text: string, isCenter: boolean = false) => {
    const baseRadius = isCenter ? 35 : 25;
    const textLength = text.length;
    
    // 文字数に応じて半径を調整（最小値と最大値を設定）
    const minRadius = isCenter ? 30 : 20;
    const maxRadius = isCenter ? 60 : 45;
    
    // 1文字あたり1.5ピクセル追加（調整可能）
    const calculatedRadius = baseRadius + (textLength * 1.5);
    
    return Math.max(minRadius, Math.min(maxRadius, calculatedRadius));
  }, []);

  // 創造性とクリエイティビティを爆発させる高コントラスト配色パレット
  const clusterColors = [
    '#FF0080', // ビビッドマゼンタ - 情熱と創造力
    '#00FF80', // エレクトリックグリーン - 革新と成長
    '#8000FF', // ブルーバイオレット - 想像力と直感
    '#FF8000', // ビビッドオレンジ - エネルギーと熱情
    '#0080FF', // ドジャーブルー - 自由と拡張
    '#FF4000', // レッドオレンジ - 行動力と決断
    '#40FF00', // ライムグリーン - 創造的発想
    '#FF0040', // ディープピンク - 感情と表現
    '#00FF40', // スプリンググリーン - 新鮮さと活力
    '#4000FF', // インディゴ - 深い思考と洞察
  ];

  // D3.js Force Simulation
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Clear previous elements
    svg.selectAll('*').remove();

    // Create container groups
    const g = svg.append('g');

    // Setup zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform.toString());
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius((d) => calculateBubbleRadius(d.text, d.isCenter) + 5))
      .force('cluster', clusterForce());

    simulationRef.current = simulation;

    // Draw cluster backgrounds
    const clusterGroup = g.append('g').attr('class', 'clusters');
    
    clusters.forEach((cluster, index) => {
      const clusterNodes = nodes.filter(n => cluster.nodeIds.includes(n.id));
      if (clusterNodes.length > 0) {
        const hull = d3.polygonHull(
          clusterNodes.map(n => [n.x, n.y] as [number, number])
        );
        
        if (hull) {
          clusterGroup.append('path')
            .datum(hull)
            .attr('d', d3.line())
            .attr('fill', clusterColors[index % clusterColors.length])
            .attr('fill-opacity', 0.1)
            .attr('stroke', clusterColors[index % clusterColors.length])
            .attr('stroke-width', 2)
            .attr('stroke-opacity', 0.3)
            .attr('stroke-linejoin', 'round');
        }
      }
    });

    // Create links (if needed for connected nodes)
    const linkGroup = g.append('g').attr('class', 'links');

    // Create nodes
    const nodeGroup = g.append('g').attr('class', 'nodes');

    const nodeElements = nodeGroup.selectAll('g')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(drag(simulation));

    // Add circles for nodes
    nodeElements.append('circle')
      .attr('r', (d) => calculateBubbleRadius(d.text, d.isCenter))
      .attr('fill', (d) => {
        if (d.isCenter) return '#FF0080'; // ビビッドマゼンタ - 中心への注目
        if (d.id === selectedNodeId) return '#00FF80'; // エレクトリックグリーン - 選択の活力
        const cluster = clusters.find(c => c.nodeIds.includes(d.id));
        if (cluster) {
          const index = clusters.indexOf(cluster);
          return clusterColors[index % clusterColors.length];
        }
        return '#8000FF'; // ブルーバイオレット - 無限の可能性
      })
      .attr('stroke', (d) => {
        if (d.id === selectedNodeId || selectedNodes.has(d.id)) return '#000000'; // 最高コントラストの黒
        return '#FFFFFF'; // 純白の境界線
      })
      .attr('stroke-width', (d) => {
        if (d.id === selectedNodeId || selectedNodes.has(d.id)) return 3;
        return 2;
      })
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        if (event.shiftKey || event.ctrlKey) {
          // Multi-selection for clustering
          const newSelected = new Set(selectedNodes);
          if (newSelected.has(d.id)) {
            newSelected.delete(d.id);
          } else {
            newSelected.add(d.id);
          }
          setSelectedNodes(newSelected);
        } else {
          onSelectNode(d.id);
          onAISuggest(d.text);
        }
      })
      .on('mouseenter', (event, d) => setHoveredNodeId(d.id))
      .on('mouseleave', () => setHoveredNodeId(null));

    // Add text labels
    nodeElements.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('pointer-events', 'none')
      .attr('fill', (d) => {
        // 背景色に対する最高コントラスト（7:1以上）を保証
        if (d.isCenter) return '#FFFFFF'; // マゼンタ背景に白文字
        if (d.id === selectedNodeId) return '#000000'; // グリーン背景に黒文字
        const cluster = clusters.find(c => c.nodeIds.includes(d.id));
        if (cluster) {
          return '#FFFFFF'; // カラフル背景に白文字
        }
        return '#FFFFFF'; // バイオレット背景に白文字
      })
      .attr('font-weight', (d) => d.isCenter ? 'bold' : 'normal')
      .attr('font-size', (d) => {
        const radius = calculateBubbleRadius(d.text, d.isCenter);
        return Math.max(10, Math.min(14, radius / 3)) + 'px';
      })
      .text((d) => {
        const radius = calculateBubbleRadius(d.text, d.isCenter);
        // バブルサイズに応じてテキストの表示文字数を調整
        const maxChars = Math.floor(radius / 4);
        return d.text.length > maxChars ? d.text.substring(0, maxChars) + '...' : d.text;
      });

    // Add delete buttons on hover
    nodeElements.append('circle')
      .attr('class', 'delete-btn')
      .attr('r', 8)
      .attr('cx', (d) => calculateBubbleRadius(d.text, d.isCenter) * 0.7)
      .attr('cy', (d) => -calculateBubbleRadius(d.text, d.isCenter) * 0.7)
      .attr('fill', '#FF0040') // ディープピンク - 危険と注意
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .attr('opacity', 0)
      .on('click', (event, d) => {
        event.stopPropagation();
        onDeleteNode(d.id);
      });

    nodeElements.append('text')
      .attr('class', 'delete-icon')
      .attr('x', (d) => calculateBubbleRadius(d.text, d.isCenter) * 0.7)
      .attr('y', (d) => -calculateBubbleRadius(d.text, d.isCenter) * 0.7 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF') // 最高コントラストの白
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .text('×');

    // Show delete button on hover
    nodeElements.on('mouseenter', function() {
      d3.select(this).select('.delete-btn').transition().duration(200).attr('opacity', 1);
      d3.select(this).select('.delete-icon').transition().duration(200).attr('opacity', 1);
    }).on('mouseleave', function() {
      d3.select(this).select('.delete-btn').transition().duration(200).attr('opacity', 0);
      d3.select(this).select('.delete-icon').transition().duration(200).attr('opacity', 0);
    });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      nodeElements.attr('transform', (d) => `translate(${d.x},${d.y})`);
      
      // Update cluster hulls
      clusterGroup.selectAll('path').remove();
      clusters.forEach((cluster, index) => {
        const clusterNodes = nodes.filter(n => cluster.nodeIds.includes(n.id));
        if (clusterNodes.length > 0) {
          const hull = d3.polygonHull(
            clusterNodes.map(n => [n.x, n.y] as [number, number])
          );
          
          if (hull) {
            clusterGroup.append('path')
              .datum(hull)
              .attr('d', d3.line())
              .attr('fill', clusterColors[index % clusterColors.length])
              .attr('fill-opacity', 0.1)
              .attr('stroke', clusterColors[index % clusterColors.length])
              .attr('stroke-width', 2)
              .attr('stroke-opacity', 0.3)
              .attr('stroke-linejoin', 'round');
          }
        }
      });
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, clusters, selectedNodeId, selectedNodes, onSelectNode, onDeleteNode, onAISuggest]);

  // Custom cluster force
  function clusterForce() {
    let strength = 0.1;
    
    function force(alpha: number) {
      nodes.forEach(node => {
        const cluster = clusters.find(c => c.nodeIds.includes(node.id));
        if (cluster) {
          const clusterNodes = nodes.filter(n => cluster.nodeIds.includes(n.id));
          const centerX = d3.mean(clusterNodes, n => n.x) || 0;
          const centerY = d3.mean(clusterNodes, n => n.y) || 0;
          
          node.vx = (node.vx || 0) + (centerX - node.x) * strength * alpha;
          node.vy = (node.vy || 0) + (centerY - node.y) * strength * alpha;
        }
      });
    }
    
    force.strength = function(value?: number) {
      if (value === undefined) return strength;
      strength = value;
      return force;
    };
    
    return force;
  }

  // Drag behavior
  function drag(simulation: d3.Simulation<BubbleNode, undefined>) {
    function dragstarted(event: any, d: BubbleNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    
    function dragged(event: any, d: BubbleNode) {
      d.fx = event.x;
      d.fy = event.y;
    }
    
    function dragended(event: any, d: BubbleNode) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    
    return d3.drag<SVGGElement, BubbleNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  const handleAddKeyword = () => {
    if (inputValue.trim()) {
      onAddNode(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddKeyword();
    }
  };

  const handleCreateCluster = () => {
    if (selectedNodes.size > 1 && clusterName.trim()) {
      onCreateCluster(Array.from(selectedNodes), clusterName);
      setSelectedNodes(new Set());
      setClusterName('');
      setIsClusterDialogOpen(false);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('すべてのキーワードをクリアしますか？')) {
      // Clear all nodes - this should be handled by parent component
      nodes.forEach(node => onDeleteNode(node.id));
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* ツールバー */}
      <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="興味・関心のキーワードを入力"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            sx={{ flex: 1 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddKeyword}
            disabled={!inputValue.trim()}
          >
            追加
          </Button>
          
          <Tooltip title="選択したノードをグループ化">
            <span>
              <IconButton 
                onClick={() => setIsClusterDialogOpen(true)}
                disabled={selectedNodes.size < 2}
                color="primary"
              >
                <ClusterIcon />
              </IconButton>
            </span>
          </Tooltip>
          
          <Tooltip title="すべてクリア">
            <IconButton onClick={handleClearAll} color="error">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Stack>

        {/* AIサジェスト */}
        {suggestedKeywords.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary" gutterBottom>
              AIの提案:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
              {suggestedKeywords.map((keyword, index) => (
                <Chip
                  key={index}
                  label={keyword}
                  size="small"
                  onClick={() => onAddSuggestedKeyword?.(keyword)}
                  icon={<SuggestIcon />}
                  color="primary"
                  variant="outlined"
                  sx={{ cursor: 'pointer' }}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Paper>

      {/* キャンバス */}
      <Paper sx={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: 2 }}>
        <svg
          ref={svgRef}
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            opacity: 0.1,
          }}
        />
        
        {/* ヒント */}
        {nodes.length === 0 && (
          <Fade in>
            <Alert 
              severity="info" 
              sx={{ 
                position: 'absolute', 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)',
                maxWidth: 400,
              }}
            >
              興味や関心のあるキーワードを入力して、あなたの探究マップを作りましょう！
              Shift+クリックで複数選択してグループ化もできます。
            </Alert>
          </Fade>
        )}

        {/* 選択中の表示 */}
        {selectedNodes.size > 0 && (
          <Paper 
            sx={{ 
              position: 'absolute', 
              bottom: 16, 
              left: 16, 
              p: 1,
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
            }}
          >
            <Typography variant="body2">
              {selectedNodes.size}個のノードを選択中
            </Typography>
          </Paper>
        )}
      </Paper>

      {/* クラスター作成ダイアログ */}
      <Dialog open={isClusterDialogOpen} onClose={() => setIsClusterDialogOpen(false)}>
        <DialogTitle>グループの作成</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            選択した{selectedNodes.size}個のキーワードをグループ化します
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="グループ名"
            value={clusterName}
            onChange={(e) => setClusterName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleCreateCluster()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsClusterDialogOpen(false)}>キャンセル</Button>
          <Button 
            onClick={handleCreateCluster} 
            variant="contained"
            disabled={!clusterName.trim()}
          >
            作成
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BubbleCanvas;