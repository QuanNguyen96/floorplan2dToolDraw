// === src/components/CanvasGridKonva.jsx ===
import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Line, Circle, Rect, Text, Group } from 'react-konva';
import { useEditor } from '../context/EditorContext';

const MAJOR_GRID_SIZE = 160;
const MINOR_DIVISIONS = 10;
const MINOR_GRID_SIZE = MAJOR_GRID_SIZE / MINOR_DIVISIONS;
const TOTAL_MAJOR_CELLS = 24;
const INITIAL_SCALE = 1;
const WALL_WIDTH = 10;
const SNAP_DISTANCE = 10;
const CLICK_THRESHOLD = 300;

const CanvasGridKonva = () => {
  const stageRef = useRef();
  const { mode, setMode, setSelectedWall, selectedWall, vertices, setVertices, walls, setWalls } = useEditor();

  const [tempStartPoint, setTempStartPoint] = useState(null);
  const [hoverPoint, setHoverPoint] = useState(null);
  const [hoverVertex, setHoverVertex] = useState(null);
  const [mouseDownVertex, setMouseDownVertex] = useState(null);
  const [dragPreviewVertex, setDragPreviewVertex] = useState(null);
  const [draggedWallPreview, setDraggedWallPreview] = useState(null);
  const [snapTarget, setSnapTarget] = useState(null);
  const [lastCreatedVertexId, setLastCreatedVertexId] = useState(null);
  const [rawMousePoint, setRawMousePoint] = useState(null);
  const [mouseDownTime, setMouseDownTime] = useState(null);
  const [hoverWallId, setHoverWallId] = useState(null);
  const [scale] = useState(INITIAL_SCALE);
  const [offset] = useState({ x: 0, y: 0 });

  const getVertexById = id => vertices.find(v => v.id === id);
  const getEffectiveVertex = id =>
    dragPreviewVertex && mouseDownVertex && id === mouseDownVertex.id
      ? dragPreviewVertex
      : getVertexById(id);

  const toWorldCoords = (x, y) => {
    const transform = stageRef.current.getAbsoluteTransform().copy().invert();
    return transform.point({ x, y });
  };

  const findSnapTarget = point => {
    // Ưu tiên snap vào vertex nếu gần
    for (const v of vertices) {
      if (mode === 'wall' && Math.hypot(v.x - point.x, v.y - point.y) <= SNAP_DISTANCE) {
        return { type: 'vertex', point: v };
      }
    }

    let closest = null;
    let minDist = Infinity; // Để so sánh chính xác theo từng wall
    for (const wall of walls) {
      const v1 = getVertexById(wall.startId);
      const v2 = getVertexById(wall.endId);
      if (!v1 || !v2) continue;

      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const len2 = dx * dx + dy * dy;
      const t = Math.max(0, Math.min(1, ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / len2));
      const proj = { x: v1.x + t * dx, y: v1.y + t * dy };
      const dist = Math.hypot(point.x - proj.x, point.y - proj.y);

      const thickness = wall.thickness ?? WALL_WIDTH;
      const snapRange = thickness / 2 + SNAP_DISTANCE;

      if (dist <= snapRange && dist < minDist) {
        minDist = dist;
        closest = { type: 'wall', wall, point: proj };
      }
    }

    return closest;
  };


  const mergeVertices = (keepId, removeId) => {
    if (keepId === removeId) return;
    setWalls(prev => {
      const remapped = prev.map(w => ({
        startId: w.startId === removeId ? keepId : w.startId,
        endId: w.endId === removeId ? keepId : w.endId,
        ...w
      }));
      const seen = new Set();
      return remapped.filter(w => {
        if (w.startId === w.endId) return false;
        const key = [w.startId, w.endId].sort().join('-');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    });
    setVertices(prev => prev.filter(v => v.id !== removeId));
  };

  const splitWallAtPoint = (wall, point) => {
    const newV = { id: Date.now() + Math.random(), x: point.x, y: point.y };
    setVertices(p => [...p, newV]);
    setWalls(p => {
      const others = p.filter(w => w !== wall);
      return [
        ...others,
        { startId: wall.startId, endId: newV.id, thickness: wall.thickness, height: wall.height, name: wall.name },
        { startId: newV.id, endId: wall.endId, thickness: wall.thickness, height: wall.height, name: wall.name }
      ];
    });
    return newV;
  };

  useEffect(() => {
    if (mode !== null) setSelectedWall(null);
    const onKey = e => {
      if (e.key === 'Escape') {
        if (mode === 'wall') {
          if (lastCreatedVertexId) {
            const inUse = walls.some(w => w.startId === lastCreatedVertexId || w.endId === lastCreatedVertexId);
            if (!inUse) setVertices(v => v.filter(vx => vx.id !== lastCreatedVertexId));
            setLastCreatedVertexId(null);
          }
          setTempStartPoint(null);
          setHoverPoint(null);
        }
        setHoverVertex(null);
        setMouseDownVertex(null);
        setDraggedWallPreview(null);
        setDragPreviewVertex(null);
        setSnapTarget(null);
        setSelectedWall(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, walls, lastCreatedVertexId]);

  const handleMouseDown = e => {
    const { x, y } = toWorldCoords(e.evt.layerX, e.evt.layerY);
    setMouseDownTime(Date.now());
    const hit = vertices.find(v => Math.hypot(v.x - x, v.y - y) < 10);
    if (hit) setMouseDownVertex(hit);
    if (!hit && mode === null) {
      const snap = findSnapTarget({ x, y });
      if (snap?.type === 'wall') setSelectedWall(snap.wall);
      else setSelectedWall(null);
    }
  };

  const handleMouseMove = e => {
    const { x, y } = toWorldCoords(e.evt.layerX, e.evt.layerY);
    setRawMousePoint({ x, y });
    const snap = findSnapTarget({ x, y });
    setSnapTarget(snap);
    const target = snap?.point || { x, y };

    if (mouseDownVertex) {
      const updated = { ...mouseDownVertex, ...target };
      setDragPreviewVertex(updated);
      const connected = walls.filter(w => w.startId === mouseDownVertex.id || w.endId === mouseDownVertex.id);
      const previews = connected.map(w => {
        const otherId = w.startId === mouseDownVertex.id ? w.endId : w.startId;
        const other = getEffectiveVertex(otherId);
        return other ? { v1: updated, v2: other } : null;
      }).filter(Boolean);
      setDraggedWallPreview(previews);
    }

    if (snap?.type === 'vertex') {
      setHoverVertex(snap.point);
      setHoverPoint(snap.point);
    } else if (snap?.type === 'wall') {
      setHoverVertex(null);
      setHoverPoint(tempStartPoint ? snap.point : null);
    } else {
      setHoverVertex(null);
      setHoverPoint(tempStartPoint ? target : null);
    }

    if (mode === null && snap?.type === 'wall') setHoverWallId(snap.wall.startId + '-' + snap.wall.endId);
    else setHoverWallId(null);
  };

  const handleMouseUp = e => {
    setDraggedWallPreview(null);
    const { x, y } = toWorldCoords(e.evt.layerX, e.evt.layerY);
    const held = Date.now() - mouseDownTime;
    const target = snapTarget?.point || { x, y };

    if (mouseDownVertex && held >= CLICK_THRESHOLD) {
      if (snapTarget?.type === 'vertex' && snapTarget.point.id !== mouseDownVertex.id) {
        mergeVertices(snapTarget.point.id, mouseDownVertex.id);
      } else if (snapTarget?.type === 'wall') {
        const newV = splitWallAtPoint(snapTarget.wall, snapTarget.point);
        mergeVertices(newV.id, mouseDownVertex.id);
      } else {
        setVertices(p => p.map(v => v.id === mouseDownVertex.id ? { ...v, ...target } : v));
      }
      setMouseDownVertex(null);
      setDragPreviewVertex(null);
      return;
    }

    if (e.evt.button === 0 && mode === 'wall' && held < CLICK_THRESHOLD) {
      const snap = findSnapTarget({ x, y });
      let startV;
      if (snap) {
        startV = snap.type === 'vertex' ? snap.point : splitWallAtPoint(snap.wall, snap.point);
      } else {
        startV = { id: Date.now() + Math.random(), x, y };
        setVertices(p => [...p, startV]);
      }

      if (!tempStartPoint) {
        setTempStartPoint(startV);
        setLastCreatedVertexId(startV.id);
      } else {
        const exists = walls.some(w => (w.startId === tempStartPoint.id && w.endId === startV.id) || (w.endId === tempStartPoint.id && w.startId === startV.id));
        if (!exists) {
          setWalls(p => [...p, {
            startId: tempStartPoint.id,
            endId: startV.id,
            thickness: WALL_WIDTH,
            height: 300,
            name: 'Wall'
          }]);
        }
        setTempStartPoint(startV);
        setLastCreatedVertexId(null);
      }
    }

    setMouseDownVertex(null);
    setDragPreviewVertex(null);
    if (mode === null) {
      if (snapTarget?.type === 'wall') {
        setSelectedWall(snapTarget.wall);
      } else {
        setSelectedWall(null);
      }
    }
  };
  const deleteWall = (wall) => {
    setWalls(prev => prev.filter(w => !(w.startId === wall.startId && w.endId === wall.endId)));
    setSelectedWall(null);

    const isVertexUsed = (vertexId) => walls.some(w => w.startId === vertexId || w.endId === vertexId);

    setVertices(prev => prev.filter(v => {
      if (v.id === wall.startId || v.id === wall.endId) {
        return isVertexUsed(v.id);
      }
      return true;
    }));
  };

  const renderWall = (v1, v2, key, color = "#ccc", dash = null, borderColor = "#555", thickness = WALL_WIDTH) => {
    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const centerX = (v1.x + v2.x) / 2;
    const centerY = (v1.y + v2.y) / 2;

    const wallIsSelected =
      mode === null &&
      selectedWall &&
      ((selectedWall.startId === v1.id && selectedWall.endId === v2.id) ||
        (selectedWall.endId === v1.id && selectedWall.startId === v2.id));

    return (
      <>
        <Group key={key}>
          {/* Tường */}
          <Rect
            key={key}
            x={centerX}
            y={centerY}
            width={length}
            height={thickness}
            fill={color}
            stroke={borderColor}
            strokeWidth={2}
            offsetX={length / 2}
            offsetY={thickness / 2}
            rotation={angle}
            dash={dash}
          />

          {/* 2 nút điều chỉnh thickness nếu đang chọn */}
          {wallIsSelected && [-1, 1].map((side, i) => {
            const rad = angle * Math.PI / 180;
            const offsetX = side * (thickness / 2) * Math.sin(-rad);
            const offsetY = side * (thickness / 2) * Math.cos(rad);
            const handleX = centerX + offsetX;
            const handleY = centerY + offsetY;
            return (
              <Rect
                key={`thickness-handle-${key}-${i}`}
                x={handleX}
                y={handleY}
                width={6}
                height={6}
                fill="white"
                stroke="#ccc"
                strokeWidth={1}
                offsetX={3}
                offsetY={3}
                rotation={angle}
                draggable
                onDragMove={(e) => {
                  const dx = e.target.x() - centerX;
                  const dy = e.target.y() - centerY;
                  const perp = Math.abs(dx * Math.sin(rad) + dy * Math.cos(rad));
                  const newThickness = Math.max(2, Math.min(500, perp * 2));
                  setWalls(prev =>
                    prev.map(w =>
                      (w.startId === v1.id && w.endId === v2.id) || (w.startId === v2.id && w.endId === v1.id)
                        ? { ...w, thickness: newThickness }
                        : w
                    )
                  );
                }}
              />
            );
          })}
        </Group>
      </>
    );
  };





  const gridSize = TOTAL_MAJOR_CELLS * MAJOR_GRID_SIZE;
  const gridLines = [];
  for (let i = 0; i <= TOTAL_MAJOR_CELLS * MINOR_DIVISIONS; i++) {
    const pos = i * MINOR_GRID_SIZE;
    gridLines.push(<Line key={`mn-v-${i}`} points={[pos, 0, pos, gridSize]} stroke="#f0f0f0" strokeWidth={0.4} />);
    gridLines.push(<Line key={`mn-h-${i}`} points={[0, pos, gridSize, pos]} stroke="#f0f0f0" strokeWidth={0.4} />);
  }
  for (let i = 0; i <= TOTAL_MAJOR_CELLS; i++) {
    const pos = i * MAJOR_GRID_SIZE;
    gridLines.push(<Line key={`mj-v-${i}`} points={[pos, 0, pos, gridSize]} stroke="#ffffff" strokeWidth={1} />);
    gridLines.push(<Line key={`mj-h-${i}`} points={[0, pos, gridSize, pos]} stroke="#ffffff" strokeWidth={1} />);
  }

  return (
    <Stage
      width={window.innerWidth}
      height={window.innerHeight}
      ref={stageRef}
      scaleX={scale}
      scaleY={scale}
      x={offset.x}
      y={offset.y}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <Layer>
        {gridLines}
        {walls.map((w, i) => {
          const v1 = getEffectiveVertex(w.startId);
          const v2 = getEffectiveVertex(w.endId);
          if (!v1 || !v2) return null;
          const wallId = `${w.startId}-${w.endId}`;
          const isHovering = hoverWallId === wallId;
          return renderWall(v1, v2, `wall-${i}`, isHovering ? "#2ea3f2" : "#ccc", null, "#555", w.thickness ?? WALL_WIDTH);
        })}
        {Array.isArray(draggedWallPreview) && draggedWallPreview.map((preview, i) => renderWall(preview.v1, preview.v2, `preview-${i}`, "#aaa", [6, 4]))}
        {vertices.map((pt, i) => {
          if (mouseDownVertex && pt.id === mouseDownVertex.id) return null;
          return <Circle key={`vertex-${i}`} x={pt.x} y={pt.y} radius={hoverVertex && hoverVertex.id === pt.id ? 8 : 5} fill={hoverVertex && hoverVertex.id === pt.id ? '#00f' : '#fff'} stroke="#000" strokeWidth={1} />;
        })}
        {mode === 'wall' && snapTarget?.type === 'wall' && <Circle x={snapTarget.point.x} y={snapTarget.point.y} radius={6} fill="lime" stroke="green" strokeWidth={2} />}
        {tempStartPoint && (hoverPoint || rawMousePoint) && (() => {
          const end = hoverPoint || rawMousePoint;
          return renderWall(tempStartPoint, end, 'wall-temp', "#ddd", [6, 4]);
        })()}
      </Layer>
    </Stage>
  );
};

export default CanvasGridKonva;