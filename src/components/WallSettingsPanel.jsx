import React, { useState, useEffect } from 'react';
import { useEditor } from '../context/EditorContext';

const WallSettingsPanel = () => {
  const { selectedWall, setSelectedWall, setWalls, walls, vertices, setVertices } = useEditor();
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (selectedWall) {
      const v1 = vertices.find(v => v.id === selectedWall.startId);
      const v2 = vertices.find(v => v.id === selectedWall.endId);
      const length = v1 && v2 ? Math.hypot(v2.x - v1.x, v2.y - v1.y).toFixed(2) : "0";

      setFormData({
        name: selectedWall.name || "Wall",
        thickness: isNaN(Number(selectedWall.thickness)) ? 10 : Number(selectedWall.thickness),
        height: isNaN(Number(selectedWall.height)) ? 300 : Number(selectedWall.height),
        length,
      });
    } else {
      setFormData(null);
    }
  }, [selectedWall, vertices]);

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'thickness' || field === 'height' ? parseFloat(value) : value,
    }));
  };

  const handleBlur = () => {
    if (!selectedWall) return;
    setWalls(prev =>
      prev.map(w =>
        w.startId === selectedWall.startId && w.endId === selectedWall.endId
          ? { ...w, ...formData }
          : w
      )
    );
  };

  const handleDelete = () => {
    if (!selectedWall) return;

    setWalls(prev => prev.filter(
      w => !(w.startId === selectedWall.startId && w.endId === selectedWall.endId)
    ));

    const isUsed = (vertexId) =>
      walls.some(w =>
        (w.startId !== selectedWall.startId || w.endId !== selectedWall.endId) &&
        (w.startId === vertexId || w.endId === vertexId)
      );

    setVertices(prev => prev.filter(v =>
      !(v.id === selectedWall.startId && !isUsed(v.id)) &&
      !(v.id === selectedWall.endId && !isUsed(v.id))
    ));

    setSelectedWall(null);
    setFormData(null);
  };

  if (!formData) return null;

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      right: 0,
      width: 300,
      height: '100%',
      background: '#f9f9f9',
      borderLeft: '1px solid #ccc',
      padding: 16,
      boxSizing: 'border-box'
    }}>
      <h3>🧱 Wall Settings</h3>

      <div style={{ marginBottom: 12 }}>
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={e => handleChange('name', e.target.value)}
          onBlur={handleBlur}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Thickness</label>
        <input
          type="number"
          value={formData.thickness ?? 10}
          onChange={e => handleChange('thickness', e.target.value)}
          onBlur={handleBlur}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Height</label>
        <input
          type="number"
          value={formData.height ?? 300}
          onChange={e => handleChange('height', e.target.value)}
          onBlur={handleBlur}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Length</label>
        <input
          type="text"
          value={formData.length}
          disabled
          style={{ width: '100%', background: '#eee' }}
        />
      </div>

      <button
        onClick={handleDelete}
        style={{
          marginTop: 16,
          width: '100%',
          padding: 8,
          backgroundColor: '#ff4d4f',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer'
        }}
      >
        🗑️ Delete Wall
      </button>
    </div>
  );
};

export default WallSettingsPanel;
