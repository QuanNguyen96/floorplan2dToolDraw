import React, { useState, useEffect } from "react";
import { useEditor } from "../context/EditorContext";
import { validate } from "uuid";

const WALL_WIDTH = 10;
const SNAP_DISTANCE = 50;
const SnapDoorWindowToWall = ({ stageRef }) => {
  const { mode, walls, vertices, doors, setDoors } = useEditor();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [snapInfo, setSnapInfo] = useState(null);
  const getVertexById = (id) => vertices.find((v) => v.id === id);
  const DOOR_CONFIG = {
    width: 70,
    height: 10,
    // pivot cũng tính từ dưới lên
    pivot: { x: 35, y: 6 }, // gốc phải dưới
    renderSVG: (color = "black") => (
      <svg
        width="70"
        height="12"
        viewBox="0 0 70 12"
        fill="none"
        stroke={color}
        strokeWidth="1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect
          x="0"
          y="0"
          width="70"
          height="12"
          stroke={color}
          strokeWidth="1"
          fill="none"
          strokeDasharray="4 2"
        />
        {/* <path d="M1 71L1 79L72 79V71M1 71L72 71M1 71C1 32.3401 32.3401 1 71 1H72V71" /> */}
      </svg>
    ),
  };

  const toWorldCoords = (x, y) => {
    const transform = stageRef.current.getAbsoluteTransform().copy().invert();
    return transform.point({ x, y });
  };
  const findSnapTarget = (point) => {
    // Ưu tiên snap vào vertex nếu gần
    for (const v of vertices) {
      if (
        mode === "wall" &&
        Math.hypot(v.x - point.x, v.y - point.y) <= SNAP_DISTANCE
      ) {
        return { type: "vertex", point: v };
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
      const t = Math.max(
        0,
        Math.min(1, ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / len2)
      );
      const proj = { x: v1.x + t * dx, y: v1.y + t * dy };
      const dist = Math.hypot(point.x - proj.x, point.y - proj.y);

      const thickness = wall.thickness ?? WALL_WIDTH;
      const snapRange = thickness / 2 + SNAP_DISTANCE;

      if (dist <= snapRange && dist < minDist) {
        minDist = dist;
        closest = { type: "wall", wall, point: proj };
      }
    }

    return closest;
  };
  function isRectOverlap(r1, r2) {
    return !(
      r1.x + r1.width <= r2.x ||
      r2.x + r2.width <= r1.x ||
      r1.y + r1.height <= r2.y ||
      r2.y + r2.height <= r1.y
    );
  }
  function isPolygonOverlap(polyA, polyB) {
    const polys = [polyA, polyB];

    for (let i = 0; i < polys.length; i++) {
      const polygon = polys[i];

      for (let i1 = 0; i1 < polygon.length; i1++) {
        const i2 = (i1 + 1) % polygon.length;
        const p1 = polygon[i1];
        const p2 = polygon[i2];

        const normal = {
          x: p2.y - p1.y,
          y: p1.x - p2.x,
        };

        let minA = null;
        let maxA = null;
        for (const p of polyA) {
          const projected = p.x * normal.x + p.y * normal.y;
          if (minA === null || projected < minA) minA = projected;
          if (maxA === null || projected > maxA) maxA = projected;
        }

        let minB = null;
        let maxB = null;
        for (const p of polyB) {
          const projected = p.x * normal.x + p.y * normal.y;
          if (minB === null || projected < minB) minB = projected;
          if (maxB === null || projected > maxB) maxB = projected;
        }

        if (maxA < minB || maxB < minA) {
          return false; // Có trục phân tách → không giao
        }
      }
    }
    return true; // Không có trục phân tách → giao nhau
  }

  function getDoorTransformFromSnap(snapInfo) {
    if (!snapInfo || !snapInfo.wall || !snapInfo.point) return { valid: false };

    const { wall, point } = snapInfo;
    const v1 = getVertexById(wall.startId);
    const v2 = getVertexById(wall.endId);
    if (!v1 || !v2) return { valid: false };

    const dx = v2.x - v1.x;
    const dy = v2.y - v1.y;
    const wallLength = Math.hypot(dx, dy);
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;

    const doorLength = DOOR_CONFIG.width;
    const wallThickness = wall.thickness ?? WALL_WIDTH;
    const doorHeight = Math.min(DOOR_CONFIG.height, wallThickness); // 👈 tự động khớp

    const offset = ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / wallLength;

    if (offset < doorLength / 2 || offset > wallLength - doorLength / 2) {
      return {
        valid: false,
        x: point.x,
        y: point.y,
        angle: angleDeg,
        doorHeight,
        doorLength,
        wall, // nếu cần sau này
        reason: "Overlapping existing door"
      };
    }
    // const halfLen = doorLength / 2;
    // const halfThick = wallThickness / 2;
    // const rect = {
    //   x: point.x - dir.x * halfLen - perp.x * halfThick,
    //   y: point.y - dir.y * halfLen - perp.y * halfThick,
    //   width: Math.abs(dir.x * doorLength + perp.x * wallThickness),
    //   height: Math.abs(dir.y * doorLength + perp.y * wallThickness),
    // };

    if (doors && doors.length) {

      const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
      const perp = { x: -dir.y, y: dir.x };
      const center = point;
      const EXPAND_MARGIN = 5; // 👈 bạn có thể chỉnh 2–5px tuỳ độ nhạy mong muốn

      const halfLen2 = doorLength / 2 + EXPAND_MARGIN;
      const halfThick2 = wallThickness / 2 + EXPAND_MARGIN;
      const outerPolygon = [
        {
          x: center.x - dir.x * halfLen2 - perp.x * halfThick2,
          y: center.y - dir.y * halfLen2 - perp.y * halfThick2,
        },
        {
          x: center.x + dir.x * halfLen2 - perp.x * halfThick2,
          y: center.y + dir.y * halfLen2 - perp.y * halfThick2,
        },
        {
          x: center.x + dir.x * halfLen2 + perp.x * halfThick2,
          y: center.y + dir.y * halfLen2 + perp.y * halfThick2,
        },
        {
          x: center.x - dir.x * halfLen2 + perp.x * halfThick2,
          y: center.y - dir.y * halfLen2 + perp.y * halfThick2,
        },
      ];
      for (const d of doors) {
        if (d.wallId !== wall.id) continue;
        if (isPolygonOverlap(outerPolygon, d.outerPolygon)) {
          console.log("da va vao nhau")
          return {
            valid: false,
            x: point.x,
            y: point.y,
            angle: angleDeg,
            doorHeight,
            doorLength,
            wall, // nếu cần sau này
            reason: "Overlapping existing door"
          };
        }
      }
    }

    // TODO: check overlapping nếu muốn

    return {
      valid: true,
      x: point.x,
      y: point.y,
      angle: angleDeg,
      doorHeight,
      doorLength,
      wall, // nếu cần sau này
    };
  }
  // function getDoorTransformFromSnap(snapInfo) {
  //   if (!snapInfo || !snapInfo.wall || !snapInfo.point) return { valid: false };

  //   const { wall, point } = snapInfo;
  //   const v1 = getVertexById(wall.startId);
  //   const v2 = getVertexById(wall.endId);
  //   if (!v1 || !v2) return { valid: false };

  //   const dx = v2.x - v1.x;
  //   const dy = v2.y - v1.y;
  //   const wallLength = Math.hypot(dx, dy);
  //   const angleRad = Math.atan2(dy, dx);
  //   const angleDeg = (angleRad * 180) / Math.PI;

  //   const doorLength = DOOR_CONFIG.width;
  //   const wallThickness = wall.thickness ?? WALL_WIDTH;
  //   const doorHeight = DOOR_CONFIG.height;

  //   const offset = ((point.x - v1.x) * dx + (point.y - v1.y) * dy) / wallLength;
  //   const margin = 10;
  //   if (offset < doorLength / 2 + margin || offset > wallLength - doorLength / 2 - margin)
  //     return { valid: false };

  //   const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
  //   const perp = { x: -dir.y, y: dir.x };

  //   const halfLen = doorLength / 2;
  //   const halfThick = wallThickness / 2;

  //   const rect = {
  //     x: point.x - dir.x * halfLen - perp.x * halfThick,
  //     y: point.y - dir.y * halfLen - perp.y * halfThick,
  //     width: Math.abs(dir.x * doorLength + perp.x * wallThickness),
  //     height: Math.abs(dir.y * doorLength + perp.y * wallThickness),
  //   };
  //   const center = point;
  //   const EXPAND_MARGIN = 5; // 👈 bạn có thể chỉnh 2–5px tuỳ độ nhạy mong muốn

  //   const halfLen2 = doorLength / 2 + EXPAND_MARGIN;
  //   const halfThick2 = wallThickness / 2 + EXPAND_MARGIN;
  //   const outerPolygon = [
  //     {
  //       x: center.x - dir.x * halfLen2 - perp.x * halfThick2,
  //       y: center.y - dir.y * halfLen2 - perp.y * halfThick2,
  //     },
  //     {
  //       x: center.x + dir.x * halfLen2 - perp.x * halfThick2,
  //       y: center.y + dir.y * halfLen2 - perp.y * halfThick2,
  //     },
  //     {
  //       x: center.x + dir.x * halfLen2 + perp.x * halfThick2,
  //       y: center.y + dir.y * halfLen2 + perp.y * halfThick2,
  //     },
  //     {
  //       x: center.x - dir.x * halfLen2 + perp.x * halfThick2,
  //       y: center.y - dir.y * halfLen2 + perp.y * halfThick2,
  //     },
  //   ];

  //   // Kiểm tra trùng với các cửa cũ
  //   console.log("doors", doors)
  //   console.log("wall", wall)
  //   for (const d of doors) {
  //     console.log(`d.wallId=${d.wallId} wall.id=${wall.id}`)
  //     if (d.wallId !== wall.id) continue;
  //     if (isPolygonOverlap(outerPolygon, d.outerPolygon)) {
  //       console.log("da va vao nhau")
  //       return { valid: false, reason: "Overlapping existing door" };

  //     } else {
  //       console.log("ko lap")
  //     }
  //   }

  //   return {
  //     valid: true,
  //     x: point.x,
  //     y: point.y,
  //     angle: angleDeg,
  //     doorHeight,
  //     doorLength,
  //     wall,
  //     rect,
  //   };
  // }


  useEffect(() => {
    const handleMove = () => {
      if (!stageRef?.current) return;

      const pointer = stageRef.current.getPointerPosition();
      if (!pointer) return;

      const { x, y } = toWorldCoords(pointer.x, pointer.y); // 🎯 chuyển về tọa độ world
      const snap = findSnapTarget({ x, y }); // ✅ dùng đúng

      if (snap?.type === "wall") {
        const transform = getDoorTransformFromSnap({
          wall: snap?.wall,
          point: snap?.point,
        });
        if (transform) {
          setSnapInfo({
            ...transform,
            snapped: true,
            valid: transform?.valid,
            wall: snap?.wall,
            wallId: snap?.wall?.id || `${snap?.wall?.startId}-${snap?.wall?.endId}`,
            snapPoint: snap?.point,
          });
        }
      } else {
        setSnapInfo({ snapped: false, x, y, angle: 0 });
      }
    };

    const handleClick = () => {
      if (mode !== "door" || !snapInfo?.snapped || !snapInfo?.valid) return;

      const doorLength = DOOR_CONFIG.width;
      const doorHeight = DOOR_CONFIG.height;
      const thickness = snapInfo.wall.thickness ?? WALL_WIDTH;
      const center = snapInfo.snapPoint;
      const angleRad = (snapInfo.angle * Math.PI) / 180;

      const dir = { x: Math.cos(angleRad), y: Math.sin(angleRad) };
      const perp = { x: -dir.y, y: dir.x };

      const halfLen = doorLength / 2;
      const halfThick = thickness / 2;
      const halfDoor = doorHeight / 2;

      const outerPolygon = [
        {
          x: center.x - dir.x * halfLen - perp.x * halfThick,
          y: center.y - dir.y * halfLen - perp.y * halfThick,
        },
        {
          x: center.x + dir.x * halfLen - perp.x * halfThick,
          y: center.y + dir.y * halfLen - perp.y * halfThick,
        },
        {
          x: center.x + dir.x * halfLen + perp.x * halfThick,
          y: center.y + dir.y * halfLen + perp.y * halfThick,
        },
        {
          x: center.x - dir.x * halfLen + perp.x * halfThick,
          y: center.y - dir.y * halfLen + perp.y * halfThick,
        },
      ];

      const innerPolygon = [
        {
          x: center.x - dir.x * halfLen - perp.x * halfDoor,
          y: center.y - dir.y * halfLen - perp.y * halfDoor,
        },
        {
          x: center.x + dir.x * halfLen - perp.x * halfDoor,
          y: center.y + dir.y * halfLen - perp.y * halfDoor,
        },
        {
          x: center.x + dir.x * halfLen + perp.x * halfDoor,
          y: center.y + dir.y * halfLen + perp.y * halfDoor,
        },
        {
          x: center.x - dir.x * halfLen + perp.x * halfDoor,
          y: center.y - dir.y * halfLen + perp.y * halfDoor,
        },
      ];

      const doorData = {
        id: Date.now().toString(),
        wallId: snapInfo.wallId,
        x: snapInfo.x,
        y: snapInfo.y,
        angle: snapInfo.angle,
        center,
        rect: {
          x: snapInfo.x,
          y: snapInfo.y,
          width: doorLength,
          height: doorHeight,
        },
        outerPolygon,
        innerPolygon,
      };
      if (snapInfo?.valid) {
        // Thêm cửa mới vào mảng cửa hiện có
        setDoors((prevDoors) => [...prevDoors, doorData]);
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("click", handleClick);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("click", handleClick);
    };
  }, [mode, walls, vertices, snapInfo]);

  if (mode !== "door") return null;

  const pos = snapInfo || { x: mousePos.x, y: mousePos.y, angle: 0 };
  const toScreenCoords = (x, y) => {
    const stage = stageRef.current;
    const stageBox = stage.container().getBoundingClientRect(); // DOM vị trí stage
    const transform = stage.getAbsoluteTransform().copy();

    const { x: absX, y: absY } = transform.point({ x, y });

    return {
      x: stageBox.left + absX,
      y: stageBox.top + absY,
    };
  };
  const renderPreviewDoor = () => {
    if (!snapInfo?.snapped || !snapInfo.snapPoint || !snapInfo.wall)
      return null;

    const screen = toScreenCoords(snapInfo.snapPoint.x, snapInfo.snapPoint.y);
    const doorLength = DOOR_CONFIG.width;
    const thickness = snapInfo.wall.thickness ?? WALL_WIDTH;

    return (
      <>
        {/* Box trắng mô phỏng tường bị cắt */}
        <div
          style={{
            position: "fixed",
            left: screen.x,
            top: screen.y,
            width: `${doorLength + 2}px`,
            height: `${thickness + 2}px`,
            backgroundColor: "#fff",
            border: `none`,
            transform: `translate(-50%, -50%) rotate(${snapInfo.angle}deg)`,
            transformOrigin: "center center",
            pointerEvents: "none",
            zIndex: 9998,
          }}
        />

        {/* SVG cửa */}
        <div
          style={{
            position: "fixed",
            left: screen.x,
            top: screen.y,
            pointerEvents: "none",
            opacity: 0.9,
            transform: `translate(-50%, -50%) rotate(${snapInfo.angle}deg)`,
            transformOrigin: "center center",
            zIndex: 9999,
          }}
        >
          {DOOR_CONFIG.renderSVG(snapInfo?.snapped && snapInfo?.valid ? "black" : "red")}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Cửa preview */}
      {!snapInfo?.snapped && (() => {
        const screenPos = toScreenCoords(pos.x, pos.y); // ✅ chuyển sang screen coords
        return (
          <div
            style={{
              position: "fixed",
              left: screenPos.x,
              top: screenPos.y,
              pointerEvents: "none",
              opacity: snapInfo ? 0.9 : 0.3,
              zIndex: 9999,
              transform: `translate(-50%, -50%) rotate(${pos.angle}deg)`,
              transformOrigin: "center center",
            }}
          >
            {DOOR_CONFIG.renderSVG(snapInfo?.snapped && snapInfo?.valid ? "black" : "red")}
          </div>
        );
      })()}
      {/* Chấm xanh preview snap */}
      {/* {snapInfo?.snapped &&
        snapInfo.snapPoint &&
        (() => {
          const screen = toScreenCoords(
            snapInfo.snapPoint.x,
            snapInfo.snapPoint.y
          );
          return (
            <div
              style={{
                position: "fixed",
                left: screen.x - 5,
                top: screen.y - 5,
                width: 10,
                height: 10,
                backgroundColor: "limegreen",
                borderRadius: "50%",
                zIndex: 9999,
                pointerEvents: "none",
              }}
            />
          );
        })()} */}
      {renderPreviewDoor()}
    </>
  );
};

export default SnapDoorWindowToWall;
