import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { BubbleNode, Cluster } from './types';

interface WhiteboardBubblesProps {
  nodes: BubbleNode[];
  clusters: Cluster[];
  onSelectNode: (nodeId: string) => void;
  onDeleteNode: (nodeId: string) => void;
  onUpdateNodePosition: (nodeId: string, x: number, y: number) => void;
  selectedNodeId?: string;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

const WhiteboardBubbles: React.FC<WhiteboardBubblesProps> = ({
  nodes,
  clusters,
  onSelectNode,
  onDeleteNode,
  onUpdateNodePosition,
  selectedNodeId,
  centerX,
  centerY,
  width,
  height,
}) => {
  const gRef = useRef<SVGGElement>(null);
  const simulationRef = useRef<d3.Simulation<BubbleNode, undefined>>();

  const calculateRadius = (text: string, isCenter: boolean = false) => {
    const baseRadius = isCenter ? 35 : 25;
    const textLength = text.length;
    const minRadius = isCenter ? 30 : 20;
    const maxRadius = isCenter ? 60 : 45;
    const calculatedRadius = baseRadius + (textLength * 1.5);
    return Math.max(minRadius, Math.min(maxRadius, calculatedRadius));
  };

  const clusterColors = [
    '#FF0080', '#00FF80', '#8000FF', '#FF8000', '#0080FF',
    '#FF4000', '#40FF00', '#FF0040', '#00FF40', '#4000FF',
  ];

  useEffect(() => {
    if (!gRef.current || nodes.length === 0) return;

    const g = d3.select(gRef.current);
    
    // Clear previous elements
    g.selectAll('*').remove();

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(centerX, centerY))
      .force('collision', d3.forceCollide().radius((d) => calculateRadius(d.text, d.isCenter) + 5))
      .force('boundary', boundaryForce());

    simulationRef.current = simulation;

    // Draw cluster backgrounds
    const clusterGroup = g.append('g').attr('class', 'clusters');
    
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
      .attr('r', (d) => calculateRadius(d.text, d.isCenter))
      .attr('fill', (d) => {
        if (d.isCenter) return '#FF0080';
        if (d.id === selectedNodeId) return '#00FF80';
        const cluster = clusters.find(c => c.nodeIds.includes(d.id));
        if (cluster) {
          const index = clusters.indexOf(cluster);
          return clusterColors[index % clusterColors.length];
        }
        return '#8000FF';
      })
      .attr('stroke', (d) => {
        if (d.id === selectedNodeId) return '#000000';
        return '#FFFFFF';
      })
      .attr('stroke-width', (d) => {
        if (d.id === selectedNodeId) return 3;
        return 2;
      })
      .attr('filter', 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.2))')
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelectNode(d.id);
      });

    // Add text labels
    nodeElements.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('pointer-events', 'none')
      .attr('fill', (d) => {
        if (d.isCenter) return '#FFFFFF';
        if (d.id === selectedNodeId) return '#000000';
        const cluster = clusters.find(c => c.nodeIds.includes(d.id));
        if (cluster) {
          return '#FFFFFF';
        }
        return '#FFFFFF';
      })
      .attr('font-weight', (d) => d.isCenter ? 'bold' : 'normal')
      .attr('font-size', (d) => {
        const radius = calculateRadius(d.text, d.isCenter);
        return Math.max(10, Math.min(14, radius / 3)) + 'px';
      })
      .text((d) => {
        const radius = calculateRadius(d.text, d.isCenter);
        const maxChars = Math.floor(radius / 4);
        return d.text.length > maxChars ? d.text.substring(0, maxChars) + '...' : d.text;
      })
      .append('title')
      .text((d) => d.text);

    // Add delete buttons
    const deleteGroup = nodeElements.append('g')
      .attr('class', 'delete-btn')
      .attr('opacity', 0)
      .attr('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        onDeleteNode(d.id);
      });

    deleteGroup.append('circle')
      .attr('r', 8)
      .attr('cx', (d) => calculateRadius(d.text, d.isCenter) * 0.7)
      .attr('cy', (d) => -calculateRadius(d.text, d.isCenter) * 0.7)
      .attr('fill', '#FF0040')
      .attr('stroke', '#FFFFFF')
      .attr('stroke-width', 1);

    deleteGroup.append('text')
      .attr('x', (d) => calculateRadius(d.text, d.isCenter) * 0.7)
      .attr('y', (d) => -calculateRadius(d.text, d.isCenter) * 0.7 + 4)
      .attr('text-anchor', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '10px')
      .attr('pointer-events', 'none')
      .text('×');

    // Show delete button on hover
    nodeElements.on('mouseenter', function() {
      d3.select(this).select('.delete-btn').transition().duration(200).attr('opacity', 1);
    }).on('mouseleave', function() {
      d3.select(this).select('.delete-btn').transition().duration(200).attr('opacity', 0);
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

    // Update node positions in parent
    simulation.on('end', () => {
      nodes.forEach(node => {
        onUpdateNodePosition(node.id, node.x, node.y);
      });
    });

    // Cleanup
    return () => {
      simulation.stop();
    };
  }, [nodes, clusters, selectedNodeId, centerX, centerY]);

  // Boundary force to keep nodes within the area
  function boundaryForce() {
    let strength = 0.1;
    
    function force(alpha: number) {
      nodes.forEach(node => {
        const padding = 50;
        const minX = centerX - width / 2 + padding;
        const maxX = centerX + width / 2 - padding;
        const minY = centerY - height / 2 + padding;
        const maxY = centerY + height / 2 - padding;
        
        if (node.x < minX) node.vx = (node.vx || 0) + (minX - node.x) * strength;
        if (node.x > maxX) node.vx = (node.vx || 0) + (maxX - node.x) * strength;
        if (node.y < minY) node.vy = (node.vy || 0) + (minY - node.y) * strength;
        if (node.y > maxY) node.vy = (node.vy || 0) + (maxY - node.y) * strength;
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
      onUpdateNodePosition(d.id, d.x, d.y);
    }
    
    return d3.drag<SVGGElement, BubbleNode>()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }

  return <g ref={gRef} />;
};

export default WhiteboardBubbles;