// === src/components/CanvasGrid.jsx ===
import React, { useRef, useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';

const MAJOR_GRID_SIZE = 300;              // kích thước ô lớn (px)
const MINOR_DIVISIONS = 10;              // số ô nhỏ trong ô lớn
const MINOR_GRID_SIZE = MAJOR_GRID_SIZE / MINOR_DIVISIONS; // kích thước ô nhỏ
const TOTAL_MAJOR_CELLS = 24;             // 24 x 24 ô lớn

const INITIAL_SCALE = 1;

const CanvasGrid = () => {
  const containerRef = useRef(null);
  const { mode } = useEditor();

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });
  const [initialized, setInitialized] = useState(false);
  const [scale, setScale] = useState(INITIAL_SCALE);

  /* ----------------------------- Drag logic ----------------------------- */
  const handleMouseDown = (e) => {
    setDragging(true);
    setStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      setOffset({ x: e.clientX - start.x, y: e.clientY - start.y });
    }
  };

  const handleMouseUp = () => setDragging(false);

  /* ----------------------------- Zoom logic ----------------------------- */
  const minScale = 0.01
  const maxScale = 5
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    const newScale = Math.min(Math.max(scale + delta, minScale), maxScale);

    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = (mouseX - offset.x) / scale;
    const worldY = (mouseY - offset.y) / scale;

    setScale(newScale);
    setOffset({ x: mouseX - worldX * newScale, y: mouseY - worldY * newScale });
  };

  /* ------------------------- Initial centering -------------------------- */
  useEffect(() => {
    if (!initialized) {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setOffset({
        x: width / 2 - (TOTAL_MAJOR_CELLS * MAJOR_GRID_SIZE * INITIAL_SCALE) / 2,
        y: height / 2 - (TOTAL_MAJOR_CELLS * MAJOR_GRID_SIZE * INITIAL_SCALE) / 2,
      });
      setInitialized(true);
    }
  }, [initialized]);

  /* --------------------- Bind / unbind global events -------------------- */
  useEffect(() => {
    const canvas = containerRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [dragging, offset, scale]);

  /* --------------------------- Render grid ----------------------------- */
  const renderGrid = () => {
    const lines = [];
    const gridPixelSize = TOTAL_MAJOR_CELLS * MAJOR_GRID_SIZE;

    // ô nhỏ – nhạt hơn một chút
    for (let i = 0; i <= TOTAL_MAJOR_CELLS * MINOR_DIVISIONS; i++) {
      const pos = i * MINOR_GRID_SIZE;
      lines.push(
        <line key={`mn-v-${i}`} x1={pos} y1={0} x2={pos} y2={gridPixelSize} stroke="#ffffff" strokeWidth={1 / scale} />,
        <line key={`mn-h-${i}`} x1={0} y1={pos} x2={gridPixelSize} y2={pos} stroke="#ffffff" strokeWidth={1 / scale} />
      );
    }

    // ô lớn – trắng rõ hơn
    for (let i = 0; i <= TOTAL_MAJOR_CELLS; i++) {
      const pos = i * MAJOR_GRID_SIZE;
      lines.push(
        <line key={`mj-v-${i}`} x1={pos} y1={0} x2={pos} y2={gridPixelSize} stroke="#ffffff" strokeWidth={1.5 / scale} />,
        <line key={`mj-h-${i}`} x1={0} y1={pos} x2={gridPixelSize} y2={pos} stroke="#ffffff" strokeWidth={1.5 / scale} />
      );
    }
    return lines;
  };

  /* ----------------------------- JSX ----------------------------- */
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        backgroundColor: '#e5e5e5', // vùng canvas ngoài grid
        overflow: 'hidden',
        position: 'relative',
        cursor: dragging ? 'grabbing' : 'grab',
      }}
    >
      <svg
        width={TOTAL_MAJOR_CELLS * MAJOR_GRID_SIZE}
        height={TOTAL_MAJOR_CELLS * MAJOR_GRID_SIZE}
        style={{
          position: 'absolute',
          left: offset.x,
          top: offset.y,
          transform: `scale(${scale})`,
          transformOrigin: '0 0',
        }}
      >
        {renderGrid()}
        {/* Các đối tượng (tường, cửa) sẽ thêm dưới đây */}
      </svg>
    </div>
  );
};

export default CanvasGrid;