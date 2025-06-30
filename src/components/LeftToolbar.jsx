// === src/components/LeftToolbar.jsx ===
import React from 'react';
import { Button, Card } from '@blueprintjs/core';
import { useEditor } from '../context/EditorContext';
import { ReactComponent as DoorIcon } from '../assets/icons/icons8/noun-door-736133.svg';


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
        // text="Door"
        icon={<DoorIcon width={16} height={16} />}
        active={mode === 'door'}
        onClick={() => toggleMode('door')}
        fill
        style={{ marginTop: '10px' }}
      />
    </Card>
  );
};

export default LeftToolbar;
