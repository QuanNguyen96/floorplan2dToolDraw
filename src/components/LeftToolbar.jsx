// === src/components/LeftToolbar.jsx ===
import React from 'react';
import { Button, Card } from '@blueprintjs/core';
import { useEditor } from '../context/EditorContext';

const LeftToolbar = () => {
  const { mode, setMode } = useEditor();

  const toggleMode = (selectedMode) => {
    setMode(mode === selectedMode ? null : selectedMode);
  };

  return (
    <Card style={{ width: '100px', padding: '10px' }}>
      <Button
        text="Wall"
        active={mode === 'wall'}
        onClick={() => toggleMode('wall')}
        fill
      />
      <Button
        text="Door"
        active={mode === 'door'}
        onClick={() => toggleMode('door')}
        fill
        style={{ marginTop: '10px' }}
      />
    </Card>
  );
};

export default LeftToolbar;
