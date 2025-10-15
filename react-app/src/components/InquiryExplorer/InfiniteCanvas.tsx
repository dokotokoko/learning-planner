import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Box, Paper, Fade, IconButton, Stack, Slider, Typography, Button } from '@mui/material';
import { 
  ZoomIn as ZoomInIcon, 
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterIcon,
  Fullscreen as FullscreenIcon,
  Navigation as NavigationIcon,
  Layers as LayersIcon
} from '@mui/icons-material';
import * as d3 from 'd3';

interface InfiniteCanvasProps {
  children?: React.ReactNode;
  onTransformChange?: (transform: { x: number; y: number; scale: number }) => void;
  initialTransform?: { x: number; y: number; scale: number };
  minZoom?: number;
  maxZoom?: number;
  backgroundColor?: string;
  gridEnabled?: boolean;
}

const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  children,
  onTransformChange,
  initialTransform = { x: 0, y: 0, scale: 1 },
  minZoom = 0.1,
  maxZoom = 5,
  backgroundColor = '#f8f9fa',
  gridEnabled = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState(initialTransform);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showMinimap, setShowMinimap] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Pan handling with mouse
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only pan with middle mouse button or left button + space/alt
    if (e.button === 1 || (e.button === 0 && (e.altKey || e.metaKey))) {
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - transform.x,
        y: e.clientY - transform.y,
      });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const newTransform = {
      ...transform,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    };
    
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  }, [isDragging, dragStart, transform, onTransformChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Zoom handling
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!containerRef.current || !canvasRef.current) return;
    
    e.preventDefault();
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(minZoom, Math.min(maxZoom, transform.scale * delta));
    
    if (newScale === transform.scale) return;
    
    // Zoom towards mouse position
    const scaleRatio = newScale / transform.scale;
    const newTransform = {
      scale: newScale,
      x: x - (x - transform.x) * scaleRatio,
      y: y - (y - transform.y) * scaleRatio,
    };
    
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  }, [transform, minZoom, maxZoom, onTransformChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Zoom shortcuts
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          zoomIn();
        } else if (e.key === '-') {
          e.preventDefault();
          zoomOut();
        } else if (e.key === '0') {
          e.preventDefault();
          resetView();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [transform]);

  // Mouse event listeners
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // Control functions
  const zoomIn = () => {
    const newScale = Math.min(maxZoom, transform.scale * 1.2);
    const newTransform = { ...transform, scale: newScale };
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  };

  const zoomOut = () => {
    const newScale = Math.max(minZoom, transform.scale / 1.2);
    const newTransform = { ...transform, scale: newScale };
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  };

  const resetView = () => {
    const newTransform = { x: 0, y: 0, scale: 1 };
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  };

  const handleZoomSliderChange = (event: Event, value: number | number[]) => {
    const newScale = value as number;
    const newTransform = { ...transform, scale: newScale };
    setTransform(newTransform);
    onTransformChange?.(newTransform);
  };

  // Grid pattern
  const gridPattern = gridEnabled ? (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <defs>
        <pattern
          id="grid"
          width={40}
          height={40}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}
        >
          <circle cx="1" cy="1" r="0.5" fill="#00000015" />
        </pattern>
        <pattern
          id="grid-large"
          width={200}
          height={200}
          patternUnits="userSpaceOnUse"
          patternTransform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}
        >
          <rect width="200" height="200" fill="none" stroke="#00000010" strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
      <rect width="100%" height="100%" fill="url(#grid-large)" />
    </svg>
  ) : null;

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Grid Background */}
      {gridPattern}

      {/* Main Canvas */}
      <Box
        ref={canvasRef}
        sx={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          width: '8000px',
          height: '8000px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {children}
      </Box>

      {/* Navigation Controls */}
      {showControls && (
        <Fade in>
          <Paper
            sx={{
              position: 'absolute',
              bottom: 24,
              right: 24,
              p: 2,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
            }}
          >
            <Stack spacing={2}>
              {/* Zoom Controls */}
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton size="small" onClick={zoomOut}>
                  <ZoomOutIcon fontSize="small" />
                </IconButton>
                <Box sx={{ width: 100, mx: 1 }}>
                  <Slider
                    size="small"
                    value={transform.scale}
                    onChange={handleZoomSliderChange}
                    min={minZoom}
                    max={maxZoom}
                    step={0.1}
                    valueLabelDisplay="auto"
                    valueLabelFormat={(value) => `${Math.round(value * 100)}%`}
                  />
                </Box>
                <IconButton size="small" onClick={zoomIn}>
                  <ZoomInIcon fontSize="small" />
                </IconButton>
              </Stack>

              {/* Reset View */}
              <Button
                size="small"
                startIcon={<CenterIcon />}
                onClick={resetView}
                variant="outlined"
              >
                Reset View
              </Button>
            </Stack>
          </Paper>
        </Fade>
      )}

      {/* Minimap */}
      {showMinimap && (
        <Fade in>
          <Paper
            sx={{
              position: 'absolute',
              bottom: 24,
              left: 24,
              width: 200,
              height: 150,
              borderRadius: 2,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden',
            }}
          >
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: '100%',
                backgroundColor: '#f0f0f0',
              }}
            >
              {/* Minimap viewport indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  border: '2px solid #FF7A00',
                  backgroundColor: 'rgba(255, 122, 0, 0.1)',
                  transform: `translate(${100 + transform.x / 40}px, ${75 + transform.y / 40}px)`,
                  width: `${100 / transform.scale}px`,
                  height: `${75 / transform.scale}px`,
                  transition: 'all 0.1s ease-out',
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: 4,
                  right: 8,
                  color: 'text.secondary',
                }}
              >
                Minimap
              </Typography>
            </Box>
          </Paper>
        </Fade>
      )}

      {/* Toggle Controls */}
      <Stack
        direction="column"
        spacing={1}
        sx={{
          position: 'absolute',
          top: 24,
          right: 24,
        }}
      >
        <IconButton
          size="small"
          onClick={() => setShowControls(!showControls)}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
          }}
        >
          <NavigationIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setShowMinimap(!showMinimap)}
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
          }}
        >
          <LayersIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Instructions */}
      {transform.scale === 1 && transform.x === 0 && transform.y === 0 && (
        <Fade in>
          <Typography
            variant="caption"
            sx={{
              position: 'absolute',
              top: 24,
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
              px: 2,
              py: 1,
              borderRadius: 1,
            }}
          >
            マウスホイールでズーム・Alt/Cmdキー+ドラッグで移動
          </Typography>
        </Fade>
      )}
    </Box>
  );
};

export default InfiniteCanvas;