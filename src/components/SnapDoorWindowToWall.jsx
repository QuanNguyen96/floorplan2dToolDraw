import React, { useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';


const WALL_WIDTH = 10;
const SNAP_DISTANCE = 50;
const SnapDoorWindowToWall = ({ stageRef }) => {
  const { mode, walls, vertices, addDoor } = useEditor();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [snapInfo, setSnapInfo] = useState(null);
  const getVertexById = id => vertices.find(v => v.id === id);
  const DOOR_CONFIG = {
    width: 72,
    height: 10,
    offsetX: 0, // không cần nữa
    offsetY: 0,
    // pivot cũng tính từ dưới lên
    pivot: { x: 72, y: 80 }, // gốc phải dưới
    renderSVG: () => (
      <svg
        width="80"
        height="80"
        viewBox="0 0 80 80"
        fill="none"
        stroke="black"
        strokeWidth="2"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="0"
          y="70"
          width="72"
          height="10"
          stroke="red"
          strokeWidth="1"
          fill="none"
          strokeDasharray="4 2"
        />
        <path d="M1 71L1 79L72 79V71M1 71L72 71M1 71C1 32.3401 32.3401 1 71 1H72V71" />
      </svg>
    ),
  };

  function getSnapToWall2(mouse, walls, vertices, threshold = 30) {
    let bestSnap = null;
    let minDist = Infinity;

    for (const wall of walls) {
      const v1 = vertices.find(v => v.id === wall.startId);
      const v2 = vertices.find(v => v.id === wall.endId);
      if (!v1 || !v2) continue;

      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;

      const t = Math.max(0, Math.min(1, ((mouse.x - v1.x) * dx + (mouse.y - v1.y) * dy) / len2));
      const projX = v1.x + t * dx;
      const projY = v1.y + t * dy;

      const dist = Math.hypot(mouse.x - projX, mouse.y - projY);
      const thickness = wall.thickness ?? 10;
      const snapRange = thickness / 2 + threshold;

      if (dist > snapRange || dist >= minDist) continue;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * 180 / Math.PI;

      // Lấy center của box cửa
      const boxCenterX = DOOR_CONFIG.offsetX + DOOR_CONFIG.width / 2;
      const boxCenterY = DOOR_CONFIG.offsetY + DOOR_CONFIG.height / 2;

      // Xoay offset
      const rotatedOffsetX = boxCenterX * Math.cos(angleRad) - boxCenterY * Math.sin(angleRad);
      const rotatedOffsetY = boxCenterX * Math.sin(angleRad) + boxCenterY * Math.cos(angleRad);

      bestSnap = {
        snapped: true,
        x: projX - rotatedOffsetX,
        y: projY - rotatedOffsetY,
        angle: angleDeg,
        wallId: wall.id || `${wall.startId}-${wall.endId}`,
        wall,
        snapPoint: { x: projX, y: projY }, // Dùng để vẽ vòng tròn
      };

      minDist = dist;
    }

    return bestSnap;
  }
  function getSnapToWall(mouse, walls, vertices, threshold = 30) {
    const DOOR_CONFIG = {
      width: 72,
      height: 10,
      offsetX: 0,
      offsetY: 71,
    };

    const boxCenterLocal = {
      x: DOOR_CONFIG.offsetX + DOOR_CONFIG.width / 2,
      y: DOOR_CONFIG.offsetY + DOOR_CONFIG.height / 2,
    };

    let bestSnap = null;
    let minDist = Infinity;

    for (const wall of walls) {
      const v1 = vertices.find(v => v.id === wall.startId);
      const v2 = vertices.find(v => v.id === wall.endId);
      if (!v1 || !v2) continue;

      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * 180 / Math.PI;

      // Dịch chuột thành vị trí center của cửa
      const rotatedOffsetX = boxCenterLocal.x * Math.cos(angleRad) - boxCenterLocal.y * Math.sin(angleRad);
      const rotatedOffsetY = boxCenterLocal.x * Math.sin(angleRad) + boxCenterLocal.y * Math.cos(angleRad);

      const doorCenter = {
        x: mouse.x + rotatedOffsetX,
        y: mouse.y + rotatedOffsetY,
      };

      // Chiếu vuông góc cửa lên đoạn tường
      const t = Math.max(0, Math.min(1, ((doorCenter.x - v1.x) * dx + (doorCenter.y - v1.y) * dy) / len2));
      const projX = v1.x + t * dx;
      const projY = v1.y + t * dy;

      const dist = Math.hypot(doorCenter.x - projX, doorCenter.y - projY);
      const thickness = wall.thickness ?? 10;
      const snapRange = thickness / 2 + threshold;

      if (dist > snapRange || dist >= minDist) continue;

      bestSnap = {
        snapped: true,
        x: projX - rotatedOffsetX,
        y: projY - rotatedOffsetY,
        angle: angleDeg,
        wallId: wall.id || `${wall.startId}-${wall.endId}`,
        wall,
        snapPoint: { x: projX, y: projY }, // dùng để vẽ chấm xanh
      };

      minDist = dist;
    }

    return bestSnap;
  }
  function getSnapToWall3(point, walls, vertices, threshold = 30) {
    let closest = null;
    let minDist = Infinity;

    const boxCenter = {
      x: DOOR_CONFIG.offsetX + DOOR_CONFIG.width / 2,
      y: DOOR_CONFIG.offsetY + DOOR_CONFIG.height / 2,
    };

    for (const wall of walls) {
      const v1 = vertices.find(v => v.id === wall.startId);
      const v2 = vertices.find(v => v.id === wall.endId);
      if (!v1 || !v2) continue;

      const dx = v2.x - v1.x;
      const dy = v2.y - v1.y;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;

      const angleRad = Math.atan2(dy, dx);
      const angleDeg = angleRad * 180 / Math.PI;

      // Tính vị trí center sau khi xoay offset
      const rotatedOffsetX = boxCenter.x * Math.cos(angleRad) - boxCenter.y * Math.sin(angleRad);
      const rotatedOffsetY = boxCenter.x * Math.sin(angleRad) + boxCenter.y * Math.cos(angleRad);

      const doorCenter = {
        x: point.x + rotatedOffsetX,
        y: point.y + rotatedOffsetY,
      };

      // Chiếu lên đoạn tường
      const t = Math.max(0, Math.min(1, ((doorCenter.x - v1.x) * dx + (doorCenter.y - v1.y) * dy) / len2));
      const proj = { x: v1.x + t * dx, y: v1.y + t * dy };
      const dist = Math.hypot(doorCenter.x - proj.x, doorCenter.y - proj.y);

      const thickness = wall.thickness ?? WALL_WIDTH;
      const snapRange = thickness / 2 + threshold;

      if (dist <= snapRange && dist < minDist) {
        minDist = dist;

        closest = {
          snapped: true,
          x: proj.x - rotatedOffsetX,     // Vị trí gắn cửa (góc trái dưới)
          y: proj.y - rotatedOffsetY,
          angle: angleDeg,
          wall,
          wallId: wall.id || `${wall.startId}-${wall.endId}`,
          snapPoint: proj,                // vị trí chính giữa tường để vẽ chấm xanh
        };
      }
    }

    return closest;
  }



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

  function getDoorTransformFromSnap(snapInfo) {
    if (!snapInfo || !snapInfo.wall || !snapInfo.point) return null;

    const { wall, point } = snapInfo;

    const v1 = vertices.find(v => v.id === wall.startId);
    const v2 = vertices.find(v => v.id === wall.endId);
    if (!v1 || !v2) return null;

    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = angleRad * 180 / Math.PI;

    const boxCenter = {
      x: DOOR_CONFIG.offsetX + DOOR_CONFIG.width / 2,
      y: DOOR_CONFIG.offsetY + DOOR_CONFIG.height / 2,
    };

    // Tính lại offset cần dịch từ center → pivot
    const rotatedOffsetX = boxCenter.x * Math.cos(angleRad) - boxCenter.y * Math.sin(angleRad);
    const rotatedOffsetY = boxCenter.x * Math.sin(angleRad) + boxCenter.y * Math.cos(angleRad);

    return {
      x: point.x - rotatedOffsetX, // điểm đặt cửa (góc dưới trái)
      y: point.y - rotatedOffsetY,
      angle: angleDeg,
    };
  }
  useEffect(() => {
    // const handleMove = (e) => {
    //   const x = e.clientX;
    //   const y = e.clientY;
    //   setMousePos({ x, y });
    //   const { x: x1, y: y1 } = toWorldCoords(e.evt.layerX, e.evt.layerY);
    //   const snap2 = findSnapTarget({ x: x1, y: y1 });
    //   console.log("snap2=", snap2)

    //   if (mode === 'door') {
    //     const snap = getSnapToWall({ x, y }, walls, vertices, 30);
    //     setSnapInfo(snap);
    //   }
    // };
    // const handleMove = () => {
    //   if (!stageRef?.current) return;

    //   const pointer = stageRef.current.getPointerPosition();
    //   if (!pointer) return;

    //   const { x, y } = toWorldCoords(pointer.x, pointer.y);
    //   // setSnapInfo({ x, y });

    //   const snap2 = findSnapTarget({ x, y });
    //   console.log("snap2 =", snap2);
    //   // Nếu snap vào tường → dùng vị trí đó

    //   if (snap2?.type === 'wall') {
    //     setSnapInfo({
    //       snapped: true,
    //       snapPoint: snap2.point,
    //       wall: snap2.wall,
    //     });
    //   } else {
    //     setSnapInfo({ snapped: false, x, y });
    //   }

    //   // if (mode === 'door') {
    //   //   const snap = getSnapToWall({ x, y }, walls, vertices, 30);
    //   //   setSnapInfo(snap);
    //   // }
    // };
    const handleMove = () => {
      if (!stageRef?.current) return;

      const pointer = stageRef.current.getPointerPosition();
      if (!pointer) return;

      const { x, y } = toWorldCoords(pointer.x, pointer.y); // 🎯 chuyển về tọa độ world
      const snap = findSnapTarget({ x, y }); // ✅ dùng đúng

      if (snap?.type === 'wall') {
        setSnapInfo({
          snapped: true,
          snapPoint: snap.point,
          wall: snap.wall,
        });
      } else {
        setSnapInfo({ snapped: false, x, y });
      }
      // const snap2 = getSnapToWall3({ x, y }, walls, vertices, 30);
      // console.log("snap2", snap2)
      // if (snap2?.type === 'wall') {
      //   setSnapInfo({
      //     snapped: true,
      //     snapPoint: snap2.point,
      //     wall: snap2.wall,
      //   });
      // } else {
      //   setSnapInfo({ snapped: false, x, y });
      // }

      // if (mode === 'door') {
      //   const snap = getSnapToWall({ x, y }, walls, vertices, 30);
      //   setSnapInfo(snap);
      // }
    };

    const handleClick = () => {
      if (mode !== 'door') return;
      if (snapInfo?.snapped) {
        addDoor({
          id: Date.now().toString(),
          x: snapInfo.x,
          y: snapInfo.y,
          angle: snapInfo.angle,
          wallId: snapInfo.wallId,
        });
      }
    };
    console.log("watch snapInfo", snapInfo)
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('click', handleClick);
    };

  }, [mode, walls, vertices, snapInfo]);

  if (mode !== 'door') return null;

  const pos = snapInfo || { x: mousePos.x, y: mousePos.y, angle: 0 };
  const toScreenCoords = (x, y) => {
    const stage = stageRef.current;
    const stageBox = stage.container().getBoundingClientRect(); // DOM vị trí stage
    const transform = stage.getAbsoluteTransform().copy();

    const { x: absX, y: absY } = transform.point({ x, y });

    return {
      x: stageBox.left + absX,
      y: stageBox.top + absY
    };
  };
  return (
    <>
      {/* Cửa preview */}
      {(() => {
        const screenPos = toScreenCoords(pos.x, pos.y); // ✅ chuyển sang screen coords
        return (
          <div
            style={{
              position: 'fixed',
              left: screenPos.x,
              top: screenPos.y,
              pointerEvents: 'none',
              opacity: snapInfo ? 0.9 : 0.3,
              zIndex: 9999,
              transform: `translate(-${DOOR_CONFIG.pivot.x}px, -${DOOR_CONFIG.pivot.y}px) rotate(${pos.angle}deg)`,
              transformOrigin: `${DOOR_CONFIG.pivot.x}px ${DOOR_CONFIG.pivot.y}px`,
            }}
          >
            {DOOR_CONFIG.renderSVG()}
          </div>
        );
      })()}
      {/* Chấm xanh preview snap */}
      {snapInfo?.snapped && snapInfo.snapPoint && (
        (() => {
          const screen = toScreenCoords(snapInfo.snapPoint.x, snapInfo.snapPoint.y);
          return (
            <div
              style={{
                position: 'fixed',
                left: screen.x - 5,
                top: screen.y - 5,
                width: 10,
                height: 10,
                backgroundColor: 'limegreen',
                borderRadius: '50%',
                zIndex: 9999,
                pointerEvents: 'none',
              }}
            />
          );
        })()
      )}
    </>
  );
};

export default SnapDoorWindowToWall;
