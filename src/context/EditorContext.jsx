import React, { createContext, useContext, useState } from 'react';

const EditorContext = createContext();

export const EditorProvider = ({ children }) => {
  const [mode, setMode] = useState(null); // wall | door | null
  const [walls, setWalls] = useState([]);
  const [doors, setDoors] = useState([]);
  const [selectedWall, setSelectedWall] = useState(null); // 👈 THÊM DÒNG NÀY
  const [vertices, setVertices] = useState([]); // ✅ Thêm dòng này

  return (
    <EditorContext.Provider
      value={{
        mode,
        setMode,
        walls,
        setWalls,
        doors,
        setDoors,
        selectedWall,      // 👈 THÊM DÒNG NÀY
        setSelectedWall,    // 👈 THÊM DÒNG NÀY
        vertices, setVertices,  // ✅ Thêm dòng này
      }}
    >
      {children}
    </EditorContext.Provider>
  );
};

export const useEditor = () => useContext(EditorContext);
